import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import {
  formatFoodConstraintsForReview,
  normalizeFoodConstraints,
} from "@/lib/mealflo-food-constraints";
import {
  fixtureReceiptText,
  ingredientSourceTypes,
  mealCategories,
  parseReceiptInventoryDraft,
  suggestPerishability,
} from "@/lib/inventory";
import { buildSeedDataset, seedMetadata } from "@/server/mealflo/seed-data";
import { db, getDb } from "@/server/db/client";
import { geocodeDemoVictoriaAddress } from "@/server/mealflo/demo-geocoding";
import {
  clients,
  deliverableMeals,
  deliveryRequests,
  depots,
  driverSessions,
  ingredientItems,
  intakeDrafts,
  intakeMessages,
  routeStopMealItems,
  routeStops,
  routes,
  vehicles,
  volunteerAvailability,
  volunteers,
} from "@/server/db/schema";
import {
  parseIncomingIntake,
  parsedRequestPayloadSchema,
  parsedVolunteerPayloadSchema,
  summarizeRequestPayload,
  summarizeVolunteerPayload,
  type ParsedIntakeDraft,
} from "@/server/mealflo/intake-parser";
import {
  calculateRouteDriveMinutes,
  generateRoutePlans,
  type GeneratedRoutePlan,
  type PlannerRequest,
} from "@/server/mealflo/routing";
import {
  PUBLIC_ROUTE_MAX_TOTAL_MINUTES,
  generateUnroutedPublicTodayRoutePlans,
  selectUnroutedPublicTodayRequests,
  type PublicScopedPlannerRequest,
} from "@/server/mealflo/public-routing";
import {
  resolveStreetRoute,
  type ResolvedRoute,
  type RouteCoordinate,
  type RouteSegmentDirections,
} from "@/server/mealflo/route-engine";

const VANCOUVER_TZ = "America/Vancouver";
const ANCHOR_STALE_AFTER_MS = 90_000;
const PUBLIC_FORM_PARSING_VERSION = "public-form-parsing-v1";

function publicFormRecordSuffix(now: Date) {
  return `${now.getTime()}-${randomUUID().slice(0, 8)}`;
}

type Tone = "primary" | "success" | "warning" | "info";
type LiveMarkerIcon =
  | "delivery-van"
  | "grocery-bag"
  | "location-pin"
  | "meal-container";
type NewIntakeMessage = typeof intakeMessages.$inferInsert;

export type DashboardKpi = {
  icon: string;
  id: string;
  label: string;
  note: string;
  tone: "info" | "success" | "warning" | "neutral";
  value: string;
};

export type RouteSummaryCard = {
  area: string;
  delivered: number;
  driver: string;
  eta: string;
  id: string;
  latitude: number;
  longitude: number;
  name: string;
  remaining: number;
  status: "attention" | "on-track" | "ready";
  stops: number;
  utilization: string;
};

export type LiveMarker = {
  description?: string;
  icon?: LiveMarkerIcon;
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: Tone;
};

export type StopTableRow = {
  address: string;
  id: string;
  items: string;
  name: string;
  status: "Delivered" | "Next" | "Now" | "Planned";
  warnings: string[];
};

export type DriverRouteStop = {
  accessSummary: string;
  address: string;
  etaLabel: string;
  id: string;
  items: Array<{
    allergenFlags: string[];
    dietaryTags: string[];
    name: string;
    quantity: number;
    refrigerated: boolean;
  }>;
  latitude: number;
  longitude: number;
  mealSummary: string;
  name: string;
  originalMessageExcerpt: string | null;
  phone: string | null;
  status: string;
  warnings: string[];
};

export type DriverRouteDirection = {
  distance: string;
  distanceMeters: number;
  duration: string;
  instruction: string;
  sequence: number;
  segmentIndex: number;
};

export type DriverRouteOption = {
  area: string;
  coldChainNote: string;
  deliveredCount: number;
  depot: {
    latitude: number;
    longitude: number;
    name: string;
  } | null;
  driveTime: string;
  eta: string;
  firstStop: string;
  id: string;
  name: string;
  plannedDriveMinutes: number;
  plannedTotalMinutes: number;
  remainingCount: number;
  routeDirections: DriverRouteDirection[];
  routeFallbackReason: string | null;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routingProvider: ResolvedRoute["provider"];
  stopCount: number;
  stops: DriverRouteStop[];
  totalPlannedTime: string;
  utilization: string;
  vehicle: {
    name: string;
    refrigerated: boolean;
    wheelchairLift: boolean;
  };
  volunteer: {
    id: string;
    name: string;
    phone: string | null;
  };
  warnings: string[];
};

export type TriageBucket = "today" | "tomorrow" | "later";

export type TriageRequestCard = {
  address: string;
  bucket: TriageBucket;
  clientName: string;
  dietaryTags: string[];
  householdSize: number;
  id: string;
  latitude: number;
  longitude: number;
  mealCount: number;
  routeName: string | null;
  safetyNotes: string[];
  status: "approved" | "assigned" | "delivered" | "held" | "out_for_delivery";
  statusLabel: string;
  urgency: string;
};

export type DriverCapacityCard = {
  availability: string;
  id: string;
  name: string;
  startArea: string;
  tags: string[];
  vehicle: string;
  window: string;
};

export type RoutePlanCard = {
  driver: string;
  driveTime: string;
  eta: string;
  id: string;
  name: string;
  plannedTotalMinutes: number;
  reason: string;
  serviceBucket: TriageBucket;
  status: RouteSummaryCard["status"];
  stopCount: number;
  totalPlannedTime: string;
  utilization: string;
  vehicle: string;
  warnings: string[];
};

export type RouteGenerationSummary = {
  excludedRequests: Array<{
    clientName: string;
    reason: string;
    requestId: string;
  }>;
  routeCount: number;
  routeIds?: string[];
  routeNames: string[];
  stopCount: number;
  unroutedPublicToday?: UnroutedPublicTodaySummary;
};

export type UnroutedPublicTodayStop = {
  address: string;
  approvedAtLabel: string;
  clientName: string;
  id: string;
  mealCount: number;
  urgency: string;
};

export type UnroutedPublicTodaySummary = {
  count: number;
  mealCount: number;
  stops: UnroutedPublicTodayStop[];
};

export type PublicRoutePreviewStop = {
  accessSummary: string;
  address: string;
  etaLabel: string;
  id: string;
  latitude: number;
  longitude: number;
  mealSummary: string;
  name: string;
};

export type PublicRouteDriverOption = {
  id: string;
  label: string;
  note: string;
};

export type PublicRoutePreviewPlan = {
  area: string;
  depot: {
    latitude: number;
    longitude: number;
    name: string;
  } | null;
  driveTime: string;
  driver: {
    id: string;
    name: string;
  };
  id: string;
  index: number;
  name: string;
  plannedDriveMinutes: number;
  plannedStopMinutes: number;
  plannedTotalMinutes: number;
  routeFallbackReason: string | null;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routingProvider: ResolvedRoute["provider"];
  stopCount: number;
  stops: PublicRoutePreviewStop[];
  totalPlannedTime: string;
  vehicle: {
    id: string;
    name: string;
  };
  warnings: string[];
};

export type PublicRoutePreview = {
  batchId: string;
  driverOptions: PublicRouteDriverOption[];
  excludedRequests: Array<{
    clientName: string;
    reason: string;
    requestId: string;
  }>;
  maxRouteMinutes: number;
  plans: PublicRoutePreviewPlan[];
  splitCount: number;
  stopCount: number;
  unrouted: UnroutedPublicTodaySummary;
};

export type InboxQueueItem = {
  address: string;
  channel: "form" | "gmail";
  draftType: "other" | "request" | "volunteer";
  id: string;
  isParsing: boolean;
  sender: string;
  snippet: string;
  subject: string;
};

export type AdminDirectoryRow = {
  availabilityDays?: string;
  availabilityDuration?: string;
  availabilityWindow?: string;
  id: string;
  location: string;
  measure: string;
  name: string;
  notes: string;
  role: "client" | "driver";
  status: string;
};

export type AdminDashboardData = {
  attentionNotes: string[];
  dashboardKpis: DashboardKpi[];
  inventoryMeals: Array<{
    category: string;
    name: string;
    quantity: string;
    tags: string[];
  }>;
  liveMarkers: LiveMarker[];
  requestBuckets: Record<TriageBucket, TriageRequestCard[]>;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routeSummaries: RouteSummaryCard[];
};

export type AdminInboxData = {
  directoryRows: AdminDirectoryRow[];
  inboxItems: InboxQueueItem[];
  selectedItem: {
    accessNotes: string;
    address: string;
    contact: string;
    contactEmail: string;
    contactPhone: string;
    draftId: string | null;
    draftType: "other" | "request" | "volunteer";
    dietaryFlags: string;
    householdSize: string;
    needBy: string;
    rawParagraphs: string[];
    receivedLabel: string;
    sender: string;
    sourceChannel: "form" | "gmail";
    structuredPayload: Record<string, unknown>;
    subject: string;
    summary: string;
    volunteerAvailability: string;
    volunteerStartArea: string;
    isParsing: boolean;
  };
};

export type AdminRoutesData = {
  driverCapacity: DriverCapacityCard[];
  heldBackReasons: string[];
  liveMarkers: LiveMarker[];
  requestBuckets: Record<TriageBucket, TriageRequestCard[]>;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routeOptions: DriverRouteOption[];
  routePlans: RoutePlanCard[];
  routeSummaries: RouteSummaryCard[];
  unroutedPublicToday: UnroutedPublicTodaySummary;
  selectedRoute: {
    eta: string;
    id: string;
    name: string;
    stops: number;
    utilization: string;
  };
  stopRows: StopTableRow[];
};

export type AdminLiveData = {
  events: Array<{
    event: string;
    owner: string;
    route: string;
    time: string;
  }>;
  liveMarkers: LiveMarker[];
  routeLine: ReadonlyArray<readonly [number, number]>;
  routeSummaries: RouteSummaryCard[];
};

export type AdminInventoryData = {
  ingredientSourceNote: string;
  inventoryKpis: Array<{
    icon: string;
    id: string;
    label: string;
    note: string;
    tone: "info" | "success" | "warning" | "warm";
    value: string;
  }>;
  ingredients: Array<{
    id: string;
    name: string;
    notes: string | null;
    perishability: string;
    perishabilityScore: number;
    quantity: string;
    refrigerated: boolean;
    source: string;
    suggestionConfidence: string;
  }>;
  meals: Array<{
    allergenFlags: string[];
    category: string;
    dietaryTags: string[];
    id: string;
    name: string;
    quantityAvailable: number;
    quantity: string;
    refrigerated: boolean;
    sourceNote: string | null;
    status: "low" | "ready";
    tags: string[];
  }>;
  parserFixtureText: string;
  shortageNotes: Array<{
    clientName: string;
    reason: string;
    requestId: string;
  }>;
};

export type DriverOfferData = {
  availabilityOptions: number[];
  liveMarkers: LiveMarker[];
  personas: Array<{
    id: string;
    label: string;
    note: string;
  }>;
  routeOptions: DriverRouteOption[];
  routeLine: ReadonlyArray<readonly [number, number]>;
  stops: StopTableRow[];
  suggestedRoute: {
    coldChainNote: string;
    driveTime: string;
    firstStop: string;
    name: string;
    plannedTotalMinutes: number;
    routeId: string;
    subtitle: string;
    totalPlannedTime: string;
    vehicle: string;
  };
};

export type DriverActiveData = {
  currentStop: {
    address: string;
    id: string | null;
    items: string;
    name: string;
    note: string;
    warnings: string[];
  };
  currentStopIndex: number;
  deliveredCount: number;
  liveMarkers: LiveMarker[];
  routeDirections: DriverRouteDirection[];
  routeFallbackReason: string | null;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routeId: string;
  routeName: string;
  routingProvider: ResolvedRoute["provider"];
  volunteerId: string;
};

export type RouteDetailData = {
  directions: DriverRouteDirection[];
  route: RouteSummaryCard & {
    explanation: string;
    warnings: string[];
  };
  routeFallbackReason: string | null;
  routeLine: ReadonlyArray<readonly [number, number]>;
  routingProvider: ResolvedRoute["provider"];
  stops: Array<{
    accessSummary: string;
    address: string;
    etaLabel: string;
    id: string;
    items: Array<{
      allergenFlags: string[];
      dietaryTags: string[];
      name: string;
      quantity: number;
      refrigerated: boolean;
    }>;
    mealSummary: string;
    name: string;
    originalMessageExcerpt: string | null;
    status: string;
  }>;
  volunteer: {
    name: string;
    phone: string | null;
  };
  vehicle: {
    name: string;
    refrigerated: boolean;
    wheelchairLift: boolean;
  };
};

export const requestIntakeSchema = parsedRequestPayloadSchema;
export const volunteerIntakeSchema = parsedVolunteerPayloadSchema;

export const gmailIntakeSchema = z.object({
  deliveredTo: z.array(z.string()).default([]),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
  id: z.string().min(1),
  receivedAt: z.coerce.date().optional(),
  rawBody: z.string().min(4),
  subject: z.string().default("Gmail intake"),
  threadId: z.string().optional(),
  to: z.array(z.string()).default([]),
});

export const draftUpdateSchema = z.discriminatedUnion("draftType", [
  z.object({
    draftType: z.literal("request"),
    structuredPayload: requestIntakeSchema,
  }),
  z.object({
    draftType: z.literal("volunteer"),
    structuredPayload: volunteerIntakeSchema,
  }),
]);

export const inventoryEntrySchema = z.object({
  allergenFlags: z.array(z.string()).default([]),
  category: z.enum(mealCategories).optional(),
  dietaryTags: z.array(z.string()).default([]),
  entryType: z.enum(["ingredient", "meal"]),
  lowStockThreshold: z.number().int().min(1).default(3),
  name: z.string().min(2),
  notes: z.string().optional(),
  perishabilityLabel: z.string().optional(),
  perishabilityScore: z.number().int().min(1).max(5).optional(),
  quantity: z.number().int().min(1),
  refrigerated: z.boolean().default(false),
  sourceReference: z.string().optional(),
  sourceType: z.enum(ingredientSourceTypes).optional(),
  unit: z.string().min(1),
});

export const inventoryParseSchema = z.object({
  documentName: z.string().min(1).default("Fixture receipt"),
  rawText: z.string().default(""),
  sourceNote: z.string().min(2).default("Manual receipt fixture"),
});

export const driverSessionStartSchema = z.object({
  currentLat: z.number().optional(),
  currentLng: z.number().optional(),
  deviceFingerprint: z.string().min(3),
  routeId: z.string().min(3),
  volunteerId: z.string().min(3),
});

export const driverHeartbeatSchema = z.object({
  currentLat: z.number(),
  currentLng: z.number(),
  currentStopIndex: z.number().int().min(0),
  deliveredCountLocal: z.number().int().min(0),
  sessionId: z.string().min(3),
});

export const driverSessionEndSchema = z.object({
  sessionId: z.string().min(3),
});

export const driverStopCompleteSchema = z.object({
  sessionId: z.string().min(3),
  status: z.enum(["delivered", "could_not_deliver"]),
  stopId: z.string().min(3),
});

export const routeResetSchema = z.object({
  routeId: z.string().min(3),
});

export const routeApproveSchema = z.object({
  routeId: z.string().min(3),
});

export const publicRouteCommitSchema = z.object({
  assignments: z
    .array(
      z.object({
        routeIndex: z.number().int().min(0),
        volunteerId: z.string().min(3),
      })
    )
    .default([]),
  batchId: z.string().min(3).optional(),
});

export type RoutePrerequisiteInput = {
  driverMinutesAvailable: number;
  hasCoordinates: boolean;
  inventoryAvailable: number;
  isApproved: boolean;
  needsColdChain: boolean;
  stopCount: number;
  vehicleRefrigerated: boolean;
  driveMinutes: number;
};

const truncateTableNames = [
  "driver_sessions",
  "route_stop_meal_items",
  "route_stops",
  "routes",
  "delivery_requests",
  "clients",
  "volunteer_availability",
  "volunteers",
  "vehicles",
  "ingredient_items",
  "deliverable_meals",
  "intake_drafts",
  "intake_messages",
  "depots",
];

function formatTime(value: Date | null | undefined) {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: VANCOUVER_TZ,
  }).format(value);
}

function formatRelativeMinutes(value: number) {
  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

const weekdayNames = {
  FR: "Fri",
  MO: "Mon",
  SA: "Sat",
  SU: "Sun",
  TH: "Thu",
  TU: "Tue",
  WE: "Wed",
} as const;

function formatAvailabilityDays({
  date,
  recurringRule,
}: {
  date: string;
  recurringRule: string | null;
}) {
  const recurringDays = recurringRule
    ?.split(";")
    .find((part) => part.startsWith("BYDAY="))
    ?.replace("BYDAY=", "")
    .split(",")
    .map((day) => weekdayNames[day as keyof typeof weekdayNames])
    .filter(Boolean);

  if (recurringDays?.join(",") === "Mon,Tue,Wed,Thu,Fri") {
    return "Mon-Fri";
  }

  if (recurringDays && recurringDays.length > 0) {
    return recurringDays.join(", ");
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: VANCOUVER_TZ,
    weekday: "short",
  }).format(new Date(`${date}T12:00:00-07:00`));
}

function formatRelativeSeconds(value: number) {
  return formatRelativeMinutes(Math.max(1, Math.round(value / 60)));
}

function formatDistanceMeters(value: number) {
  if (value < 1000) {
    return `${Math.max(10, Math.round(value / 10) * 10)} m`;
  }

  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} km`;
}

function formatRouteDirections(route: ResolvedRoute) {
  return route.segments
    .flatMap((segment, segmentIndex) =>
      segment.steps.map((step) => ({ segmentIndex, step }))
    )
    .filter(({ step }) => step.instruction.length > 0)
    .map(({ segmentIndex, step }, index) => ({
      sequence: index + 1,
      instruction: step.instruction,
      distance: formatDistanceMeters(step.distanceMeters),
      distanceMeters: step.distanceMeters,
      duration: formatRelativeSeconds(step.durationSeconds),
      segmentIndex,
    })) satisfies DriverRouteDirection[];
}

function sentenceCaseList(values: string[]) {
  if (values.length === 0) {
    return "None";
  }

  return values
    .map((value) => value.replace(/_/g, " "))
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    .join(", ");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripMunicipalityFromAddressLine(
  addressLine: string,
  municipality: string
) {
  const cleanAddress = addressLine.trim();
  const cleanMunicipality = municipality.trim();

  if (!cleanAddress || !cleanMunicipality) {
    return cleanAddress;
  }

  return (
    cleanAddress
      .replace(
        new RegExp(`\\s*,?\\s*${escapeRegExp(cleanMunicipality)}\\s*$`, "i"),
        ""
      )
      .trim() || cleanAddress
  );
}

function formatAddressWithMunicipality(
  addressLine: string,
  municipality: string,
  addressLine2?: string | null
) {
  const cleanAddress = stripMunicipalityFromAddressLine(
    addressLine,
    municipality
  );
  const parts = [cleanAddress, addressLine2, municipality]
    .map((part) => part?.trim())
    .filter(Boolean);

  return parts.join(", ");
}

function compactName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function buildRequestRawBody(input: z.infer<typeof requestIntakeSchema>) {
  return [
    `Name: ${compactName(input.firstName, input.lastName)}`,
    `Address: ${formatAddressWithMunicipality(
      input.addressLine1,
      input.municipality,
      input.addressLine2
    )}`,
    `Contact: ${input.contactPhone ?? input.contactEmail ?? "Not supplied"}`,
    `Household size: ${input.householdSize}`,
    `Meal count: ${input.requestedMealCount}`,
    `Need by: ${input.dueBucket}`,
    input.coldChainRequired ? "Needs refrigeration or a cooler" : null,
    input.dietaryTags.length > 0
      ? `Dietary notes: ${sentenceCaseList(input.dietaryTags)}`
      : null,
    input.allergenFlags.length > 0
      ? `Allergens: ${sentenceCaseList(input.allergenFlags)}`
      : null,
    `Message: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildVolunteerRawBody(input: z.infer<typeof volunteerIntakeSchema>) {
  return [
    `Name: ${compactName(input.firstName, input.lastName)}`,
    `Contact: ${input.contactPhone ?? input.contactEmail ?? "Not supplied"}`,
    `Starting area: ${input.homeArea}, ${input.homeMunicipality}`,
    `Availability: ${input.minutesAvailable} minutes, ${input.windowStart}-${input.windowEnd}`,
    `Vehicle access: ${input.hasVehicleAccess ? "Yes" : "No"}`,
    `Can bring a cooler: ${input.canHandleColdChain ? "Yes" : "No"}`,
    `Stairs: ${input.canClimbStairs ? "Comfortable" : "Avoid stairs"}`,
    `Message: ${input.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function confidenceFromFields(baseline: number, lowConfidenceFields: string[]) {
  return Math.max(52, baseline - lowConfidenceFields.length * 5);
}

function requestLowConfidenceFields(
  input: z.infer<typeof requestIntakeSchema>
) {
  return [
    input.contactEmail || input.contactPhone ? null : "contact",
    input.message.length > 20 ? null : "message",
    input.addressLine1.toLowerCase().includes("pending")
      ? "addressLine1"
      : null,
  ].filter(Boolean) as string[];
}

function volunteerLowConfidenceFields(
  input: z.infer<typeof volunteerIntakeSchema>
) {
  return [
    input.contactEmail || input.contactPhone ? null : "contact",
    input.message.length > 20 ? null : "message",
    input.homeArea.toLowerCase().includes("pending") ? "homeArea" : null,
  ].filter(Boolean) as string[];
}

function selectedContact(input: {
  contactEmail?: string | null;
  contactPhone?: string | null;
}) {
  return input.contactPhone ?? input.contactEmail ?? "Reply channel pending";
}

function extractFirstEmail(value: string | null | undefined) {
  return value?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
}

function extractFirstPhone(value: string | null | undefined) {
  return (
    value?.match(
      /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
    )?.[0] ?? ""
  );
}

function textField(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function structuredTextField(
  value: Record<string, unknown> | null | undefined,
  key: string
) {
  return value ? textField(value[key]) : null;
}

function sourcePayloadRecord(intake: typeof intakeMessages.$inferSelect) {
  return intake.sourcePayload ?? {};
}

function sourcePayloadTextField(
  payload: Record<string, unknown> | null | undefined,
  key: string
) {
  const value = payload?.[key];

  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function gmailSourceKeyFromPayload(
  payload: Record<string, unknown> | null | undefined
) {
  const messageId =
    sourcePayloadTextField(payload, "gmailMessageId") ??
    sourcePayloadTextField(payload, "messageId");

  return messageId ? `gmail:${messageId}` : null;
}

function gmailMessageIdFromSourceKey(sourceKey: string) {
  return sourceKey.startsWith("gmail:") ? sourceKey.slice(6) : sourceKey;
}

function gmailSourceKeyForIntake(intake: {
  channel: "gmail" | "manual_entry" | "public_form";
  sourcePayload?: Record<string, unknown> | null;
}) {
  return intake.channel === "gmail"
    ? gmailSourceKeyFromPayload(intake.sourcePayload)
    : null;
}

function submittedFieldsRecord(intake: typeof intakeMessages.$inferSelect) {
  const fields = sourcePayloadRecord(intake).submittedFields;

  return fields && typeof fields === "object" && !Array.isArray(fields)
    ? (fields as Record<string, unknown>)
    : null;
}

function extractTrailingLabeledValue(rawBody: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = rawBody.match(new RegExp(`${escaped}:\\s*([\\s\\S]+)$`, "i"));

  return textField(match?.[1]);
}

function publicFormNote(intake: typeof intakeMessages.$inferSelect) {
  if (intake.channel !== "public_form") {
    return null;
  }

  const submitted = submittedFieldsRecord(intake);
  const submittedMessage = structuredTextField(submitted, "message");

  if (submittedMessage) {
    return submittedMessage;
  }

  return (
    extractTrailingLabeledValue(intake.rawBody, "Anything else to share") ??
    extractTrailingLabeledValue(intake.rawBody, "Message") ??
    textField(intake.rawBody)
  );
}

function rawParagraphsForReview(
  intake: typeof intakeMessages.$inferSelect | undefined
) {
  if (!intake) {
    return [];
  }

  const body =
    intake.channel === "public_form"
      ? (publicFormNote(intake) ?? intake.rawBody)
      : intake.rawBody;

  return body
    .split(/\n{2,}/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitNoteSentences(value: string) {
  return value
    .split(/\n+/)
    .flatMap((line) => line.replace(/\s+/g, " ").split(/(?<=[.!?])\s+/))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isNonOperationalNote(entry: string) {
  const normalized = entry
    .trim()
    .replace(/[.!?,:;-]+$/g, "")
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  if (
    /^(hi|hello|hey|dear mealflo|dear team|mealflo team|good morning|good afternoon|good evening)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /^(thanks|thank you|thank-you|thx|cheers|regards|best|sincerely|sent from)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  if (
    /\b(family desk|neighbour line|neighbor line|community desk|intake desk|dispatch team)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

function splitOperationalNoteSentences(value: string) {
  return splitNoteSentences(value)
    .filter((entry) => !isNonOperationalNote(entry))
    .filter(Boolean);
}

function focusedRequestNotes(
  payload: z.infer<typeof requestIntakeSchema>,
  fallback?: string | null
) {
  const candidate = textField(fallback) ?? payload.message;
  const sentences = splitOperationalNoteSentences(candidate);
  const accessPattern =
    /\b(text|call|phone|before|arrival|buzzer|intercom|door|stairs|knock|lobby|parking|leave|walker|wheelchair|side entrance|gate|elevator|porch|ramp|suite|unit|loading zone)\b/i;
  const foodNeedPattern =
    /\b(peanuts?|tree nuts?|nut allergy|allerg(?:y|ic|en)|low[-\s]?sodium|low[-\s]?salt|lower[-\s]?salt|vegetarian|vegan|halal|gluten|celiac|dairy|lactose|diabetic|diabetes|soft|pureed|minced|renal|shellfish|egg|fish|wheat|chilled|frozen|cold|refrigerated|fridge|cooler)\b/i;
  const focused = sentences.filter((sentence) => {
    if (/^(area|neighbou?rhood)\s*:/i.test(sentence)) {
      return false;
    }

    if (foodNeedPattern.test(sentence) && !accessPattern.test(sentence)) {
      return false;
    }

    if (
      new RegExp(
        `\\b(${escapeRegExp(payload.firstName)}|${escapeRegExp(payload.lastName)}|${escapeRegExp(payload.addressLine1)}|${escapeRegExp(payload.municipality)})\\b`,
        "i"
      ).test(sentence)
    ) {
      return false;
    }

    if (
      /\b(meals?|grocer(?:y|ies)|hamper|household|people|family|home|need|would help|delivery request)\b/i.test(
        sentence
      ) &&
      !accessPattern.test(sentence)
    ) {
      return false;
    }

    return true;
  });

  return focused.join(" ") || "No extra access notes provided.";
}

function focusedVolunteerNotes(
  payload: z.infer<typeof volunteerIntakeSchema>,
  fallback?: string | null
) {
  const candidate = textField(fallback) ?? payload.message;
  const sentences = splitOperationalNoteSentences(candidate);
  const focused = sentences.filter(
    (sentence) =>
      !/\b(contact|available|availability|minutes?|hours?|starting|start from|near|window|vehicle|car|bike|hatchback|cooler|cold|stairs|comfortable|avoid stairs)\b/i.test(
        sentence
      )
  );

  return focused.join(" ") || "No extra route notes provided.";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toRouteStatus(
  route: typeof routes.$inferSelect
): RouteSummaryCard["status"] {
  if (route.status === "in_progress") {
    return route.warnings.length > 0 ? "attention" : "on-track";
  }

  return route.warnings.length > 0 ? "attention" : "ready";
}

function isTerminalRouteStopStatus(
  status: typeof routeStops.$inferSelect.status
) {
  return (
    status === "delivered" ||
    status === "could_not_deliver" ||
    status === "skipped"
  );
}

const requestStatusLabels: Record<TriageRequestCard["status"], string> = {
  approved: "Ready",
  assigned: "Routed",
  delivered: "Delivered",
  held: "Held",
  out_for_delivery: "Out now",
};

function bucketSortValue(bucket: TriageBucket) {
  return bucket === "today" ? 0 : bucket === "tomorrow" ? 1 : 2;
}

function isGeneratedPublicRouteId(routeId: string) {
  return routeId.startsWith("route-public-");
}

function publicRouteSortWeight(route: typeof routes.$inferSelect) {
  if (
    isGeneratedPublicRouteId(route.id) &&
    route.serviceDate === seedMetadata.baseDates.today
  ) {
    return 0;
  }

  return 1;
}

async function loadDemoGraph() {
  const database = getDb();

  const [
    depotRows,
    intakeRows,
    draftRows,
    clientRows,
    volunteerRows,
    availabilityRows,
    vehicleRows,
    requestRows,
    mealRows,
    ingredientRows,
    routeRows,
    stopRows,
    stopMealRows,
    sessionRows,
  ] = await Promise.all([
    database.select().from(depots),
    database.select().from(intakeMessages),
    database.select().from(intakeDrafts),
    database.select().from(clients),
    database.select().from(volunteers),
    database.select().from(volunteerAvailability),
    database.select().from(vehicles),
    database.select().from(deliveryRequests),
    database.select().from(deliverableMeals),
    database.select().from(ingredientItems),
    database.select().from(routes),
    database.select().from(routeStops),
    database.select().from(routeStopMealItems),
    database.select().from(driverSessions),
  ]);

  return {
    availabilityRows,
    clientRows,
    depotRows,
    draftRows,
    ingredientRows,
    intakeRows,
    mealRows,
    requestRows,
    routeRows,
    sessionRows,
    stopMealRows,
    stopRows,
    vehicleRows,
    volunteerRows,
  };
}

function buildRouteWaypoints(
  routeId: string,
  depotRows: Array<typeof depots.$inferSelect>,
  routeRows: Array<typeof routes.$inferSelect>,
  stopRows: Array<typeof routeStops.$inferSelect>
) {
  const route = routeRows.find((entry) => entry.id === routeId);

  if (!route) {
    return [] as RouteCoordinate[];
  }

  const depot = depotRows.find((entry) => entry.id === route.startDepotId);
  const orderedStops = stopRows
    .filter((entry) => entry.routeId === route.id)
    .sort((left, right) => left.sequence - right.sequence);

  return [
    depot ? ([depot.longitude, depot.latitude] as const) : null,
    ...orderedStops.map((entry) => [entry.longitude, entry.latitude] as const),
  ].filter(Boolean) as RouteCoordinate[];
}

function getRoutingWaypointHash(waypoints: readonly RouteCoordinate[]) {
  return waypoints
    .map(
      ([longitude, latitude]) =>
        `${longitude.toFixed(6)},${latitude.toFixed(6)}`
    )
    .join("|");
}

function getCachedResolvedRoute(
  route: typeof routes.$inferSelect,
  waypointHash: string
): ResolvedRoute | null {
  if (
    route.routingWaypointHash !== waypointHash ||
    !route.routeGeometry ||
    !route.routeDirections ||
    !route.routingProvider
  ) {
    return null;
  }

  const provider =
    route.routingProvider === "openrouteservice"
      ? "openrouteservice"
      : "fallback";

  return {
    distanceMeters: route.routeDistanceMeters ?? 0,
    durationSeconds: route.routeDurationSeconds ?? 0,
    fallbackReason: route.routeFallbackReason,
    geometry: route.routeGeometry,
    provider,
    segments: route.routeDirections as RouteSegmentDirections[],
  };
}

async function saveResolvedRoute(
  routeId: string,
  waypointHash: string,
  resolvedRoute: ResolvedRoute
) {
  const now = new Date();

  try {
    await getDb()
      .update(routes)
      .set({
        routeDirections: resolvedRoute.segments,
        routeDistanceMeters: resolvedRoute.distanceMeters,
        routeDurationSeconds: resolvedRoute.durationSeconds,
        routeFallbackReason: resolvedRoute.fallbackReason,
        routeGeometry: resolvedRoute.geometry,
        routedAt: now,
        routingProvider: resolvedRoute.provider,
        routingWaypointHash: waypointHash,
        updatedAt: now,
      })
      .where(eq(routes.id, routeId));
  } catch (error) {
    console.warn("Could not persist resolved route directions.", error);
  }
}

async function buildResolvedRoute(
  routeId: string | undefined,
  depotRows: Array<typeof depots.$inferSelect>,
  routeRows: Array<typeof routes.$inferSelect>,
  stopRows: Array<typeof routeStops.$inferSelect>
) {
  if (!routeId) {
    return resolveStreetRoute([]);
  }

  const route = routeRows.find((entry) => entry.id === routeId);
  const waypoints = buildRouteWaypoints(
    routeId,
    depotRows,
    routeRows,
    stopRows
  );
  const waypointHash = getRoutingWaypointHash(waypoints);

  if (route) {
    const cachedRoute = getCachedResolvedRoute(route, waypointHash);

    if (cachedRoute) {
      return cachedRoute;
    }
  }

  const resolvedRoute = await resolveStreetRoute(waypoints);

  if (route) {
    await saveResolvedRoute(route.id, waypointHash, resolvedRoute);
  }

  return resolvedRoute;
}

async function buildRoutePath(
  routeId: string | undefined,
  depotRows: Array<typeof depots.$inferSelect>,
  routeRows: Array<typeof routes.$inferSelect>,
  stopRows: Array<typeof routeStops.$inferSelect>
) {
  return (await buildResolvedRoute(routeId, depotRows, routeRows, stopRows))
    .geometry;
}

function buildLiveMarkers(
  routeRows: Array<typeof routes.$inferSelect>,
  stopRows: Array<typeof routeStops.$inferSelect>,
  sessionRows: Array<typeof driverSessions.$inferSelect>,
  volunteerRows: Array<typeof volunteers.$inferSelect>,
  depotRows: Array<typeof depots.$inferSelect>
) {
  const now = new Date();
  const activeSessionsByRoute = new Map<
    string,
    Array<typeof driverSessions.$inferSelect>
  >();

  for (const session of sessionRows) {
    if (session.status !== "active" || isSessionLost(session, now)) {
      continue;
    }

    const routeSessions = activeSessionsByRoute.get(session.routeId) ?? [];
    routeSessions.push(session);
    activeSessionsByRoute.set(session.routeId, routeSessions);
  }

  for (const routeSessions of activeSessionsByRoute.values()) {
    routeSessions.sort(
      (left, right) =>
        left.startedAt.getTime() - right.startedAt.getTime() ||
        left.id.localeCompare(right.id)
    );
  }

  const activeRoutes = routeRows
    .filter(
      (route) => route.status === "in_progress" || route.status === "approved"
    )
    .sort((left, right) => {
      const leftHasDriver = activeSessionsByRoute.has(left.id) ? 0 : 1;
      const rightHasDriver = activeSessionsByRoute.has(right.id) ? 0 : 1;
      const leftStatusRank = left.status === "in_progress" ? 0 : 1;
      const rightStatusRank = right.status === "in_progress" ? 0 : 1;

      return (
        leftHasDriver - rightHasDriver ||
        leftStatusRank - rightStatusRank ||
        left.routeName.localeCompare(right.routeName)
      );
    });

  const markers: LiveMarker[] = [];

  for (const route of activeRoutes.slice(0, 3)) {
    const depot = depotRows.find((entry) => entry.id === route.startDepotId);
    const volunteer = volunteerRows.find(
      (entry) => entry.id === route.volunteerId
    );
    const routeSessions = activeSessionsByRoute.get(route.id) ?? [];
    const anchorSession =
      routeSessions.find(
        (entry) => entry.id === route.dashboardAnchorSessionId
      ) ??
      routeSessions.find((entry) => entry.isAnchor) ??
      routeSessions[0];
    const nextStop = stopRows
      .filter(
        (entry) =>
          entry.routeId === route.id && !isTerminalRouteStopStatus(entry.status)
      )
      .sort((left, right) => left.sequence - right.sequence)[0];

    if (depot) {
      markers.push({
        id: `depot-${route.id}`,
        label: depot.name,
        latitude: depot.latitude,
        longitude: depot.longitude,
        tone: "primary",
      });
    }

    if (
      anchorSession?.currentLat !== null &&
      anchorSession?.currentLat !== undefined &&
      anchorSession.currentLng !== null &&
      anchorSession.currentLng !== undefined &&
      volunteer
    ) {
      markers.push({
        description: route.routeName,
        icon: "delivery-van",
        id: `driver-${route.id}`,
        label: volunteer.firstName,
        latitude: anchorSession.currentLat,
        longitude: anchorSession.currentLng,
        tone: route.status === "in_progress" ? "success" : "info",
      });
    }

    if (nextStop) {
      markers.push({
        id: `next-stop-${route.id}`,
        label: "Next stop",
        latitude: nextStop.latitude,
        longitude: nextStop.longitude,
        tone: "warning",
      });
    }
  }

  return markers;
}

function buildRouteSummaries(graph: Awaited<ReturnType<typeof loadDemoGraph>>) {
  const now = new Date();
  const volunteerById = new Map(
    graph.volunteerRows.map((entry) => [entry.id, entry] as const)
  );
  const sessionById = new Map(
    graph.sessionRows
      .filter(
        (entry) => entry.status === "active" && !isSessionLost(entry, now)
      )
      .map((entry) => [entry.id, entry] as const)
  );
  const stopCountsByRoute = new Map<string, number>();

  for (const stop of graph.stopRows) {
    stopCountsByRoute.set(
      stop.routeId,
      (stopCountsByRoute.get(stop.routeId) ?? 0) + 1
    );
  }

  return graph.routeRows
    .slice()
    .sort((left, right) => {
      const publicRouteWeight =
        publicRouteSortWeight(left) - publicRouteSortWeight(right);

      if (publicRouteWeight !== 0) {
        return publicRouteWeight;
      }

      if (publicRouteSortWeight(left) === 0) {
        return (
          right.createdAt.getTime() - left.createdAt.getTime() ||
          left.routeName.localeCompare(right.routeName)
        );
      }

      if (left.status === right.status) {
        return left.routeName.localeCompare(right.routeName);
      }

      return left.status === "in_progress" ? -1 : 1;
    })
    .map((route) => {
      const volunteer = volunteerById.get(route.volunteerId);
      const anchorSession = route.dashboardAnchorSessionId
        ? sessionById.get(route.dashboardAnchorSessionId)
        : null;
      const fallbackStop = graph.stopRows.find(
        (entry) => entry.routeId === route.id
      );

      return {
        id: route.id,
        name: route.routeName,
        driver: volunteer
          ? compactName(volunteer.firstName, volunteer.lastName)
          : "Unassigned",
        status: toRouteStatus(route),
        stops: stopCountsByRoute.get(route.id) ?? route.stopCount,
        delivered: route.deliveredCount,
        remaining: route.remainingCount,
        eta: formatRelativeMinutes(route.plannedTotalMinutes),
        area: route.areaLabel,
        utilization: `${route.capacityUtilizationPercent}%`,
        latitude:
          anchorSession?.currentLat ??
          fallbackStop?.latitude ??
          graph.depotRows[0]?.latitude ??
          48.4284,
        longitude:
          anchorSession?.currentLng ??
          fallbackStop?.longitude ??
          graph.depotRows[0]?.longitude ??
          -123.3656,
      } satisfies RouteSummaryCard;
    });
}

function buildStopRows(
  routeId: string,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const stopMealByStop = new Map<
    string,
    Array<typeof routeStopMealItems.$inferSelect>
  >();

  for (const item of graph.stopMealRows) {
    const items = stopMealByStop.get(item.routeStopId) ?? [];
    items.push(item);
    stopMealByStop.set(item.routeStopId, items);
  }

  return graph.stopRows
    .filter((entry) => entry.routeId === routeId)
    .sort((left, right) => left.sequence - right.sequence)
    .map((entry) => {
      const client = clientById.get(entry.clientId);
      const stopMeals = stopMealByStop.get(entry.id) ?? [];
      const warnings = [
        stopMeals.some((item) => item.refrigerated) ? "Fridge" : null,
        ...Array.from(
          new Set(
            stopMeals.flatMap((item) => [
              ...item.dietaryTags.map((tag) => tag.replace(/_/g, " ")),
              ...item.allergenFlags.map((flag) => `${flag} allergy`),
            ])
          )
        ).slice(0, 3),
      ].filter(Boolean) as string[];

      return {
        id: entry.id,
        name: client
          ? compactName(client.firstName, client.lastName)
          : "Unknown neighbour",
        address: entry.addressLine,
        items: entry.mealSummary,
        status:
          entry.status === "delivered"
            ? "Delivered"
            : entry.status === "ready"
              ? "Now"
              : entry.sequence === 2
                ? "Next"
                : "Planned",
        warnings,
      } satisfies StopTableRow;
    });
}

function buildDriverRouteStopDetails(
  routeId: string,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const mealById = new Map(
    graph.mealRows.map((entry) => [entry.id, entry] as const)
  );
  const stopMealByStop = new Map<
    string,
    Array<typeof routeStopMealItems.$inferSelect>
  >();

  for (const item of graph.stopMealRows) {
    const bucket = stopMealByStop.get(item.routeStopId) ?? [];
    bucket.push(item);
    stopMealByStop.set(item.routeStopId, bucket);
  }

  return graph.stopRows
    .filter((entry) => entry.routeId === routeId)
    .sort((left, right) => left.sequence - right.sequence)
    .map((stop) => {
      const client = clientById.get(stop.clientId);
      const stopMeals = stopMealByStop.get(stop.id) ?? [];
      const warnings = [
        stopMeals.some((item) => item.refrigerated) ? "Fridge" : null,
        client?.doNotEnter ? "Do not enter" : null,
        client?.safeToLeave ? "Safe to leave" : null,
        client?.assistanceAtDoor ? "Door assist" : null,
        client?.requiresTwoPerson ? "Two-person" : null,
        ...Array.from(
          new Set(
            stopMeals.flatMap((item) => [
              ...item.dietaryTags.map((tag) => tag.replace(/_/g, " ")),
              ...item.allergenFlags.map((flag) => `${flag} allergy`),
            ])
          )
        ).slice(0, 3),
      ].filter(Boolean) as string[];

      return {
        id: stop.id,
        name: client
          ? compactName(client.firstName, client.lastName)
          : "Unknown neighbour",
        address: stop.addressLine,
        etaLabel: formatTime(stop.eta),
        mealSummary: stop.mealSummary,
        accessSummary: stop.accessSummary,
        originalMessageExcerpt: stop.originalMessageExcerpt,
        phone: client?.phone ?? null,
        latitude: stop.latitude,
        longitude: stop.longitude,
        status: stop.status.replace(/_/g, " "),
        warnings,
        items: stopMeals.map((item) => {
          const meal = mealById.get(item.mealId);

          return {
            name: meal?.name ?? item.mealNameSnapshot,
            quantity: item.quantity,
            dietaryTags: item.dietaryTags,
            allergenFlags: item.allergenFlags,
            refrigerated: item.refrigerated,
          };
        }),
      } satisfies DriverRouteStop;
    });
}

async function buildDriverRouteOptions(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const volunteerById = new Map(
    graph.volunteerRows.map((entry) => [entry.id, entry] as const)
  );
  const vehicleById = new Map(
    graph.vehicleRows.map((entry) => [entry.id, entry] as const)
  );

  const orderedRoutes = graph.routeRows.slice().sort((left, right) => {
    const publicRouteWeight =
      publicRouteSortWeight(left) - publicRouteSortWeight(right);

    if (publicRouteWeight !== 0) {
      return publicRouteWeight;
    }

    if (publicRouteSortWeight(left) === 0) {
      return (
        right.createdAt.getTime() - left.createdAt.getTime() ||
        left.routeName.localeCompare(right.routeName)
      );
    }

    const statusWeight = (route: typeof routes.$inferSelect) =>
      route.status === "in_progress"
        ? 0
        : route.status === "approved"
          ? 1
          : route.status === "planned"
            ? 2
            : 3;

    return (
      statusWeight(left) - statusWeight(right) ||
      left.plannedTotalMinutes - right.plannedTotalMinutes ||
      left.routeName.localeCompare(right.routeName)
    );
  });

  return Promise.all(
    orderedRoutes.map(async (route) => {
      const volunteer = volunteerById.get(route.volunteerId);
      const vehicle = vehicleById.get(route.vehicleId);
      const depot = graph.depotRows.find(
        (entry) => entry.id === route.startDepotId
      );
      const stops = buildDriverRouteStopDetails(route.id, graph);
      const resolvedRoute = await buildResolvedRoute(
        route.id,
        graph.depotRows,
        graph.routeRows,
        graph.stopRows
      );

      return {
        id: route.id,
        name: route.routeName,
        area: route.areaLabel,
        stopCount: route.stopCount,
        deliveredCount: route.deliveredCount,
        remainingCount: route.remainingCount,
        depot: depot
          ? {
              latitude: depot.latitude,
              longitude: depot.longitude,
              name: depot.name,
            }
          : null,
        eta: formatRelativeMinutes(route.plannedTotalMinutes),
        driveTime: formatRelativeMinutes(route.plannedDriveMinutes),
        totalPlannedTime: formatRelativeMinutes(route.plannedTotalMinutes),
        plannedDriveMinutes: route.plannedDriveMinutes,
        plannedTotalMinutes: route.plannedTotalMinutes,
        routeDirections: formatRouteDirections(resolvedRoute),
        routeFallbackReason: resolvedRoute.fallbackReason,
        routeLine: resolvedRoute.geometry,
        routingProvider: resolvedRoute.provider,
        utilization: `${route.capacityUtilizationPercent}%`,
        firstStop:
          stops.find((stop) => stop.status !== "delivered")?.name ??
          stops[0]?.name ??
          "First stop pending",
        coldChainNote:
          route.warnings[0] ??
          (vehicle?.refrigerated
            ? "A cooler tote is loaded with this vehicle."
            : "Meals are ready for this route."),
        warnings: route.warnings,
        stops,
        volunteer: {
          id: route.volunteerId,
          name: volunteer
            ? compactName(volunteer.firstName, volunteer.lastName)
            : "Driver pending",
          phone: volunteer?.phone ?? null,
        },
        vehicle: {
          name: vehicle?.name ?? "Vehicle pending",
          refrigerated: vehicle?.refrigerated ?? false,
          wheelchairLift: vehicle?.wheelchairLift ?? false,
        },
      } satisfies DriverRouteOption;
    })
  );
}

function buildTriageBuckets(graph: Awaited<ReturnType<typeof loadDemoGraph>>) {
  const buckets: Record<TriageBucket, TriageRequestCard[]> = {
    later: [],
    today: [],
    tomorrow: [],
  };
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const routeById = new Map(
    graph.routeRows.map((entry) => [entry.id, entry] as const)
  );
  const routableStatuses = new Set<TriageRequestCard["status"]>([
    "approved",
    "assigned",
    "delivered",
    "held",
    "out_for_delivery",
  ]);

  for (const request of graph.requestRows) {
    if (!routableStatuses.has(request.status as TriageRequestCard["status"])) {
      continue;
    }

    const bucket = request.dueBucket as TriageBucket;
    const client = clientById.get(request.clientId);
    const route = request.assignedRouteId
      ? routeById.get(request.assignedRouteId)
      : null;
    const dietaryTags = [
      ...request.dietaryTagsSnapshot,
      ...request.allergenFlagsSnapshot.map((entry) => `${entry} allergy`),
    ]
      .map((entry) => entry.replace(/_/g, " "))
      .slice(0, 3);
    const safetyNotes = [
      request.coldChainRequired ? "Needs cooler" : null,
      client?.requiresTwoPerson ? "Two-person" : null,
      client?.usesWheelchair ? "Wheelchair" : null,
      client?.assistanceAtDoor ? "Door assist" : null,
      request.routingHoldReason ? "Needs dispatch check" : null,
    ].filter(Boolean) as string[];

    buckets[bucket].push({
      address: client
        ? `${client.addressLine1}, ${client.municipality}`
        : "Address pending",
      bucket,
      clientName: client
        ? compactName(client.firstName, client.lastName)
        : "Unknown neighbour",
      dietaryTags,
      householdSize: request.householdSizeSnapshot,
      id: request.id,
      latitude: client?.latitude ?? 48.4284,
      longitude: client?.longitude ?? -123.3656,
      mealCount: request.approvedMealCount,
      routeName: route?.routeName ?? null,
      safetyNotes,
      status: request.status as TriageRequestCard["status"],
      statusLabel:
        requestStatusLabels[request.status as TriageRequestCard["status"]],
      urgency: `${request.urgencyScore}/100`,
    });
  }

  for (const bucket of Object.keys(buckets) as TriageBucket[]) {
    buckets[bucket].sort((left, right) => {
      const statusWeight = (item: TriageRequestCard) =>
        item.status === "held" ? -1 : item.status === "approved" ? 0 : 1;

      return (
        statusWeight(left) - statusWeight(right) ||
        Number(right.urgency.split("/")[0]) - Number(left.urgency.split("/")[0])
      );
    });
  }

  return buckets;
}

function buildDriverCapacity(graph: Awaited<ReturnType<typeof loadDemoGraph>>) {
  const volunteerById = new Map(
    graph.volunteerRows.map((entry) => [entry.id, entry] as const)
  );
  const vehicleById = new Map(
    graph.vehicleRows.map((entry) => [entry.id, entry] as const)
  );

  return graph.availabilityRows
    .slice()
    .sort(
      (left, right) =>
        bucketSortValue(
          left.date === seedMetadata.baseDates.today
            ? "today"
            : left.date === seedMetadata.baseDates.tomorrow
              ? "tomorrow"
              : "later"
        ) -
          bucketSortValue(
            right.date === seedMetadata.baseDates.today
              ? "today"
              : right.date === seedMetadata.baseDates.tomorrow
                ? "tomorrow"
                : "later"
          ) || left.windowStart.localeCompare(right.windowStart)
    )
    .map((availability) => {
      const volunteer = volunteerById.get(availability.volunteerId);
      const vehicle = volunteer?.preferredVehicleId
        ? vehicleById.get(volunteer.preferredVehicleId)
        : null;
      const tags = [
        volunteer?.canHandleColdChain ? "Can carry cooler" : null,
        volunteer?.canHandleWheelchair ? "Lift support" : null,
        volunteer?.hasVehicleAccess ? "Has vehicle" : "Pair with driver",
        availability.source === "public_form" ? "Newly approved" : null,
      ].filter(Boolean) as string[];

      return {
        availability: formatRelativeMinutes(availability.minutesAvailable),
        id: availability.id,
        name: volunteer
          ? compactName(volunteer.firstName, volunteer.lastName)
          : "Driver pending",
        startArea: volunteer
          ? `${volunteer.homeArea}, ${volunteer.homeMunicipality}`
          : "Area pending",
        tags,
        vehicle: vehicle?.name ?? "Personal vehicle",
        window: `${availability.windowStart}-${availability.windowEnd}`,
      } satisfies DriverCapacityCard;
    })
    .slice(0, 6);
}

function buildRoutePlans(graph: Awaited<ReturnType<typeof loadDemoGraph>>) {
  const volunteerById = new Map(
    graph.volunteerRows.map((entry) => [entry.id, entry] as const)
  );
  const vehicleById = new Map(
    graph.vehicleRows.map((entry) => [entry.id, entry] as const)
  );

  return graph.routeRows
    .slice()
    .sort((left, right) => {
      if (left.serviceDate === right.serviceDate) {
        return left.routeName.localeCompare(right.routeName);
      }

      return left.serviceDate.localeCompare(right.serviceDate);
    })
    .map((route) => {
      const volunteer = volunteerById.get(route.volunteerId);
      const vehicle = vehicleById.get(route.vehicleId);

      return {
        driver: volunteer
          ? compactName(volunteer.firstName, volunteer.lastName)
          : "Unassigned",
        driveTime: formatRelativeMinutes(route.plannedDriveMinutes),
        eta: formatRelativeMinutes(route.plannedTotalMinutes),
        id: route.id,
        name: route.routeName,
        reason: route.routeExplanation,
        serviceBucket:
          route.serviceDate === seedMetadata.baseDates.today
            ? "today"
            : route.serviceDate === seedMetadata.baseDates.tomorrow
              ? "tomorrow"
              : "later",
        status: toRouteStatus(route),
        stopCount: route.stopCount,
        plannedTotalMinutes: route.plannedTotalMinutes,
        totalPlannedTime: formatRelativeMinutes(route.plannedTotalMinutes),
        utilization: `${route.capacityUtilizationPercent}%`,
        vehicle: vehicle?.name ?? "Vehicle pending",
        warnings: route.warnings,
      } satisfies RoutePlanCard;
    });
}

export function evaluateRoutePrerequisites(input: RoutePrerequisiteInput) {
  const issues: string[] = [];
  const plannedTotalMinutes = input.driveMinutes + input.stopCount * 2;
  const upperCap = Math.floor(input.driverMinutesAvailable * 0.75);

  if (!input.isApproved) {
    issues.push("Request must be approved before it can be routed.");
  }

  if (!input.hasCoordinates) {
    issues.push("Request must have a valid geocoded address.");
  }

  if (input.needsColdChain && !input.vehicleRefrigerated) {
    issues.push(
      "Requests that need refrigeration require a cooler-ready vehicle."
    );
  }

  if (input.inventoryAvailable <= 0) {
    issues.push("Assigned meal inventory is not available.");
  }

  if (plannedTotalMinutes > upperCap) {
    issues.push("Route would exceed the 75% driver availability cap.");
  }

  return issues;
}

export async function resetDemoData() {
  return serializeDemoSeedMutation(async () => {
    const database = getDb();

    await truncateDemoTables(database);

    return {
      ok: true,
      resetAt: new Date(),
    };
  });
}

let demoSeedMutation: Promise<unknown> | null = null;

async function serializeDemoSeedMutation<T>(operation: () => Promise<T>) {
  const previous = demoSeedMutation;
  const current = (async () => {
    if (previous) {
      await previous.catch(() => undefined);
    }

    return operation();
  })();
  const tracked = current.finally(() => {
    if (demoSeedMutation === tracked) {
      demoSeedMutation = null;
    }
  });

  demoSeedMutation = tracked;

  return current;
}

async function truncateDemoTables(database: ReturnType<typeof getDb>) {
  await database.execute(truncateDemoTablesStatement());
}

function truncateDemoTablesStatement() {
  return sql.raw(
    `TRUNCATE TABLE ${truncateTableNames
      .map((name) => `"${name}"`)
      .join(", ")} CASCADE`
  );
}

async function listIgnoredGmailSourceKeys(database: ReturnType<typeof getDb>) {
  const ignored = await database
    .select({
      channel: intakeMessages.channel,
      sourcePayload: intakeMessages.sourcePayload,
    })
    .from(intakeMessages)
    .where(
      and(
        eq(intakeMessages.channel, "gmail"),
        eq(intakeMessages.status, "ignored")
      )
    );

  return ignored
    .map((entry) => gmailSourceKeyForIntake(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function buildIgnoredGmailTombstones(
  sourceKeys: string[],
  existingSourceKeys: Set<string>
): NewIntakeMessage[] {
  const tombstoneKeys = sourceKeys.filter(
    (sourceKey) => !existingSourceKeys.has(sourceKey)
  );

  if (tombstoneKeys.length === 0) {
    return [];
  }

  const now = new Date();

  return tombstoneKeys.map((sourceKey, index) => {
    const gmailMessageId = gmailMessageIdFromSourceKey(sourceKey);

    return {
      id: `intake-ignored-gmail-${slugify(gmailMessageId).slice(0, 24)}-${index}`,
      channel: "gmail" as const,
      intakeKind: "other" as const,
      subject: "Ignored Gmail message",
      rawBody:
        "This Gmail message was ignored and is hidden from the demo inbox.",
      sourcePayload: {
        gmailMessageId,
        ignoredAt: now.toISOString(),
      },
      status: "ignored" as const,
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    };
  });
}

async function performSeedDemoData() {
  const dataset = buildSeedDataset();
  const database = getDb();
  const ignoredGmailSourceKeys = new Set(
    await listIgnoredGmailSourceKeys(database)
  );

  const intakeMessagesToInsert = dataset.intakeMessages.map((intake) => {
    const sourceKey = gmailSourceKeyForIntake(intake);

    return sourceKey && ignoredGmailSourceKeys.has(sourceKey)
      ? {
          ...intake,
          status: "ignored" as const,
        }
      : intake;
  });
  const ignoredSeedIntakeIds = new Set(
    intakeMessagesToInsert
      .filter((intake) => intake.status === "ignored")
      .map((intake) => intake.id)
  );
  const intakeDraftsToInsert = dataset.intakeDrafts.map((draft) =>
    ignoredSeedIntakeIds.has(draft.intakeMessageId)
      ? {
          ...draft,
          reviewedAt: new Date(),
          reviewedBy: "Sarah, coordinator",
          status: "ignored" as const,
        }
      : draft
  );
  const seededGmailSourceKeys = new Set(
    intakeMessagesToInsert
      .map((intake) => gmailSourceKeyForIntake(intake))
      .filter((entry): entry is string => Boolean(entry))
  );
  const ignoredGmailTombstones = buildIgnoredGmailTombstones(
    [...ignoredGmailSourceKeys],
    seededGmailSourceKeys
  );
  const seedBatch = [
    database.execute(truncateDemoTablesStatement()),
    database.insert(depots).values(dataset.depots),
    database.insert(intakeMessages).values(intakeMessagesToInsert),
    ...(ignoredGmailTombstones.length > 0
      ? [database.insert(intakeMessages).values(ignoredGmailTombstones)]
      : []),
    database.insert(intakeDrafts).values(intakeDraftsToInsert),
    database.insert(volunteers).values(dataset.volunteers),
    database
      .insert(volunteerAvailability)
      .values(dataset.volunteerAvailability),
    database.insert(vehicles).values(dataset.vehicles),
    database.insert(clients).values(dataset.clients),
    database.insert(deliverableMeals).values(dataset.deliverableMeals),
    database.insert(ingredientItems).values(dataset.ingredientItems),
    database.insert(routes).values(dataset.routes),
    database.insert(deliveryRequests).values(dataset.deliveryRequests),
    database.insert(routeStops).values(dataset.routeStops),
    database.insert(routeStopMealItems).values(dataset.routeStopMealItems),
    ...(dataset.driverSessions.length > 0
      ? [database.insert(driverSessions).values(dataset.driverSessions)]
      : []),
  ] as const;

  await database.batch(seedBatch);

  return {
    counts: {
      clients: dataset.clients.length,
      drafts: dataset.intakeDrafts.length,
      driverSessions: dataset.driverSessions.length,
      ingredients: dataset.ingredientItems.length,
      intakeMessages: dataset.intakeMessages.length,
      meals: dataset.deliverableMeals.length,
      requests: dataset.deliveryRequests.length,
      routeStops: dataset.routeStops.length,
      routes: dataset.routes.length,
      volunteerAvailability: dataset.volunteerAvailability.length,
      volunteers: dataset.volunteers.length,
    },
    seededAt: seedMetadata.seededAt,
  };
}

export async function seedDemoData() {
  return serializeDemoSeedMutation(performSeedDemoData);
}

export async function resetAndSeedDemoData() {
  return seedDemoData();
}

export async function createRequestIntake(
  rawInput: z.input<typeof requestIntakeSchema>
) {
  const parsedInput = requestIntakeSchema.parse(rawInput);
  const normalizedInput = requestIntakeSchema.parse({
    ...parsedInput,
    addressLine1: stripMunicipalityFromAddressLine(
      parsedInput.addressLine1,
      parsedInput.municipality
    ),
  });
  const input = requestIntakeSchema.parse({
    ...normalizedInput,
    ...normalizeFoodConstraints(normalizedInput),
  });
  const database = getDb();
  const slug = slugify(`${input.firstName}-${input.lastName}`);
  const now = new Date();
  const recordSuffix = publicFormRecordSuffix(now);
  const intakeId = `intake-${slug}-${recordSuffix}`;
  const draftId = `draft-${slug}-${recordSuffix}`;
  const lowConfidenceFields = requestLowConfidenceFields(input);
  const rawBody = buildRequestRawBody(input);

  const [intakeRecord] = await database
    .insert(intakeMessages)
    .values({
      id: intakeId,
      channel: "public_form",
      intakeKind: "request",
      senderName: compactName(input.firstName, input.lastName),
      senderEmail: input.contactEmail,
      senderPhone: input.contactPhone,
      subject: `Food request from ${compactName(input.firstName, input.lastName)}`,
      rawBody,
      rawAddress: formatAddressWithMunicipality(
        input.addressLine1,
        input.municipality,
        input.addressLine2
      ),
      sourcePayload: {
        form: "public-request",
        submittedFields: input,
      },
      status: "pending_review",
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [draftRecord] = await database
    .insert(intakeDrafts)
    .values({
      id: draftId,
      intakeMessageId: intakeId,
      draftType: "request",
      structuredPayload: input,
      confidenceScore: confidenceFromFields(92, lowConfidenceFields),
      lowConfidenceFields,
      summary: summarizeRequestPayload(input),
      parserVersion: PUBLIC_FORM_PARSING_VERSION,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    confidenceScore: draftRecord.confidenceScore,
    draftId: draftRecord.id,
    intakeId: intakeRecord.id,
  };
}

export async function createVolunteerIntake(
  rawInput: z.input<typeof volunteerIntakeSchema>
) {
  const input = volunteerIntakeSchema.parse(rawInput);
  const database = getDb();
  const slug = slugify(`${input.firstName}-${input.lastName}`);
  const now = new Date();
  const recordSuffix = publicFormRecordSuffix(now);
  const intakeId = `intake-${slug}-${recordSuffix}`;
  const draftId = `draft-${slug}-${recordSuffix}`;
  const lowConfidenceFields = volunteerLowConfidenceFields(input);
  const rawBody = buildVolunteerRawBody(input);

  const [intakeRecord] = await database
    .insert(intakeMessages)
    .values({
      id: intakeId,
      channel: "public_form",
      intakeKind: "volunteer",
      senderName: compactName(input.firstName, input.lastName),
      senderEmail: input.contactEmail,
      senderPhone: input.contactPhone,
      subject: `Volunteer offer from ${compactName(input.firstName, input.lastName)}`,
      rawBody,
      rawAddress: `${input.homeArea}, ${input.homeMunicipality}`,
      sourcePayload: {
        form: "public-volunteer",
        submittedFields: input,
      },
      status: "pending_review",
      receivedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const [draftRecord] = await database
    .insert(intakeDrafts)
    .values({
      id: draftId,
      intakeMessageId: intakeId,
      draftType: "volunteer",
      structuredPayload: input,
      confidenceScore: confidenceFromFields(94, lowConfidenceFields),
      lowConfidenceFields,
      summary: summarizeVolunteerPayload(input),
      parserVersion: PUBLIC_FORM_PARSING_VERSION,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return {
    confidenceScore: draftRecord.confidenceScore,
    draftId: draftRecord.id,
    intakeId: intakeRecord.id,
  };
}

function rawAddressFromParsedDraft(draft: ParsedIntakeDraft) {
  if (draft.draftType === "request") {
    return formatAddressWithMunicipality(
      draft.structuredPayload.addressLine1,
      draft.structuredPayload.municipality,
      draft.structuredPayload.addressLine2
    );
  }

  if (draft.draftType === "volunteer") {
    return `${draft.structuredPayload.homeArea}, ${draft.structuredPayload.homeMunicipality}`;
  }

  return undefined;
}

function publicFormSubmittedFields(intake: typeof intakeMessages.$inferSelect) {
  return submittedFieldsRecord(intake);
}

function mergePublicFormSubmittedFields(
  parsed: ParsedIntakeDraft,
  intake: typeof intakeMessages.$inferSelect
): ParsedIntakeDraft {
  const submittedFields = publicFormSubmittedFields(intake);

  if (parsed.draftType === "request") {
    const submitted = requestIntakeSchema.safeParse(submittedFields);

    if (!submitted.success) {
      return parsed;
    }

    const payload = requestIntakeSchema.parse({
      ...parsed.structuredPayload,
      ...submitted.data,
      addressLine1: stripMunicipalityFromAddressLine(
        submitted.data.addressLine1,
        submitted.data.municipality
      ),
      ...normalizeFoodConstraints(submitted.data),
      neighborhood:
        parsed.structuredPayload.neighborhood ?? submitted.data.neighborhood,
    });

    return {
      ...parsed,
      structuredPayload: payload,
      summary: summarizeRequestPayload(payload),
    };
  }

  if (parsed.draftType === "volunteer") {
    const submitted = volunteerIntakeSchema.safeParse(submittedFields);

    if (!submitted.success) {
      return parsed;
    }

    const payload = volunteerIntakeSchema.parse({
      ...parsed.structuredPayload,
      ...submitted.data,
      homeArea: submitted.data.homeArea || parsed.structuredPayload.homeArea,
      homeMunicipality:
        submitted.data.homeMunicipality ||
        parsed.structuredPayload.homeMunicipality,
    });

    return {
      ...parsed,
      structuredPayload: payload,
      summary: summarizeVolunteerPayload(payload),
    };
  }

  return parsed;
}

export async function parsePublicIntakeDraft(draftId: string) {
  const database = getDb();
  const [draft] = await database
    .select()
    .from(intakeDrafts)
    .where(eq(intakeDrafts.id, draftId))
    .limit(1);

  if (!draft || draft.status !== "pending") {
    return null;
  }

  const [intake] = await database
    .select()
    .from(intakeMessages)
    .where(eq(intakeMessages.id, draft.intakeMessageId))
    .limit(1);

  if (!intake || intake.channel !== "public_form") {
    return null;
  }

  const parsed = mergePublicFormSubmittedFields(
    await parseIncomingIntake({
      channel: "public_form",
      rawAddress: intake.rawAddress,
      rawBody: intake.rawBody,
      senderEmail: intake.senderEmail,
      senderName: intake.senderName,
      senderPhone: intake.senderPhone,
      subject: intake.subject,
    }),
    intake
  );
  const now = new Date();
  const [updatedDraft] = await database
    .update(intakeDrafts)
    .set({
      confidenceScore: parsed.confidenceScore,
      draftType: parsed.draftType,
      lowConfidenceFields: parsed.lowConfidenceFields,
      parserVersion: parsed.parserVersion,
      structuredPayload: parsed.structuredPayload,
      summary: parsed.summary,
      updatedAt: now,
    })
    .where(eq(intakeDrafts.id, draftId))
    .returning();

  await database
    .update(intakeMessages)
    .set({
      intakeKind:
        parsed.draftType === "request" || parsed.draftType === "volunteer"
          ? parsed.draftType
          : "other",
      rawAddress: rawAddressFromParsedDraft(parsed) ?? intake.rawAddress,
      status: "draft_ready",
      updatedAt: now,
    })
    .where(eq(intakeMessages.id, intake.id));

  return updatedDraft ?? null;
}

function isTargetMealfloRecipient(
  input: z.infer<typeof gmailIntakeSchema>,
  targetAddress: string
) {
  const extractEmails = (value: string) => {
    const matches = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);

    return matches?.map((match) => match.toLowerCase()) ?? [];
  };
  const [target] = extractEmails(targetAddress);
  const recipients = [...input.to, ...input.deliveredTo].flatMap(extractEmails);

  return target ? recipients.includes(target) : false;
}

function senderNameFromEmailFallback(email: string | undefined) {
  if (!email) {
    return undefined;
  }

  const localPart = email.split("@")[0] ?? "";

  return localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function insertParsedDraft({
  draft,
  intakeId,
  now,
}: {
  draft: ParsedIntakeDraft;
  intakeId: string;
  now: Date;
}) {
  const database = getDb();
  const draftId = `draft-${draft.draftType}-${slugify(draft.summary).slice(0, 18)}-${now.getTime()}`;
  const [draftRecord] = await database
    .insert(intakeDrafts)
    .values({
      id: draftId,
      intakeMessageId: intakeId,
      draftType: draft.draftType,
      structuredPayload: draft.structuredPayload,
      confidenceScore: draft.confidenceScore,
      lowConfidenceFields: draft.lowConfidenceFields,
      summary: draft.summary,
      parserVersion: draft.parserVersion,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return draftRecord;
}

export async function createGmailIntake(
  rawInput: z.input<typeof gmailIntakeSchema>,
  options: { targetAddress?: string } = {}
) {
  const input = gmailIntakeSchema.parse(rawInput);
  const targetAddress = options.targetAddress ?? serverEnv.gmailIngestToAddress;

  if (!isTargetMealfloRecipient(input, targetAddress)) {
    return {
      action: "skipped",
      reason: `Message was not delivered to ${targetAddress}.`,
    };
  }

  const database = getDb();
  const [existing] = await database
    .select()
    .from(intakeMessages)
    .where(
      sql`${intakeMessages.sourcePayload}->>'gmailMessageId' = ${input.id}`
    )
    .limit(1);

  if (existing) {
    if (existing.status === "ignored") {
      return {
        action: "ignored",
        intakeId: existing.id,
      };
    }

    return {
      action: "duplicate",
      intakeId: existing.id,
    };
  }

  const now = new Date();
  const receivedAt = input.receivedAt ?? now;
  const senderName =
    input.fromName ?? senderNameFromEmailFallback(input.fromEmail);
  const draft = await parseIncomingIntake({
    channel: "gmail",
    rawBody: input.rawBody,
    senderEmail: input.fromEmail,
    senderName,
    subject: input.subject,
  });
  const intakeId = `intake-gmail-${slugify(input.id)}-${now.getTime()}`;
  const [intakeRecord] = await database
    .insert(intakeMessages)
    .values({
      id: intakeId,
      channel: "gmail",
      intakeKind:
        draft.draftType === "request" || draft.draftType === "volunteer"
          ? draft.draftType
          : "other",
      senderName,
      senderEmail: input.fromEmail,
      subject: input.subject,
      rawBody: input.rawBody,
      rawAddress:
        draft.draftType === "request"
          ? formatAddressWithMunicipality(
              draft.structuredPayload.addressLine1,
              draft.structuredPayload.municipality,
              draft.structuredPayload.addressLine2
            )
          : undefined,
      sourcePayload: {
        deliveredTo: input.deliveredTo,
        gmailMessageId: input.id,
        gmailThreadId: input.threadId,
        targetAddress,
        to: input.to,
      },
      status: "draft_ready",
      receivedAt,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  const draftRecord = await insertParsedDraft({
    draft,
    intakeId: intakeRecord.id,
    now,
  });

  return {
    action: "created",
    confidenceScore: draftRecord.confidenceScore,
    draftId: draftRecord.id,
    draftType: draftRecord.draftType,
    intakeId: intakeRecord.id,
  };
}

export async function updateDraft(
  draftId: string,
  rawInput: z.input<typeof draftUpdateSchema>
) {
  const parsedInput = draftUpdateSchema.parse(rawInput);
  const input =
    parsedInput.draftType === "request"
      ? ({
          ...parsedInput,
          structuredPayload: requestIntakeSchema.parse({
            ...parsedInput.structuredPayload,
            addressLine1: stripMunicipalityFromAddressLine(
              parsedInput.structuredPayload.addressLine1,
              parsedInput.structuredPayload.municipality
            ),
            ...normalizeFoodConstraints(parsedInput.structuredPayload),
          }),
        } satisfies z.infer<typeof draftUpdateSchema>)
      : parsedInput;
  const database = getDb();
  const now = new Date();
  const lowConfidenceFields =
    input.draftType === "request"
      ? requestLowConfidenceFields(input.structuredPayload)
      : volunteerLowConfidenceFields(input.structuredPayload);
  const summary =
    input.draftType === "request"
      ? summarizeRequestPayload(input.structuredPayload)
      : summarizeVolunteerPayload(input.structuredPayload);
  const [draft] = await database
    .update(intakeDrafts)
    .set({
      confidenceScore: confidenceFromFields(94, lowConfidenceFields),
      draftType: input.draftType,
      lowConfidenceFields,
      parserVersion: "admin-edited-v1",
      structuredPayload: input.structuredPayload,
      summary,
      updatedAt: now,
    })
    .where(eq(intakeDrafts.id, draftId))
    .returning();

  if (!draft) {
    throw new Error(`Draft ${draftId} was not found.`);
  }

  return {
    draftId: draft.id,
    summary: draft.summary,
  };
}

export async function ignoreDraft(draftId: string) {
  const database = getDb();
  const now = new Date();
  const [draft] = await database
    .update(intakeDrafts)
    .set({
      reviewedAt: now,
      reviewedBy: "Sarah, coordinator",
      status: "ignored",
      updatedAt: now,
    })
    .where(eq(intakeDrafts.id, draftId))
    .returning();

  if (!draft) {
    throw new Error(`Draft ${draftId} was not found.`);
  }

  await database
    .update(intakeMessages)
    .set({
      status: "ignored",
      updatedAt: now,
    })
    .where(eq(intakeMessages.id, draft.intakeMessageId));

  return {
    draftId: draft.id,
    status: draft.status,
  };
}

export async function markDraftOther(draftId: string) {
  const database = getDb();
  const now = new Date();
  const [draft] = await database
    .update(intakeDrafts)
    .set({
      confidenceScore: 62,
      draftType: "other",
      lowConfidenceFields: ["draftType"],
      parserVersion: "admin-marked-other-v1",
      summary: "Marked for manual intake triage.",
      structuredPayload: {},
      updatedAt: now,
    })
    .where(eq(intakeDrafts.id, draftId))
    .returning();

  if (!draft) {
    throw new Error(`Draft ${draftId} was not found.`);
  }

  return {
    draftId: draft.id,
    draftType: draft.draftType,
  };
}

export async function approveDraft(draftId: string) {
  const database = getDb();
  const [draft] = await database
    .select()
    .from(intakeDrafts)
    .where(eq(intakeDrafts.id, draftId));

  if (!draft) {
    throw new Error(`Draft ${draftId} was not found.`);
  }

  if (draft.status === "approved" && draft.approvedRecordId) {
    return {
      draftId: draft.id,
      recordId: draft.approvedRecordId,
      recordType: draft.approvedRecordType ?? draft.draftType,
    };
  }

  const now = new Date();

  if (draft.draftType === "request") {
    const parsedPayload = requestIntakeSchema.parse(draft.structuredPayload);
    const payload = requestIntakeSchema.parse({
      ...parsedPayload,
      addressLine1: stripMunicipalityFromAddressLine(
        parsedPayload.addressLine1,
        parsedPayload.municipality
      ),
      ...normalizeFoodConstraints(parsedPayload),
    });
    const reviewNotes = focusedRequestNotes(
      payload,
      structuredTextField(draft.structuredPayload, "accessNotes")
    );
    const coordinates = geocodeDemoVictoriaAddress({
      addressLine1: payload.addressLine1,
      municipality: payload.municipality,
    });
    const slug = slugify(`${payload.firstName}-${payload.lastName}`);
    const clientId = `client-${slug}`;
    const requestId = `request-${slug}-${now.getTime()}`;
    const clientValues = {
      sourceIntakeDraftId: draft.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.contactPhone,
      email: payload.contactEmail,
      municipality: payload.municipality,
      neighborhood: payload.neighborhood,
      addressLine1: payload.addressLine1,
      addressLine2: payload.addressLine2,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      householdSize: payload.householdSize,
      dietaryTags: payload.dietaryTags,
      allergenFlags: payload.allergenFlags,
      accessNotes: reviewNotes,
      active: true,
      lastApprovedRequestAt: now,
      updatedAt: now,
    };
    const [existingClient] = await database
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (existingClient) {
      await database
        .update(clients)
        .set(clientValues)
        .where(eq(clients.id, clientId));
    } else {
      await database.insert(clients).values({
        id: clientId,
        ...clientValues,
        createdAt: now,
      });
    }

    await database.insert(deliveryRequests).values({
      id: requestId,
      clientId,
      sourceIntakeDraftId: draft.id,
      requestKind: "meal_delivery",
      dueBucket: payload.dueBucket,
      scheduledDate: seedMetadata.baseDates[payload.dueBucket],
      urgencyScore: 72,
      priorityLabel: payload.dueBucket === "today" ? "high" : "normal",
      householdSizeSnapshot: payload.householdSize,
      requestedMealCount: payload.requestedMealCount,
      approvedMealCount: payload.requestedMealCount,
      coldChainRequired: payload.coldChainRequired,
      dietaryTagsSnapshot: payload.dietaryTags,
      allergenFlagsSnapshot: payload.allergenFlags,
      accessNotes: reviewNotes,
      originalMessageExcerpt: payload.message,
      status: "approved",
      approvedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await database
      .update(intakeDrafts)
      .set({
        approvedRecordId: requestId,
        approvedRecordType: "delivery_request",
        reviewedAt: now,
        reviewedBy: "Sarah, coordinator",
        status: "approved",
        updatedAt: now,
      })
      .where(eq(intakeDrafts.id, draft.id));

    await database
      .update(intakeMessages)
      .set({
        status: "approved",
        updatedAt: now,
      })
      .where(eq(intakeMessages.id, draft.intakeMessageId));

    return {
      draftId: draft.id,
      recordId: requestId,
      recordType: "delivery_request",
    };
  }

  if (draft.draftType === "volunteer") {
    const payload = volunteerIntakeSchema.parse(draft.structuredPayload);
    const reviewNotes = focusedVolunteerNotes(
      payload,
      structuredTextField(draft.structuredPayload, "routeNotes") ??
        structuredTextField(draft.structuredPayload, "notes")
    );
    const slug = slugify(`${payload.firstName}-${payload.lastName}`);
    const volunteerId = `volunteer-${slug}`;
    const volunteerValues = {
      sourceIntakeDraftId: draft.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phone: payload.contactPhone,
      email: payload.contactEmail,
      role: "volunteer" as const,
      homeArea: payload.homeArea,
      homeMunicipality: payload.homeMunicipality,
      hasVehicleAccess: payload.hasVehicleAccess,
      canHandleColdChain: payload.canHandleColdChain,
      canHandleWheelchair: false,
      canClimbStairs: payload.canClimbStairs,
      languages: ["English"],
      active: true,
      notes: reviewNotes,
      updatedAt: now,
    };
    const [existingVolunteer] = await database
      .select({ id: volunteers.id })
      .from(volunteers)
      .where(eq(volunteers.id, volunteerId))
      .limit(1);

    if (existingVolunteer) {
      await database
        .update(volunteers)
        .set(volunteerValues)
        .where(eq(volunteers.id, volunteerId));
    } else {
      await database.insert(volunteers).values({
        id: volunteerId,
        ...volunteerValues,
        createdAt: now,
      });
    }

    await database.insert(volunteerAvailability).values({
      id: `availability-${volunteerId}-${now.getTime()}`,
      volunteerId,
      source: "public_form",
      rawText: reviewNotes,
      date: seedMetadata.baseDates.tomorrow,
      windowStart: payload.windowStart,
      windowEnd: payload.windowEnd,
      minutesAvailable: payload.minutesAvailable,
      parsedConfidence: draft.confidenceScore,
      createdAt: now,
      updatedAt: now,
    });

    await database
      .update(intakeDrafts)
      .set({
        approvedRecordId: volunteerId,
        approvedRecordType: "volunteer",
        reviewedAt: now,
        reviewedBy: "Sarah, coordinator",
        status: "approved",
        updatedAt: now,
      })
      .where(eq(intakeDrafts.id, draft.id));

    await database
      .update(intakeMessages)
      .set({
        status: "approved",
        updatedAt: now,
      })
      .where(eq(intakeMessages.id, draft.intakeMessageId));

    return {
      draftId: draft.id,
      recordId: volunteerId,
      recordType: "volunteer",
    };
  }

  throw new Error(
    `Draft type ${draft.draftType} is not approved in this flow.`
  );
}

export async function recordManualInventoryEntry(
  rawInput: z.input<typeof inventoryEntrySchema>
) {
  const input = inventoryEntrySchema.parse(rawInput);
  const database = getDb();
  const now = new Date();
  const id = `${input.entryType}-${slugify(input.name)}-${now.getTime()}`;
  const perishabilitySuggestion = suggestPerishability({
    name: input.name,
    refrigerated: input.refrigerated,
  });

  if (input.entryType === "meal") {
    await database.insert(deliverableMeals).values({
      id,
      name: input.name,
      category: input.category ?? "hot_meal",
      quantityAvailable: input.quantity,
      allergenFlags: input.allergenFlags,
      dietaryTags: input.dietaryTags,
      refrigerated: input.refrigerated,
      unitLabel: input.unit,
      sourceNote: input.notes ?? input.sourceReference,
      lowStockThreshold: input.lowStockThreshold,
      createdAt: now,
      updatedAt: now,
    });

    return { entryType: "meal", id };
  }

  await database.insert(ingredientItems).values({
    id,
    name: input.name,
    quantity: input.quantity,
    unit: input.unit,
    refrigerated: input.refrigerated,
    perishabilityScore:
      input.perishabilityScore ?? perishabilitySuggestion.score,
    perishabilityLabel:
      input.perishabilityLabel ?? perishabilitySuggestion.label,
    sourceType: input.sourceType ?? "purchase",
    sourceReference: input.sourceReference,
    notes: input.notes ?? perishabilitySuggestion.reason,
    createdAt: now,
    updatedAt: now,
  });

  return { entryType: "ingredient", id };
}

export async function parseInventoryDocument(
  rawInput: z.input<typeof inventoryParseSchema>
) {
  const input = inventoryParseSchema.parse(rawInput);

  return parseReceiptInventoryDraft(input);
}

function buildPlannerRequests(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const stopsByRequestId = new Map(
    graph.stopRows.map((entry) => [entry.requestId, entry] as const)
  );
  const mealItemsByStopId = new Map<
    string,
    Array<typeof routeStopMealItems.$inferSelect>
  >();

  for (const item of graph.stopMealRows) {
    const items = mealItemsByStopId.get(item.routeStopId) ?? [];
    items.push(item);
    mealItemsByStopId.set(item.routeStopId, items);
  }

  return graph.requestRows.map((request) => {
    const client = clientById.get(request.clientId);
    const stop = stopsByRequestId.get(request.id);
    const requestedItems = stop
      ? (mealItemsByStopId.get(stop.id) ?? []).map((item) => ({
          mealId: item.mealId,
          quantity: item.quantity,
        }))
      : undefined;

    return {
      accessSummary:
        request.accessNotes ?? client?.accessNotes ?? "Standard door handoff.",
      addressLine: client
        ? `${client.addressLine1}, ${client.municipality}`
        : "Address pending",
      allergenFlags: request.allergenFlagsSnapshot,
      approvedAt: request.approvedAt,
      approvedMealCount: request.approvedMealCount,
      clientId: request.clientId,
      clientName: client
        ? compactName(client.firstName, client.lastName)
        : "Unknown neighbour",
      coldChainRequired: request.coldChainRequired,
      dietaryTags: request.dietaryTagsSnapshot,
      doNotEnter: client?.doNotEnter ?? false,
      dueBucket: request.dueBucket as TriageBucket,
      householdSize: request.householdSizeSnapshot,
      id: request.id,
      latitude: client?.latitude ?? null,
      longitude: client?.longitude ?? null,
      municipality: client?.municipality ?? "Victoria",
      neighborhood: client?.neighborhood,
      originalMessageExcerpt: request.originalMessageExcerpt,
      requestKind: request.requestKind,
      requestedItems,
      requiresTwoPerson: client?.requiresTwoPerson ?? false,
      routingHoldReason: request.routingHoldReason,
      safeToLeave: client?.safeToLeave ?? false,
      status: request.status,
      urgencyScore: request.urgencyScore,
      usesWheelchair: client?.usesWheelchair ?? false,
    } satisfies PlannerRequest;
  });
}

function sourceChannelForRequest(
  request: typeof deliveryRequests.$inferSelect,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const draft = request.sourceIntakeDraftId
    ? graph.draftRows.find((entry) => entry.id === request.sourceIntakeDraftId)
    : null;
  const intake = draft
    ? graph.intakeRows.find((entry) => entry.id === draft.intakeMessageId)
    : null;

  return intake?.channel ?? "manual_entry";
}

function buildPublicScopedPlannerRequests(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const plannerRequestsById = new Map(
    buildPlannerRequests(graph).map((entry) => [entry.id, entry] as const)
  );
  const scopedRequests: PublicScopedPlannerRequest[] = [];

  for (const request of graph.requestRows) {
    const plannerRequest = plannerRequestsById.get(request.id);

    if (!plannerRequest) {
      continue;
    }

    scopedRequests.push({
      ...plannerRequest,
      assignedRouteId: request.assignedRouteId,
      scheduledDate: request.scheduledDate,
      sourceChannel: sourceChannelForRequest(request, graph),
    });
  }

  return scopedRequests;
}

function getUnroutedPublicTodayRequests(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  return selectUnroutedPublicTodayRequests(
    buildPublicScopedPlannerRequests(graph),
    seedMetadata.baseDates
  );
}

function buildUnroutedPublicTodaySummary(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
): UnroutedPublicTodaySummary {
  const scopedRequests = getUnroutedPublicTodayRequests(graph);

  return {
    count: scopedRequests.length,
    mealCount: scopedRequests.reduce(
      (sum, request) => sum + request.approvedMealCount,
      0
    ),
    stops: scopedRequests.slice(0, 6).map((request) => ({
      address: request.addressLine,
      approvedAtLabel: formatTime(request.approvedAt),
      clientName: request.clientName,
      id: request.id,
      mealCount: request.approvedMealCount,
      urgency: `${request.urgencyScore}/100`,
    })),
  };
}

function publicBatchId() {
  return `${Date.now()}-${randomUUID().slice(0, 6)}`;
}

function publicPlannerInput(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>,
  batchId: string,
  idPrefix: string
) {
  return generateUnroutedPublicTodayRoutePlans({
    availability: graph.availabilityRows.map((entry) => ({
      date: entry.date,
      id: entry.id,
      minutesAvailable: entry.minutesAvailable,
      volunteerId: entry.volunteerId,
      windowEnd: entry.windowEnd,
      windowStart: entry.windowStart,
    })),
    baseDates: seedMetadata.baseDates,
    batchId,
    depots: graph.depotRows.map((entry) => ({
      id: entry.id,
      latitude: entry.latitude,
      longitude: entry.longitude,
      name: entry.name,
    })),
    idPrefix,
    meals: graph.mealRows.map((entry) => ({
      allergenFlags: entry.allergenFlags,
      dietaryTags: entry.dietaryTags,
      id: entry.id,
      name: entry.name,
      quantityAvailable: entry.quantityAvailable,
      refrigerated: entry.refrigerated,
      unitLabel: entry.unitLabel,
    })),
    requests: buildPublicScopedPlannerRequests(graph),
    vehicles: graph.vehicleRows
      .filter((entry) => entry.active)
      .map((entry) => ({
        capacityMeals: entry.capacityMeals,
        homeDepotId: entry.homeDepotId,
        id: entry.id,
        name: entry.name,
        refrigerated: entry.refrigerated,
        wheelchairLift: entry.wheelchairLift,
      })),
    volunteers: graph.volunteerRows.map((entry) => ({
      active: entry.active,
      canHandleColdChain: entry.canHandleColdChain,
      canHandleWheelchair: entry.canHandleWheelchair,
      firstName: entry.firstName,
      hasVehicleAccess: entry.hasVehicleAccess,
      id: entry.id,
      lastName: entry.lastName,
      preferredVehicleId: entry.preferredVehicleId,
    })),
  });
}

function publicRouteDriverOptions(
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const vehicleById = new Map(
    graph.vehicleRows.map((entry) => [entry.id, entry] as const)
  );

  return graph.volunteerRows
    .filter((entry) => entry.active && entry.hasVehicleAccess)
    .map((volunteer) => {
      const vehicle = volunteer.preferredVehicleId
        ? vehicleById.get(volunteer.preferredVehicleId)
        : null;

      return {
        id: volunteer.id,
        label: compactName(volunteer.firstName, volunteer.lastName),
        note: `${volunteer.homeArea} · ${vehicle?.name ?? "Personal vehicle"}`,
      } satisfies PublicRouteDriverOption;
    });
}

function routePlanWaypoints(
  plan: GeneratedRoutePlan,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  const depot = graph.depotRows.find((entry) => entry.id === plan.startDepotId);

  return [
    depot ? ([depot.longitude, depot.latitude] as const) : null,
    ...plan.stops.map((stop) => [stop.longitude, stop.latitude] as const),
  ].filter((entry): entry is RouteCoordinate => Boolean(entry));
}

async function publicPreviewPlan(
  plan: GeneratedRoutePlan,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>,
  index: number
): Promise<PublicRoutePreviewPlan> {
  const volunteer = graph.volunteerRows.find(
    (entry) => entry.id === plan.volunteerId
  );
  const vehicle = graph.vehicleRows.find(
    (entry) => entry.id === plan.vehicleId
  );
  const depot = graph.depotRows.find((entry) => entry.id === plan.startDepotId);
  const resolvedRoute = await resolveStreetRoute(
    routePlanWaypoints(plan, graph)
  );

  return {
    area: plan.areaLabel,
    depot: depot
      ? {
          latitude: depot.latitude,
          longitude: depot.longitude,
          name: depot.name,
        }
      : null,
    driveTime: formatRelativeMinutes(plan.plannedDriveMinutes),
    driver: {
      id: plan.volunteerId,
      name: volunteer
        ? compactName(volunteer.firstName, volunteer.lastName)
        : "Driver pending",
    },
    id: plan.id,
    index,
    name: plan.routeName,
    plannedDriveMinutes: plan.plannedDriveMinutes,
    plannedStopMinutes: plan.plannedStopMinutes,
    plannedTotalMinutes: plan.plannedTotalMinutes,
    routeFallbackReason: resolvedRoute.fallbackReason,
    routeLine: resolvedRoute.geometry,
    routingProvider: resolvedRoute.provider,
    stopCount: plan.stopCount,
    stops: plan.stops.map((stop) => ({
      accessSummary: stop.accessSummary,
      address: stop.addressLine,
      etaLabel: formatTime(stop.eta),
      id: stop.id,
      latitude: stop.latitude,
      longitude: stop.longitude,
      mealSummary: stop.mealSummary,
      name: stop.clientName,
    })),
    totalPlannedTime: formatRelativeMinutes(plan.plannedTotalMinutes),
    vehicle: {
      id: plan.vehicleId,
      name: vehicle?.name ?? "Vehicle pending",
    },
    warnings: plan.warnings,
  };
}

function applyPublicRouteAssignment(
  plan: GeneratedRoutePlan,
  volunteerId: string | undefined,
  graph: Awaited<ReturnType<typeof loadDemoGraph>>
) {
  if (!volunteerId || volunteerId === plan.volunteerId) {
    return plan;
  }

  const volunteer = graph.volunteerRows.find(
    (entry) =>
      entry.id === volunteerId && entry.active && entry.hasVehicleAccess
  );
  const vehicle = volunteer?.preferredVehicleId
    ? graph.vehicleRows.find(
        (entry) => entry.id === volunteer.preferredVehicleId && entry.active
      )
    : null;
  const depot = vehicle
    ? graph.depotRows.find((entry) => entry.id === vehicle.homeDepotId)
    : null;

  if (!volunteer || !vehicle || !depot) {
    return plan;
  }

  const plannedDriveMinutes = calculateRouteDriveMinutes(
    depot,
    plan.stops.map((stop) => ({
      latitude: stop.latitude,
      longitude: stop.longitude,
    }))
  );
  const plannedStopMinutes = plan.stops.length * 2;
  const plannedTotalMinutes = plannedDriveMinutes + plannedStopMinutes;
  const warnings = [
    ...plan.warnings.filter(
      (warning) => !/Route must be split before assignment/i.test(warning)
    ),
    plannedTotalMinutes > PUBLIC_ROUTE_MAX_TOTAL_MINUTES
      ? "Route must be split before assignment because it exceeds 3 hours."
      : null,
  ].filter(Boolean) as string[];

  return {
    ...plan,
    capacityUtilizationPercent: Math.min(
      100,
      Math.round((plannedTotalMinutes / PUBLIC_ROUTE_MAX_TOTAL_MINUTES) * 100)
    ),
    plannedDriveMinutes,
    plannedStopMinutes,
    plannedTotalMinutes,
    startDepotId: depot.id,
    vehicleId: vehicle.id,
    volunteerId: volunteer.id,
    warnings,
  } satisfies GeneratedRoutePlan;
}

function routePlanToInsert(
  plan: GeneratedRoutePlan,
  now: Date,
  resolvedRoute?: ResolvedRoute,
  waypointHash?: string
) {
  return {
    id: plan.id,
    routeName: plan.routeName,
    areaLabel: plan.areaLabel,
    serviceDate: plan.serviceDate,
    volunteerId: plan.volunteerId,
    vehicleId: plan.vehicleId,
    startDepotId: plan.startDepotId,
    status: plan.status,
    plannedDriveMinutes: plan.plannedDriveMinutes,
    plannedStopMinutes: plan.plannedStopMinutes,
    plannedTotalMinutes: plan.plannedTotalMinutes,
    stopCount: plan.stopCount,
    deliveredCount: 0,
    remainingCount: plan.stopCount,
    capacityUtilizationPercent: plan.capacityUtilizationPercent,
    routeExplanation: plan.routeExplanation,
    warnings: plan.warnings,
    routeDirections: resolvedRoute?.segments,
    routeDistanceMeters: resolvedRoute?.distanceMeters,
    routeDurationSeconds: resolvedRoute?.durationSeconds,
    routeFallbackReason: resolvedRoute?.fallbackReason,
    routeGeometry: resolvedRoute?.geometry,
    routedAt: resolvedRoute ? now : undefined,
    routingProvider: resolvedRoute?.provider,
    routingWaypointHash: waypointHash,
    lastActivityAt: now,
    createdAt: now,
    updatedAt: now,
  } satisfies typeof routes.$inferInsert;
}

export async function previewUnroutedPublicTodayRoutes(
  options: {
    batchId?: string;
  } = {}
): Promise<PublicRoutePreview> {
  const graph = await loadDemoGraph();
  const batchId = options.batchId ?? publicBatchId();
  const result = publicPlannerInput(graph, batchId, "route-public-preview");
  const plannerRequestById = new Map(
    result.scopedRequests.map((request) => [request.id, request] as const)
  );
  const plans = await Promise.all(
    result.plans.map((plan, index) => publicPreviewPlan(plan, graph, index))
  );

  return {
    batchId,
    driverOptions: publicRouteDriverOptions(graph),
    excludedRequests: result.excludedRequests.map((exclusion) => ({
      clientName:
        plannerRequestById.get(exclusion.requestId)?.clientName ??
        "Unknown neighbour",
      reason: exclusion.reason,
      requestId: exclusion.requestId,
    })),
    maxRouteMinutes: PUBLIC_ROUTE_MAX_TOTAL_MINUTES,
    plans,
    splitCount: result.splitCount,
    stopCount: result.scopedRequests.length,
    unrouted: buildUnroutedPublicTodaySummary(graph),
  };
}

export async function commitUnroutedPublicTodayRoutes(
  rawInput: z.input<typeof publicRouteCommitSchema> = {}
): Promise<RouteGenerationSummary> {
  const input = publicRouteCommitSchema.parse(rawInput);
  const database = getDb();
  const graph = await loadDemoGraph();
  const now = new Date();
  const batchId = input.batchId ?? publicBatchId();
  const result = publicPlannerInput(graph, batchId, "route-public");
  const plannerRequestById = new Map(
    result.scopedRequests.map((request) => [request.id, request] as const)
  );
  const assignmentByRouteIndex = new Map(
    input.assignments.map((assignment) => [
      assignment.routeIndex,
      assignment.volunteerId,
    ])
  );
  const plans = result.plans.map((plan, index) =>
    applyPublicRouteAssignment(plan, assignmentByRouteIndex.get(index), graph)
  );
  const resolvedByRouteId = new Map<
    string,
    { route: ResolvedRoute; waypointHash: string }
  >();

  for (const plan of plans) {
    const waypoints = routePlanWaypoints(plan, graph);
    resolvedByRouteId.set(plan.id, {
      route: await resolveStreetRoute(waypoints),
      waypointHash: getRoutingWaypointHash(waypoints),
    });
  }

  if (plans.length > 0) {
    await database.insert(routes).values(
      plans.map((plan) => {
        const resolved = resolvedByRouteId.get(plan.id);

        return routePlanToInsert(
          plan,
          now,
          resolved?.route,
          resolved?.waypointHash
        );
      })
    );
  }

  const stopInserts = plans.flatMap((plan) =>
    plan.stops.map((stop) => ({
      id: `stop-${plan.id.replace(/^route-public-/, "")}-${stop.sequence}`,
      routeId: plan.id,
      requestId: stop.requestId,
      clientId: stop.clientId,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
      addressLine: stop.addressLine,
      eta: stop.eta,
      mealSummary: stop.mealSummary,
      itemSummary: stop.itemSummary,
      accessSummary: stop.accessSummary,
      originalMessageExcerpt: stop.originalMessageExcerpt,
      dueBucketOrigin: stop.dueBucketOrigin,
      status: stop.sequence === 1 ? ("ready" as const) : ("planned" as const),
      createdAt: now,
      updatedAt: now,
    }))
  );
  const stopIdByRequestId = new Map(
    stopInserts.map((stop) => [stop.requestId, stop.id] as const)
  );
  const mealItemInserts = plans.flatMap((plan) =>
    plan.stops.flatMap((stop) =>
      stop.mealItems.map((item) => ({
        id: `${stopIdByRequestId.get(stop.requestId)}-${item.mealId}`,
        routeStopId: stopIdByRequestId.get(stop.requestId) ?? stop.id,
        mealId: item.mealId,
        mealNameSnapshot: item.mealNameSnapshot,
        quantity: item.quantity,
        dietaryTags: item.dietaryTags,
        allergenFlags: item.allergenFlags,
        refrigerated: item.refrigerated,
        createdAt: now,
        updatedAt: now,
      }))
    )
  );

  if (stopInserts.length > 0) {
    await database.insert(routeStops).values(stopInserts);
  }

  if (mealItemInserts.length > 0) {
    await database.insert(routeStopMealItems).values(mealItemInserts);
  }

  for (const plan of plans) {
    for (const stop of plan.stops) {
      await database
        .update(deliveryRequests)
        .set({
          assignedRouteId: plan.id,
          assignedStopSequence: stop.sequence,
          routingHoldReason: null,
          scheduledDate: plan.serviceDate,
          status: "assigned",
          updatedAt: now,
        })
        .where(eq(deliveryRequests.id, stop.requestId));
    }
  }

  for (const exclusion of result.excludedRequests) {
    await database
      .update(deliveryRequests)
      .set({
        routingHoldReason: exclusion.reason,
        updatedAt: now,
      })
      .where(eq(deliveryRequests.id, exclusion.requestId));
  }

  return {
    excludedRequests: result.excludedRequests.map((exclusion) => ({
      clientName:
        plannerRequestById.get(exclusion.requestId)?.clientName ??
        "Unknown neighbour",
      reason: exclusion.reason,
      requestId: exclusion.requestId,
    })),
    routeCount: plans.length,
    routeIds: plans.map((plan) => plan.id),
    routeNames: plans.map((plan) => plan.routeName),
    stopCount: plans.reduce((sum, plan) => sum + plan.stopCount, 0),
    unroutedPublicToday: buildUnroutedPublicTodaySummary(await loadDemoGraph()),
  };
}

export async function generateRoutes(): Promise<RouteGenerationSummary> {
  const database = getDb();
  const graph = await loadDemoGraph();
  const now = new Date();
  const plannerRequests = buildPlannerRequests(graph);
  const requestById = new Map(
    plannerRequests.map((request) => [request.id, request] as const)
  );
  const result = generateRoutePlans({
    availability: graph.availabilityRows.map((entry) => ({
      date: entry.date,
      id: entry.id,
      minutesAvailable: entry.minutesAvailable,
      volunteerId: entry.volunteerId,
      windowEnd: entry.windowEnd,
      windowStart: entry.windowStart,
    })),
    baseDates: seedMetadata.baseDates,
    depots: graph.depotRows.map((entry) => ({
      id: entry.id,
      latitude: entry.latitude,
      longitude: entry.longitude,
      name: entry.name,
    })),
    meals: graph.mealRows.map((entry) => ({
      allergenFlags: entry.allergenFlags,
      dietaryTags: entry.dietaryTags,
      id: entry.id,
      name: entry.name,
      quantityAvailable: entry.quantityAvailable,
      refrigerated: entry.refrigerated,
      unitLabel: entry.unitLabel,
    })),
    requests: plannerRequests,
    vehicles: graph.vehicleRows
      .filter((entry) => entry.active)
      .map((entry) => ({
        capacityMeals: entry.capacityMeals,
        homeDepotId: entry.homeDepotId,
        id: entry.id,
        name: entry.name,
        refrigerated: entry.refrigerated,
        wheelchairLift: entry.wheelchairLift,
      })),
    volunteers: graph.volunteerRows.map((entry) => ({
      active: entry.active,
      canHandleColdChain: entry.canHandleColdChain,
      canHandleWheelchair: entry.canHandleWheelchair,
      firstName: entry.firstName,
      hasVehicleAccess: entry.hasVehicleAccess,
      id: entry.id,
      lastName: entry.lastName,
      preferredVehicleId: entry.preferredVehicleId,
    })),
  });

  await database.delete(driverSessions);
  await database.delete(routeStopMealItems);
  await database.delete(routeStops);
  await database.delete(routes);

  for (const request of graph.requestRows) {
    if (
      ["assigned", "out_for_delivery", "delivered"].includes(request.status)
    ) {
      await database
        .update(deliveryRequests)
        .set({
          assignedRouteId: null,
          assignedStopSequence: null,
          routingHoldReason: null,
          status: request.status === "delivered" ? "delivered" : "approved",
          updatedAt: now,
        })
        .where(eq(deliveryRequests.id, request.id));
    }
  }

  if (result.plans.length > 0) {
    await database
      .insert(routes)
      .values(result.plans.map((plan) => routePlanToInsert(plan, now)));
  }

  const stopInserts = result.plans.flatMap((plan) =>
    plan.stops.map((stop) => ({
      id: stop.id,
      routeId: plan.id,
      requestId: stop.requestId,
      clientId: stop.clientId,
      sequence: stop.sequence,
      latitude: stop.latitude,
      longitude: stop.longitude,
      addressLine: stop.addressLine,
      eta: stop.eta,
      mealSummary: stop.mealSummary,
      itemSummary: stop.itemSummary,
      accessSummary: stop.accessSummary,
      originalMessageExcerpt: stop.originalMessageExcerpt,
      dueBucketOrigin: stop.dueBucketOrigin,
      status: stop.sequence === 1 ? ("ready" as const) : ("planned" as const),
      createdAt: now,
      updatedAt: now,
    }))
  );
  const mealItemInserts = result.plans.flatMap((plan) =>
    plan.stops.flatMap((stop) =>
      stop.mealItems.map((item) => ({
        id: `${stop.id}-${item.mealId}`,
        routeStopId: stop.id,
        mealId: item.mealId,
        mealNameSnapshot: item.mealNameSnapshot,
        quantity: item.quantity,
        dietaryTags: item.dietaryTags,
        allergenFlags: item.allergenFlags,
        refrigerated: item.refrigerated,
        createdAt: now,
        updatedAt: now,
      }))
    )
  );

  if (stopInserts.length > 0) {
    await database.insert(routeStops).values(stopInserts);
  }

  if (mealItemInserts.length > 0) {
    await database.insert(routeStopMealItems).values(mealItemInserts);
  }

  for (const plan of result.plans) {
    for (const stop of plan.stops) {
      await database
        .update(deliveryRequests)
        .set({
          assignedRouteId: plan.id,
          assignedStopSequence: stop.sequence,
          routingHoldReason:
            stop.dueBucketOrigin === "today"
              ? null
              : "Pulled forward because the stop fit the same route cluster.",
          scheduledDate: plan.serviceDate,
          status: "assigned",
          updatedAt: now,
        })
        .where(eq(deliveryRequests.id, stop.requestId));
    }
  }

  for (const exclusion of result.excludedRequests) {
    const request = requestById.get(exclusion.requestId);

    if (!request) {
      continue;
    }

    await database
      .update(deliveryRequests)
      .set({
        routingHoldReason: exclusion.reason,
        status: request.dueBucket === "today" ? "held" : request.status,
        updatedAt: now,
      })
      .where(eq(deliveryRequests.id, exclusion.requestId));
  }

  return {
    excludedRequests: result.excludedRequests.map((exclusion) => ({
      clientName:
        requestById.get(exclusion.requestId)?.clientName ?? "Unknown neighbour",
      reason: exclusion.reason,
      requestId: exclusion.requestId,
    })),
    routeCount: result.plans.length,
    routeNames: result.plans.map((plan) => plan.routeName),
    stopCount: result.plans.reduce((sum, plan) => sum + plan.stopCount, 0),
  };
}

function isSessionLost(session: typeof driverSessions.$inferSelect, now: Date) {
  return now.getTime() - session.lastSeenAt.getTime() > ANCHOR_STALE_AFTER_MS;
}

async function electRouteAnchor(routeId: string, now: Date) {
  const database = getDb();
  const activeSessions = await database
    .select()
    .from(driverSessions)
    .where(
      and(
        eq(driverSessions.routeId, routeId),
        eq(driverSessions.status, "active")
      )
    );
  const currentAnchor = activeSessions.find((session) => session.isAnchor);

  if (currentAnchor && !isSessionLost(currentAnchor, now)) {
    await database
      .update(routes)
      .set({
        dashboardAnchorSessionId: currentAnchor.id,
        lastActivityAt: now,
        status: "in_progress",
        updatedAt: now,
      })
      .where(eq(routes.id, routeId));

    return currentAnchor;
  }

  for (const session of activeSessions.filter((entry) =>
    isSessionLost(entry, now)
  )) {
    await database
      .update(driverSessions)
      .set({
        isAnchor: false,
        status: "stale",
        updatedAt: now,
      })
      .where(eq(driverSessions.id, session.id));
  }

  const nextAnchor = activeSessions
    .filter((session) => !isSessionLost(session, now))
    .sort(
      (left, right) =>
        left.startedAt.getTime() - right.startedAt.getTime() ||
        left.id.localeCompare(right.id)
    )[0];

  await database
    .update(driverSessions)
    .set({
      isAnchor: false,
      updatedAt: now,
    })
    .where(eq(driverSessions.routeId, routeId));

  if (!nextAnchor) {
    await database
      .update(routes)
      .set({
        dashboardAnchorSessionId: null,
        lastActivityAt: now,
        updatedAt: now,
      })
      .where(eq(routes.id, routeId));

    return null;
  }

  const [updatedAnchor] = await database
    .update(driverSessions)
    .set({
      isAnchor: true,
      updatedAt: now,
    })
    .where(eq(driverSessions.id, nextAnchor.id))
    .returning();

  await database
    .update(routes)
    .set({
      dashboardAnchorSessionId: nextAnchor.id,
      lastActivityAt: now,
      status: "in_progress",
      updatedAt: now,
    })
    .where(eq(routes.id, routeId));

  return updatedAnchor ?? nextAnchor;
}

export async function startDriverSession(
  rawInput: z.input<typeof driverSessionStartSchema>
) {
  const input = driverSessionStartSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();
  const [route] = await database
    .select()
    .from(routes)
    .where(eq(routes.id, input.routeId));

  if (!route) {
    throw new Error(`Route ${input.routeId} was not found.`);
  }

  const [depot] = await database
    .select()
    .from(depots)
    .where(eq(depots.id, route.startDepotId));

  const matchingSessions = await database
    .select()
    .from(driverSessions)
    .where(
      and(
        eq(driverSessions.routeId, input.routeId),
        eq(driverSessions.deviceFingerprint, input.deviceFingerprint),
        eq(driverSessions.status, "active")
      )
    );
  const existingSession = matchingSessions
    .filter((session) => !isSessionLost(session, now))
    .sort(
      (left, right) =>
        right.lastSeenAt.getTime() - left.lastSeenAt.getTime() ||
        right.startedAt.getTime() - left.startedAt.getTime() ||
        right.id.localeCompare(left.id)
    )[0];

  if (existingSession) {
    const [session] = await database
      .update(driverSessions)
      .set({
        currentLat: input.currentLat ?? existingSession.currentLat,
        currentLng: input.currentLng ?? existingSession.currentLng,
        lastSeenAt: now,
        updatedAt: now,
      })
      .where(eq(driverSessions.id, existingSession.id))
      .returning();
    const anchor = await electRouteAnchor(input.routeId, now);

    return {
      ...(session ?? existingSession),
      isAnchor: anchor?.id === existingSession.id,
    };
  }

  const fingerprintSlug = slugify(input.deviceFingerprint).slice(0, 24);
  const sessionId = `session-${fingerprintSlug || "device"}-${now.getTime()}-${randomUUID().slice(0, 8)}`;
  const [session] = await database
    .insert(driverSessions)
    .values({
      id: sessionId,
      routeId: input.routeId,
      volunteerId: input.volunteerId,
      deviceFingerprint: input.deviceFingerprint,
      currentLat: input.currentLat ?? depot?.latitude,
      currentLng: input.currentLng ?? depot?.longitude,
      isAnchor: false,
      status: "active",
      startedAt: now,
      lastSeenAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  const anchor = await electRouteAnchor(input.routeId, now);

  return {
    ...session,
    isAnchor: anchor?.id === session.id,
  };
}

export async function heartbeatDriverSession(
  rawInput: z.input<typeof driverHeartbeatSchema>
) {
  const input = driverHeartbeatSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();

  const [existingSession] = await database
    .select()
    .from(driverSessions)
    .where(eq(driverSessions.id, input.sessionId));

  if (!existingSession) {
    throw new Error(`Driver session ${input.sessionId} was not found.`);
  }

  if (existingSession.status !== "active") {
    throw new Error(`Driver session ${input.sessionId} is not active.`);
  }

  const [session] = await database
    .update(driverSessions)
    .set({
      currentLat: input.currentLat,
      currentLng: input.currentLng,
      currentStopIndex: input.currentStopIndex,
      deliveredCountLocal: input.deliveredCountLocal,
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(driverSessions.id, input.sessionId))
    .returning();

  if (!session) {
    throw new Error(`Driver session ${input.sessionId} was not found.`);
  }

  const anchor = await electRouteAnchor(session.routeId, now);

  if (anchor?.id === session.id) {
    const [route] = await database
      .select()
      .from(routes)
      .where(eq(routes.id, session.routeId));
    const deliveredCount = Math.min(
      input.deliveredCountLocal,
      route?.stopCount ?? input.deliveredCountLocal
    );
    const completedCount = Math.min(
      input.currentStopIndex,
      route?.stopCount ?? input.currentStopIndex
    );

    await database
      .update(routes)
      .set({
        deliveredCount,
        remainingCount: sql`${routes.stopCount} - ${completedCount}`,
        lastActivityAt: now,
        status: "in_progress",
        updatedAt: now,
      })
      .where(eq(routes.id, session.routeId));
  }

  return {
    ...session,
    isAnchor: anchor?.id === session.id,
  };
}

export async function endDriverSession(
  rawInput: z.input<typeof driverSessionEndSchema>
) {
  const input = driverSessionEndSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();

  const [existingSession] = await database
    .select()
    .from(driverSessions)
    .where(eq(driverSessions.id, input.sessionId));

  if (!existingSession) {
    throw new Error(`Driver session ${input.sessionId} was not found.`);
  }

  if (existingSession.status !== "active") {
    return {
      ...existingSession,
      isAnchor: false,
    };
  }

  const [session] = await database
    .update(driverSessions)
    .set({
      isAnchor: false,
      status: "stale",
      updatedAt: now,
    })
    .where(eq(driverSessions.id, input.sessionId))
    .returning();

  await electRouteAnchor(existingSession.routeId, now);

  return {
    ...(session ?? existingSession),
    isAnchor: false,
  };
}

export async function completeDriverStop(
  rawInput: z.input<typeof driverStopCompleteSchema>
) {
  const input = driverStopCompleteSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();

  const [session] = await database
    .select()
    .from(driverSessions)
    .where(eq(driverSessions.id, input.sessionId));

  if (!session) {
    throw new Error(`Driver session ${input.sessionId} was not found.`);
  }

  if (session.status !== "active") {
    throw new Error(`Driver session ${input.sessionId} is not active.`);
  }

  const deliveredCountLocal =
    input.status === "delivered"
      ? session.deliveredCountLocal + 1
      : session.deliveredCountLocal;
  const currentStopIndex = session.currentStopIndex + 1;
  const anchor = await electRouteAnchor(session.routeId, now);

  await database
    .update(driverSessions)
    .set({
      currentStopIndex,
      deliveredCountLocal,
      lastSeenAt: now,
      updatedAt: now,
    })
    .where(eq(driverSessions.id, session.id));

  if (anchor?.id !== session.id) {
    const [localStop] = await database
      .select()
      .from(routeStops)
      .where(
        and(
          eq(routeStops.id, input.stopId),
          eq(routeStops.routeId, session.routeId)
        )
      );

    if (!localStop) {
      throw new Error(`Route stop ${input.stopId} was not found.`);
    }

    return localStop;
  }

  const [updatedStop] = await database
    .update(routeStops)
    .set({
      status: input.status === "delivered" ? "delivered" : "could_not_deliver",
      deliveredAt: input.status === "delivered" ? now : undefined,
      updatedAt: now,
    })
    .where(eq(routeStops.id, input.stopId))
    .returning();

  if (!updatedStop) {
    throw new Error(`Route stop ${input.stopId} was not found.`);
  }

  const stopProgress = await database
    .select({
      completedCount: sql<number>`count(*) filter (where ${routeStops.status} in ('delivered', 'could_not_deliver', 'skipped'))`,
      deliveredCount: sql<number>`count(*) filter (where ${routeStops.status} = 'delivered')`,
    })
    .from(routeStops)
    .where(eq(routeStops.routeId, session.routeId));

  const deliveredCount = Number(stopProgress[0]?.deliveredCount ?? 0);
  const completedCount = Number(stopProgress[0]?.completedCount ?? 0);

  await database
    .update(routes)
    .set({
      deliveredCount,
      remainingCount: sql`${routes.stopCount} - ${completedCount}`,
      lastActivityAt: now,
      status: "in_progress",
      updatedAt: now,
    })
    .where(eq(routes.id, session.routeId));

  return updatedStop;
}

export async function resetRouteSession(
  rawInput: z.input<typeof routeResetSchema>
) {
  const input = routeResetSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();
  const [route] = await database
    .select()
    .from(routes)
    .where(eq(routes.id, input.routeId));

  if (!route) {
    throw new Error(`Route ${input.routeId} was not found.`);
  }

  await database
    .update(driverSessions)
    .set({
      isAnchor: false,
      status: "reset",
      updatedAt: now,
    })
    .where(eq(driverSessions.routeId, input.routeId));

  await database
    .update(routeStops)
    .set({
      deliveredAt: null,
      status: "planned",
      updatedAt: now,
    })
    .where(eq(routeStops.routeId, input.routeId));

  await database
    .update(routes)
    .set({
      dashboardAnchorSessionId: null,
      deliveredCount: 0,
      remainingCount: route.stopCount,
      status: "reset",
      lastActivityAt: now,
      updatedAt: now,
    })
    .where(eq(routes.id, input.routeId));

  return {
    ok: true,
    routeId: input.routeId,
    resetAt: now,
  };
}

export async function approveRoute(
  rawInput: z.input<typeof routeApproveSchema>
) {
  const input = routeApproveSchema.parse(rawInput);
  const database = getDb();
  const now = new Date();
  const [route] = await database
    .select()
    .from(routes)
    .where(eq(routes.id, input.routeId));

  if (!route) {
    throw new Error(`Route ${input.routeId} was not found.`);
  }

  await database
    .update(driverSessions)
    .set({
      isAnchor: false,
      status: "reset",
      updatedAt: now,
    })
    .where(eq(driverSessions.routeId, input.routeId));

  await database
    .update(routeStops)
    .set({
      deliveredAt: null,
      status: sql`case when ${routeStops.sequence} = 1 then 'ready'::route_stop_status else 'planned'::route_stop_status end`,
      updatedAt: now,
    })
    .where(eq(routeStops.routeId, input.routeId));

  const [approvedRoute] = await database
    .update(routes)
    .set({
      dashboardAnchorSessionId: null,
      deliveredCount: 0,
      lastActivityAt: now,
      remainingCount: route.stopCount,
      status: "approved",
      updatedAt: now,
    })
    .where(eq(routes.id, input.routeId))
    .returning();

  return {
    approvedAt: now,
    routeId: input.routeId,
    status: approvedRoute?.status ?? "approved",
  };
}

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  const graph = await loadDemoGraph();
  const now = new Date();
  const routeSummaries = buildRouteSummaries(graph);
  const requestBuckets = buildTriageBuckets(graph);
  const pendingDrafts = graph.draftRows.filter(
    (entry) => entry.status === "pending"
  );
  const approvedToday = graph.requestRows.filter(
    (entry) =>
      entry.scheduledDate === seedMetadata.baseDates.today &&
      ["approved", "assigned", "out_for_delivery", "delivered"].includes(
        entry.status
      )
  ).length;
  const readyRoutes = graph.routeRows.filter((entry) =>
    ["approved", "in_progress", "planned"].includes(entry.status)
  );
  const mealsAvailable = graph.mealRows.reduce(
    (sum, meal) => sum + meal.quantityAvailable,
    0
  );
  const refrigeratedMeals = graph.mealRows.filter(
    (meal) => meal.refrigerated
  ).length;
  const activeDriverSessionCount = graph.sessionRows.filter(
    (session) => session.status === "active" && !isSessionLost(session, now)
  ).length;

  return {
    attentionNotes: [
      ...graph.requestRows
        .filter((entry) => entry.status === "held" && entry.routingHoldReason)
        .slice(0, 3)
        .map((entry) => entry.routingHoldReason as string),
    ],
    dashboardKpis: [
      {
        id: "new-intake",
        label: "New intake",
        value: String(pendingDrafts.length),
        note: `${pendingDrafts.filter((entry) => entry.draftType === "request").length} requests, ${pendingDrafts.filter((entry) => entry.draftType === "volunteer").length} volunteer drafts`,
        icon: "notification-bell",
        tone: "warning",
      },
      {
        id: "ready-today",
        label: "Ready today",
        value: String(approvedToday),
        note: `${graph.requestRows.filter((entry) => entry.status === "held").length} held for review`,
        icon: "checklist",
        tone: "success",
      },
      {
        id: "routes-ready",
        label: "Routes ready",
        value: String(readyRoutes.length),
        note: `${activeDriverSessionCount} active now`,
        icon: "route-road",
        tone: "info",
      },
      {
        id: "meals-staged",
        label: "Meals ready",
        value: String(mealsAvailable),
        note: `${refrigeratedMeals} items need refrigeration`,
        icon: "grocery-bag",
        tone: "neutral",
      },
    ],
    inventoryMeals: graph.mealRows
      .slice()
      .sort((left, right) => left.quantityAvailable - right.quantityAvailable)
      .slice(0, 3)
      .map((meal) => ({
        name: meal.name,
        category: meal.category.replace(/_/g, " "),
        quantity: String(meal.quantityAvailable),
        tags: [
          ...(meal.refrigerated ? ["Fridge"] : ["Shelf stable"]),
          ...meal.dietaryTags
            .slice(0, 1)
            .map((entry) => entry.replace(/_/g, " ")),
        ],
      })),
    liveMarkers: buildLiveMarkers(
      graph.routeRows,
      graph.stopRows,
      graph.sessionRows,
      graph.volunteerRows,
      graph.depotRows
    ),
    requestBuckets,
    routeLine: await buildRoutePath(
      graph.routeRows.find((entry) => entry.status === "in_progress")?.id ??
        graph.routeRows[0]?.id,
      graph.depotRows,
      graph.routeRows,
      graph.stopRows
    ),
    routeSummaries,
  };
}

export async function getAdminInboxData(
  selectedDraftId?: string | null
): Promise<AdminInboxData> {
  const graph = await loadDemoGraph();
  const queue = graph.draftRows
    .filter((entry) => {
      const intake = graph.intakeRows.find(
        (intakeRow) => intakeRow.id === entry.intakeMessageId
      );

      return entry.status === "pending" && intake?.status !== "ignored";
    })
    .sort((left, right) => {
      const leftIntake = graph.intakeRows.find(
        (entry) => entry.id === left.intakeMessageId
      );
      const rightIntake = graph.intakeRows.find(
        (entry) => entry.id === right.intakeMessageId
      );

      return (
        (rightIntake?.receivedAt?.getTime?.() ?? 0) -
        (leftIntake?.receivedAt?.getTime?.() ?? 0)
      );
    });

  const selectedDraft =
    queue.find((entry) => entry.id === selectedDraftId) ?? queue[0];
  const selectedIntake = graph.intakeRows.find(
    (entry) => entry.id === selectedDraft?.intakeMessageId
  );
  const requestPayload =
    selectedDraft?.draftType === "request"
      ? requestIntakeSchema.safeParse(selectedDraft.structuredPayload)
      : null;
  const volunteerPayload =
    selectedDraft?.draftType === "volunteer"
      ? volunteerIntakeSchema.safeParse(selectedDraft.structuredPayload)
      : null;
  const parsedRequest =
    requestPayload?.success === true ? requestPayload.data : null;
  const parsedVolunteer =
    volunteerPayload?.success === true ? volunteerPayload.data : null;
  const latestRequestByClient = new Map<
    string,
    typeof deliveryRequests.$inferSelect
  >();
  const activeAvailabilityByVolunteer = new Map<
    string,
    typeof volunteerAvailability.$inferSelect
  >();

  for (const request of graph.requestRows) {
    const existing = latestRequestByClient.get(request.clientId);

    if (
      !existing ||
      request.updatedAt.getTime() > existing.updatedAt.getTime()
    ) {
      latestRequestByClient.set(request.clientId, request);
    }
  }

  for (const availability of graph.availabilityRows) {
    const existing = activeAvailabilityByVolunteer.get(
      availability.volunteerId
    );

    if (
      !existing ||
      availability.date.localeCompare(existing.date) < 0 ||
      availability.windowStart.localeCompare(existing.windowStart) < 0
    ) {
      activeAvailabilityByVolunteer.set(availability.volunteerId, availability);
    }
  }

  return {
    directoryRows: [
      ...graph.clientRows.map((client) => {
        const request = latestRequestByClient.get(client.id);
        const mealCount =
          request?.approvedMealCount ??
          request?.requestedMealCount ??
          client.householdSize;
        const foodNotes = formatFoodConstraintsForReview({
          allergenFlags: client.allergenFlags,
          dietaryTags: client.dietaryTags,
        });
        const notes = [
          foodNotes === "None" ? null : foodNotes,
          client.accessNotes,
        ].filter(Boolean);

        return {
          id: client.id,
          location: `${client.addressLine1}, ${client.municipality}`,
          measure: `${mealCount} ${mealCount === 1 ? "meal" : "meals"}`,
          name: compactName(client.firstName, client.lastName),
          notes: notes.join(", "),
          role: "client" as const,
          status: request
            ? (requestStatusLabels[
                request.status as TriageRequestCard["status"]
              ] ?? request.status.replace(/_/g, " "))
            : client.active
              ? "Active"
              : "Inactive",
        };
      }),
      ...graph.volunteerRows.map((volunteer) => {
        const availability = activeAvailabilityByVolunteer.get(volunteer.id);
        const notes = [
          volunteer.hasVehicleAccess ? "Has vehicle" : "Pair with driver",
          volunteer.canHandleColdChain ? "Can carry cooler" : null,
          volunteer.canHandleWheelchair ? "Lift support" : null,
        ].filter(Boolean);

        return {
          availabilityDays: availability
            ? formatAvailabilityDays({
                date: availability.date,
                recurringRule: availability.recurringRule,
              })
            : undefined,
          availabilityDuration: availability
            ? `${formatRelativeMinutes(availability.minutesAvailable)} available`
            : undefined,
          availabilityWindow: availability
            ? `${availability.windowStart}-${availability.windowEnd}`
            : undefined,
          id: volunteer.id,
          location: volunteer.homeArea,
          measure: availability
            ? `${formatRelativeMinutes(availability.minutesAvailable)}, ${availability.windowStart}-${availability.windowEnd}`
            : volunteer.active
              ? "Open"
              : "Inactive",
          name: compactName(volunteer.firstName, volunteer.lastName),
          notes: notes.join(", "),
          role: "driver" as const,
          status: availability
            ? `${formatRelativeMinutes(availability.minutesAvailable)} available`
            : volunteer.active
              ? "Active"
              : "Inactive",
        };
      }),
    ].sort(
      (left, right) =>
        left.role.localeCompare(right.role) ||
        left.name.localeCompare(right.name)
    ),
    inboxItems: queue.map((draft) => {
      const intake = graph.intakeRows.find(
        (entry) => entry.id === draft.intakeMessageId
      );
      const queueRequestPayload =
        draft.draftType === "request"
          ? requestIntakeSchema.safeParse(draft.structuredPayload)
          : null;
      const queueVolunteerPayload =
        draft.draftType === "volunteer"
          ? volunteerIntakeSchema.safeParse(draft.structuredPayload)
          : null;
      const address =
        queueRequestPayload?.success === true
          ? formatAddressWithMunicipality(
              queueRequestPayload.data.addressLine1,
              queueRequestPayload.data.municipality,
              queueRequestPayload.data.addressLine2
            )
          : queueVolunteerPayload?.success === true
            ? `${queueVolunteerPayload.data.homeArea}, ${queueVolunteerPayload.data.homeMunicipality}`
            : (intake?.rawAddress ?? "Address pending");
      const displayName =
        queueRequestPayload?.success === true
          ? [
              queueRequestPayload.data.firstName,
              queueRequestPayload.data.lastName,
            ]
              .filter(Boolean)
              .join(" ")
          : queueVolunteerPayload?.success === true
            ? [
                queueVolunteerPayload.data.firstName,
                queueVolunteerPayload.data.lastName,
              ]
                .filter(Boolean)
                .join(" ")
            : (intake?.senderName ?? "Unknown sender");
      const isParsing =
        draft.parserVersion === PUBLIC_FORM_PARSING_VERSION ||
        intake?.status === "pending_review";
      const snippet =
        intake?.channel === "public_form"
          ? (publicFormNote(intake) ?? draft.summary)
          : (intake?.rawBody ?? draft.summary);

      return {
        id: draft.id,
        channel: intake?.channel === "gmail" ? "gmail" : "form",
        draftType:
          draft.draftType === "request" || draft.draftType === "volunteer"
            ? draft.draftType
            : "other",
        subject: intake?.subject ?? draft.summary,
        sender: displayName || intake?.senderName || "Unknown sender",
        address,
        isParsing,
        snippet: snippet.slice(0, 90),
      } satisfies InboxQueueItem;
    }),
    selectedItem: {
      draftId: selectedDraft?.id ?? null,
      draftType:
        selectedDraft?.draftType === "request" ||
        selectedDraft?.draftType === "volunteer"
          ? selectedDraft.draftType
          : "other",
      sender: parsedRequest
        ? [parsedRequest.firstName, parsedRequest.lastName]
            .filter(Boolean)
            .join(" ")
        : parsedVolunteer
          ? [parsedVolunteer.firstName, parsedVolunteer.lastName]
              .filter(Boolean)
              .join(" ")
          : (selectedIntake?.senderName ?? "Unknown sender"),
      receivedLabel: formatTime(selectedIntake?.receivedAt),
      address:
        parsedRequest?.addressLine1 && parsedRequest?.municipality
          ? formatAddressWithMunicipality(
              parsedRequest.addressLine1,
              parsedRequest.municipality,
              parsedRequest.addressLine2
            )
          : parsedVolunteer?.homeArea && parsedVolunteer?.homeMunicipality
            ? `${parsedVolunteer.homeArea}, ${parsedVolunteer.homeMunicipality}`
            : (selectedIntake?.rawAddress ?? "Address pending"),
      contact: parsedRequest
        ? selectedContact(parsedRequest)
        : parsedVolunteer
          ? selectedContact(parsedVolunteer)
          : (selectedIntake?.senderPhone ??
            selectedIntake?.senderEmail ??
            "Reply channel pending"),
      contactEmail:
        parsedRequest?.contactEmail ??
        parsedVolunteer?.contactEmail ??
        extractFirstEmail(
          `${selectedIntake?.senderEmail ?? ""}\n${selectedIntake?.rawBody ?? ""}`
        ),
      contactPhone:
        parsedRequest?.contactPhone ??
        parsedVolunteer?.contactPhone ??
        extractFirstPhone(
          `${selectedIntake?.senderPhone ?? ""}\n${selectedIntake?.rawBody ?? ""}`
        ),
      rawParagraphs: rawParagraphsForReview(selectedIntake),
      needBy: parsedRequest?.dueBucket ?? "today",
      householdSize: String(parsedRequest?.householdSize ?? 1),
      dietaryFlags: parsedRequest
        ? formatFoodConstraintsForReview({
            allergenFlags: parsedRequest.allergenFlags,
            dietaryTags: parsedRequest.dietaryTags,
          })
        : "None",
      accessNotes: parsedRequest
        ? focusedRequestNotes(
            parsedRequest,
            structuredTextField(
              selectedDraft?.structuredPayload,
              "accessNotes"
            ) ?? (selectedIntake ? publicFormNote(selectedIntake) : null)
          )
        : parsedVolunteer
          ? focusedVolunteerNotes(
              parsedVolunteer,
              structuredTextField(
                selectedDraft?.structuredPayload,
                "routeNotes"
              ) ??
                structuredTextField(
                  selectedDraft?.structuredPayload,
                  "notes"
                ) ??
                (selectedIntake ? publicFormNote(selectedIntake) : null)
            )
          : (selectedIntake?.rawBody ?? "Notes pending review."),
      sourceChannel: selectedIntake?.channel === "gmail" ? "gmail" : "form",
      structuredPayload: selectedDraft?.structuredPayload ?? {},
      subject: selectedIntake?.subject ?? selectedDraft?.summary ?? "No intake",
      summary: selectedDraft?.summary ?? "No pending draft is waiting.",
      isParsing:
        selectedDraft?.parserVersion === PUBLIC_FORM_PARSING_VERSION ||
        selectedIntake?.status === "pending_review",
      volunteerAvailability: parsedVolunteer
        ? `${parsedVolunteer.minutesAvailable} minutes, ${parsedVolunteer.windowStart}-${parsedVolunteer.windowEnd}`
        : "",
      volunteerStartArea: parsedVolunteer
        ? `${parsedVolunteer.homeArea}, ${parsedVolunteer.homeMunicipality}`
        : "",
    },
  };
}

export async function getAdminRoutesData(): Promise<AdminRoutesData> {
  const graph = await loadDemoGraph();
  const routeSummaries = buildRouteSummaries(graph);
  const selectedRoute = routeSummaries[0];
  const routeOptions = await buildDriverRouteOptions(graph);
  const unroutedPublicToday = buildUnroutedPublicTodaySummary(graph);

  return {
    driverCapacity: buildDriverCapacity(graph),
    heldBackReasons: graph.requestRows
      .filter((entry) => entry.status === "held" && entry.routingHoldReason)
      .slice(0, 4)
      .map((entry) => entry.routingHoldReason as string),
    liveMarkers: buildLiveMarkers(
      graph.routeRows,
      graph.stopRows,
      graph.sessionRows,
      graph.volunteerRows,
      graph.depotRows
    ),
    requestBuckets: buildTriageBuckets(graph),
    routeLine: await buildRoutePath(
      selectedRoute?.id,
      graph.depotRows,
      graph.routeRows,
      graph.stopRows
    ),
    routeOptions,
    routePlans: buildRoutePlans(graph),
    routeSummaries,
    unroutedPublicToday,
    selectedRoute: {
      id: selectedRoute.id,
      name: selectedRoute.name,
      stops: selectedRoute.stops,
      utilization: selectedRoute.utilization,
      eta: selectedRoute.eta,
    },
    stopRows: buildStopRows(selectedRoute.id, graph),
  };
}

export async function getAdminLiveData(): Promise<AdminLiveData> {
  const graph = await loadDemoGraph();
  const routeSummaries = buildRouteSummaries(graph);
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const routeById = new Map(
    graph.routeRows.map((entry) => [entry.id, entry] as const)
  );
  const volunteerById = new Map(
    graph.volunteerRows.map((entry) => [entry.id, entry] as const)
  );

  const deliveredEvents = graph.stopRows
    .filter((entry) => entry.status === "delivered")
    .sort(
      (left, right) =>
        (right.deliveredAt?.getTime?.() ?? 0) -
        (left.deliveredAt?.getTime?.() ?? 0)
    )
    .slice(0, 2)
    .map((stop) => {
      const route = routeById.get(stop.routeId);
      const volunteer = route ? volunteerById.get(route.volunteerId) : null;
      const client = clientById.get(stop.clientId);

      return {
        time: formatTime(stop.deliveredAt),
        event: `Driver confirmed delivery at ${client ? compactName(client.firstName, client.lastName) : "a stop"}`,
        route: route?.routeName ?? "Route pending",
        owner: volunteer
          ? compactName(volunteer.firstName, volunteer.lastName)
          : "Driver pending",
      };
    });

  const approvalEvents = graph.draftRows
    .filter((entry) => entry.status === "approved" && entry.reviewedAt)
    .sort(
      (left, right) =>
        (right.reviewedAt?.getTime?.() ?? 0) -
        (left.reviewedAt?.getTime?.() ?? 0)
    )
    .slice(0, 1)
    .map((draft) => ({
      time: formatTime(draft.reviewedAt),
      event: `${draft.draftType === "volunteer" ? "Volunteer" : "Request"} draft approved for routing`,
      route: draft.draftType === "volunteer" ? "Shared pool" : "Dispatch board",
      owner: draft.reviewedBy ?? "Coordinator",
    }));

  return {
    events: [...deliveredEvents, ...approvalEvents].sort((left, right) =>
      right.time.localeCompare(left.time)
    ),
    liveMarkers: buildLiveMarkers(
      graph.routeRows,
      graph.stopRows,
      graph.sessionRows,
      graph.volunteerRows,
      graph.depotRows
    ),
    routeLine: await buildRoutePath(
      graph.routeRows.find((entry) => entry.status === "in_progress")?.id ??
        graph.routeRows[0]?.id,
      graph.depotRows,
      graph.routeRows,
      graph.stopRows
    ),
    routeSummaries,
  };
}

export async function getAdminInventoryData(): Promise<AdminInventoryData> {
  const graph = await loadDemoGraph();
  const clientById = new Map(
    graph.clientRows.map((entry) => [entry.id, entry] as const)
  );
  const shortageNotes = graph.requestRows
    .filter((entry) => entry.routingHoldReason)
    .filter((entry) =>
      /(stock|inventory|meal|refrigerat|cooler|cold-chain)/i.test(
        entry.routingHoldReason ?? ""
      )
    )
    .slice(0, 5)
    .map((request) => {
      const client = clientById.get(request.clientId);

      return {
        clientName: client
          ? compactName(client.firstName, client.lastName)
          : "Unknown neighbour",
        reason: request.routingHoldReason as string,
        requestId: request.id,
      };
    });
  const lowStockMeals = graph.mealRows.filter(
    (meal) => meal.quantityAvailable <= meal.lowStockThreshold
  );
  const routeReadyMeals = graph.mealRows.reduce(
    (sum, meal) => sum + meal.quantityAvailable,
    0
  );
  const coldChainMeals = graph.mealRows.filter((meal) => meal.refrigerated);
  const perishableIngredients = graph.ingredientRows.filter(
    (ingredient) => ingredient.perishabilityScore >= 4
  );

  return {
    ingredientSourceNote:
      graph.ingredientRows[0]?.sourceReference ??
      "Tuesday community pantry pickup",
    inventoryKpis: [
      {
        icon: "meal-container",
        id: "route-ready-meals",
        label: "Route-ready meals",
        note: `${graph.mealRows.length} named meal types, ${lowStockMeals.length} below threshold`,
        tone: "success",
        value: String(routeReadyMeals),
      },
      {
        icon: "snowflake",
        id: "refrigerated-meals",
        label: "Needs refrigeration",
        note: `${coldChainMeals.length} meal types need a cooler-ready vehicle`,
        tone: "info",
        value: String(
          coldChainMeals.reduce((sum, meal) => sum + meal.quantityAvailable, 0)
        ),
      },
      {
        icon: "warning-alert",
        id: "shortage-holds",
        label: "Shortage holds",
        note: "Stops stay excluded instead of breaking the route pass",
        tone: shortageNotes.length > 0 ? "warning" : "success",
        value: String(shortageNotes.length),
      },
      {
        icon: "fridge",
        id: "perishable-ingredients",
        label: "Perishable stock",
        note: `${perishableIngredients.length} ingredients sorted first`,
        tone: "warm",
        value: String(perishableIngredients.length),
      },
    ],
    ingredients: graph.ingredientRows
      .slice()
      .sort(
        (left, right) =>
          right.perishabilityScore - left.perishabilityScore ||
          left.name.localeCompare(right.name)
      )
      .map((ingredient) => {
        const suggestion = suggestPerishability({
          name: ingredient.name,
          refrigerated: ingredient.refrigerated,
        });

        return {
          id: ingredient.id,
          name: ingredient.name,
          notes: ingredient.notes,
          source: ingredient.sourceReference ?? "Manual entry",
          quantity: `${ingredient.quantity} ${ingredient.unit}`,
          perishability: ingredient.perishabilityLabel,
          perishabilityScore: ingredient.perishabilityScore,
          refrigerated: ingredient.refrigerated,
          suggestionConfidence: `${suggestion.confidence}%`,
        };
      }),
    meals: graph.mealRows
      .slice()
      .sort(
        (left, right) =>
          Number(left.quantityAvailable > left.lowStockThreshold) -
            Number(right.quantityAvailable > right.lowStockThreshold) ||
          left.quantityAvailable - right.quantityAvailable ||
          left.name.localeCompare(right.name)
      )
      .map((meal) => ({
        allergenFlags: meal.allergenFlags,
        id: meal.id,
        name: meal.name,
        category: meal.category.replace(/_/g, " "),
        dietaryTags: meal.dietaryTags,
        quantity: String(meal.quantityAvailable),
        quantityAvailable: meal.quantityAvailable,
        refrigerated: meal.refrigerated,
        sourceNote: meal.sourceNote,
        status:
          meal.quantityAvailable <= meal.lowStockThreshold ? "low" : "ready",
        tags: [
          ...(meal.refrigerated ? ["Fridge"] : ["Shelf stable"]),
          ...meal.dietaryTags
            .slice(0, 2)
            .map((entry) => entry.replace(/_/g, " ")),
        ],
      })),
    parserFixtureText: fixtureReceiptText,
    shortageNotes,
  };
}

export async function getDriverOfferData(): Promise<DriverOfferData> {
  const graph = await loadDemoGraph();
  const routeSummaries = buildRouteSummaries(graph);
  const routeOptions = await buildDriverRouteOptions(graph);
  const suggestedRoute =
    routeSummaries.find((entry) => isGeneratedPublicRouteId(entry.id)) ??
    routeSummaries.find((entry) => entry.status === "on-track") ??
    routeSummaries[0];
  const suggestedOption =
    routeOptions.find((entry) => entry.id === suggestedRoute.id) ??
    routeOptions[0];
  const availabilityOptions = Array.from(
    new Set([
      60,
      90,
      120,
      150,
      Math.min(
        PUBLIC_ROUTE_MAX_TOTAL_MINUTES,
        Math.ceil((suggestedOption?.plannedTotalMinutes ?? 60) / 30) * 30
      ),
      PUBLIC_ROUTE_MAX_TOTAL_MINUTES,
    ])
  )
    .filter((minutes) => minutes > 0)
    .sort((left, right) => left - right);
  const personas = Array.from(
    new Map(
      routeOptions.map((route) => [
        route.volunteer.id,
        {
          id: route.volunteer.id,
          label: route.volunteer.name,
          note: `${route.area} · ${route.vehicle.name}`,
        },
      ])
    ).values()
  );

  return {
    availabilityOptions,
    liveMarkers: buildLiveMarkers(
      graph.routeRows,
      graph.stopRows,
      graph.sessionRows,
      graph.volunteerRows,
      graph.depotRows
    ),
    personas,
    routeOptions,
    routeLine: suggestedOption.routeLine,
    stops: buildStopRows(suggestedRoute.id, graph),
    suggestedRoute: {
      routeId: suggestedRoute.id,
      name: suggestedRoute.name,
      subtitle: `${suggestedRoute.stops} stops, ${suggestedRoute.eta} total planned time.`,
      driveTime: suggestedOption.driveTime,
      firstStop: suggestedOption.firstStop,
      plannedTotalMinutes: suggestedOption.plannedTotalMinutes,
      totalPlannedTime: suggestedOption.totalPlannedTime,
      vehicle: suggestedOption.vehicle.name,
      coldChainNote: suggestedOption.coldChainNote,
    },
  };
}

export async function getDriverActiveData(
  routeId?: string
): Promise<DriverActiveData> {
  const graph = await loadDemoGraph();
  const activeRoute =
    graph.routeRows.find((entry) => entry.id === routeId) ??
    graph.routeRows.find((entry) => entry.status === "in_progress") ??
    graph.routeRows[0];
  const stopRows = buildStopRows(activeRoute.id, graph);
  const currentStop = graph.stopRows
    .filter(
      (entry) =>
        entry.routeId === activeRoute.id &&
        !isTerminalRouteStopStatus(entry.status)
    )
    .sort((left, right) => left.sequence - right.sequence)[0];
  const client = graph.clientRows.find(
    (entry) => entry.id === currentStop?.clientId
  );
  const currentStopMeals = currentStop
    ? graph.stopMealRows.filter((entry) => entry.routeStopId === currentStop.id)
    : [];
  const currentStopWarnings = [
    currentStopMeals.some((item) => item.refrigerated) ? "Fridge" : null,
    ...Array.from(
      new Set(
        currentStopMeals.flatMap((item) => [
          ...item.dietaryTags.map((tag) => tag.replace(/_/g, " ")),
          ...item.allergenFlags.map((flag) => `${flag} allergy`),
        ])
      )
    ).slice(0, 3),
  ].filter(Boolean) as string[];
  const resolvedRoute = await buildResolvedRoute(
    activeRoute.id,
    graph.depotRows,
    graph.routeRows,
    graph.stopRows
  );

  return {
    currentStop: {
      id: currentStop?.id ?? null,
      name: client
        ? compactName(client.firstName, client.lastName)
        : (stopRows[0]?.name ?? "Next stop"),
      address:
        currentStop?.addressLine ?? stopRows[0]?.address ?? "Address pending",
      note:
        currentStop?.accessSummary ??
        client?.accessNotes ??
        "Standard handoff.",
      items:
        currentStop?.mealSummary ?? stopRows[0]?.items ?? "Loadout pending",
      warnings:
        currentStopWarnings.length > 0
          ? currentStopWarnings
          : (stopRows[0]?.warnings ?? []),
    },
    currentStopIndex: currentStop?.sequence ? currentStop.sequence - 1 : 0,
    deliveredCount: activeRoute.deliveredCount,
    liveMarkers: buildLiveMarkers(
      graph.routeRows,
      graph.stopRows,
      graph.sessionRows,
      graph.volunteerRows,
      graph.depotRows
    ),
    routeDirections: formatRouteDirections(resolvedRoute),
    routeFallbackReason: resolvedRoute.fallbackReason,
    routeLine: resolvedRoute.geometry,
    routeId: activeRoute.id,
    routeName: activeRoute.routeName,
    routingProvider: resolvedRoute.provider,
    volunteerId: activeRoute.volunteerId,
  };
}

export async function getRouteDetail(
  routeId: string
): Promise<RouteDetailData> {
  const graph = await loadDemoGraph();
  const route = graph.routeRows.find((entry) => entry.id === routeId);

  if (!route) {
    throw new Error(`Route ${routeId} was not found.`);
  }

  const volunteer = graph.volunteerRows.find(
    (entry) => entry.id === route.volunteerId
  );
  const vehicle = graph.vehicleRows.find(
    (entry) => entry.id === route.vehicleId
  );
  const summary = buildRouteSummaries(graph).find(
    (entry) => entry.id === route.id
  )!;
  const resolvedRoute = await buildResolvedRoute(
    route.id,
    graph.depotRows,
    graph.routeRows,
    graph.stopRows
  );
  const mealById = new Map(
    graph.mealRows.map((entry) => [entry.id, entry] as const)
  );
  const stopMealByStop = new Map<
    string,
    Array<typeof routeStopMealItems.$inferSelect>
  >();

  for (const item of graph.stopMealRows) {
    const bucket = stopMealByStop.get(item.routeStopId) ?? [];
    bucket.push(item);
    stopMealByStop.set(item.routeStopId, bucket);
  }

  const stopDetails = graph.stopRows
    .filter((entry) => entry.routeId === route.id)
    .sort((left, right) => left.sequence - right.sequence)
    .map((stop) => {
      const client = graph.clientRows.find(
        (entry) => entry.id === stop.clientId
      );

      return {
        id: stop.id,
        name: client
          ? compactName(client.firstName, client.lastName)
          : "Unknown neighbour",
        address: stop.addressLine,
        etaLabel: formatTime(stop.eta),
        mealSummary: stop.mealSummary,
        accessSummary: stop.accessSummary,
        originalMessageExcerpt: stop.originalMessageExcerpt,
        status: stop.status.replace(/_/g, " "),
        items: (stopMealByStop.get(stop.id) ?? []).map((item) => {
          const meal = mealById.get(item.mealId);

          return {
            name: meal?.name ?? item.mealNameSnapshot,
            quantity: item.quantity,
            dietaryTags: item.dietaryTags,
            allergenFlags: item.allergenFlags,
            refrigerated: item.refrigerated,
          };
        }),
      };
    });

  return {
    directions: formatRouteDirections(resolvedRoute),
    route: {
      ...summary,
      explanation: route.routeExplanation,
      warnings: route.warnings,
    },
    routeFallbackReason: resolvedRoute.fallbackReason,
    routeLine: resolvedRoute.geometry,
    routingProvider: resolvedRoute.provider,
    stops: stopDetails,
    volunteer: {
      name: volunteer
        ? compactName(volunteer.firstName, volunteer.lastName)
        : "Unassigned",
      phone: volunteer?.phone ?? null,
    },
    vehicle: {
      name: vehicle?.name ?? "Vehicle pending",
      refrigerated: vehicle?.refrigerated ?? false,
      wheelchairLift: vehicle?.wheelchairLift ?? false,
    },
  };
}

export async function getDemoState() {
  const [adminDashboard, inboxData] = await Promise.all([
    getAdminDashboardData(),
    getAdminInboxData(),
  ]);

  return {
    inboxItems: inboxData.inboxItems,
    liveMarkers: adminDashboard.liveMarkers,
    routeSummaries: adminDashboard.routeSummaries,
  };
}

export async function hasSeededData() {
  if (!db) {
    return false;
  }

  const database = getDb();
  const [clientCount, draftCount, depotCount, volunteerCount] =
    await Promise.all([
      database.select({ count: sql<number>`count(*)` }).from(clients),
      database.select({ count: sql<number>`count(*)` }).from(intakeDrafts),
      database.select({ count: sql<number>`count(*)` }).from(depots),
      database.select({ count: sql<number>`count(*)` }).from(volunteers),
    ]);

  return [clientCount, draftCount, depotCount, volunteerCount].every(
    (result) => Number(result[0]?.count ?? 0) > 0
  );
}

export async function ensureSeededData() {
  if (await hasSeededData()) {
    return;
  }

  await serializeDemoSeedMutation(async () => {
    if (!(await hasSeededData())) {
      await performSeedDemoData();
    }
  });
}

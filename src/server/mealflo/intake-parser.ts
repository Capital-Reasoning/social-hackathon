import { z } from "zod";

import { serverEnv } from "@/lib/config/server-env";
import {
  inferFoodConstraintsFromText,
  normalizeFoodConstraints,
} from "@/lib/mealflo-food-constraints";

export const parserVersionFallback = "heuristic-intake-v1";
export const parserVersionOpenAi = "openai-structured-intake-v1";

const VANCOUVER_AREA_MUNICIPALITIES = [
  "Victoria",
  "Esquimalt",
  "Saanich",
  "Oak Bay",
  "View Royal",
  "Langford",
  "Colwood",
  "Sidney",
] as const;

const STREET_SUFFIXES =
  "Street|St\\.?|Avenue|Ave\\.?|Road|Rd\\.?|Drive|Dr\\.?|Crescent|Cres\\.?|Boulevard|Blvd\\.?|Place|Pl\\.?|Way|Lane|Ln\\.?|Court|Ct\\.?|Terrace|Trail";

export const parsedRequestPayloadSchema = z.object({
  addressLine1: z.string().min(5),
  addressLine2: z.string().optional(),
  allergenFlags: z.array(z.string()).default([]),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  coldChainRequired: z.boolean().default(false),
  dietaryTags: z.array(z.string()).default([]),
  dueBucket: z.enum(["today", "tomorrow", "later"]).default("today"),
  firstName: z.string().min(1),
  householdSize: z.number().int().min(1).default(1),
  lastName: z.string().min(1),
  message: z.string().min(8),
  municipality: z.string().min(2),
  neighborhood: z.string().optional(),
  requestedMealCount: z.number().int().min(1).default(2),
});

export const parsedVolunteerPayloadSchema = z.object({
  canClimbStairs: z.boolean().default(false),
  canHandleColdChain: z.boolean().default(false),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  firstName: z.string().min(1),
  hasVehicleAccess: z.boolean().default(false),
  homeArea: z.string().min(2),
  homeMunicipality: z.string().min(2),
  lastName: z.string().min(1),
  message: z.string().min(8),
  minutesAvailable: z.number().int().min(30).max(180),
  windowEnd: z.string().min(4),
  windowStart: z.string().min(4),
});

const openAiRequestPayloadSchema = parsedRequestPayloadSchema.extend({
  addressLine2: z.string(),
  contactEmail: z.string(),
  contactPhone: z.string(),
  neighborhood: z.string(),
});

const openAiVolunteerPayloadSchema = parsedVolunteerPayloadSchema.extend({
  contactEmail: z.string(),
  contactPhone: z.string(),
});

const openAiParsedSchema = z.object({
  confidenceScore: z.number().int().min(0).max(100),
  draftType: z.enum(["request", "volunteer", "other"]),
  lowConfidenceFields: z.array(z.string()),
  request: openAiRequestPayloadSchema,
  summary: z.string().min(4),
  volunteer: openAiVolunteerPayloadSchema,
});

export type ParsedRequestPayload = z.infer<typeof parsedRequestPayloadSchema>;
export type ParsedVolunteerPayload = z.infer<
  typeof parsedVolunteerPayloadSchema
>;

export type ParsedIntakeDraft =
  | {
      confidenceScore: number;
      draftType: "request";
      lowConfidenceFields: string[];
      parserVersion: string;
      structuredPayload: ParsedRequestPayload;
      summary: string;
    }
  | {
      confidenceScore: number;
      draftType: "volunteer";
      lowConfidenceFields: string[];
      parserVersion: string;
      structuredPayload: ParsedVolunteerPayload;
      summary: string;
    }
  | {
      confidenceScore: number;
      draftType: "other";
      lowConfidenceFields: string[];
      parserVersion: string;
      structuredPayload: Record<string, unknown>;
      summary: string;
    };

export type RawIntakeSource = {
  channel: "gmail" | "manual_entry" | "public_form";
  rawAddress?: string | null;
  rawBody: string;
  senderEmail?: string | null;
  senderName?: string | null;
  senderPhone?: string | null;
  subject?: string | null;
};

function cleanText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function compactBody(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function clampConfidence(score: number) {
  return Math.min(Math.max(Math.round(score), 35), 98);
}

function titleCase(value: string) {
  return cleanText(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function splitName(value: string | null | undefined) {
  const cleaned = cleanText(value)
    .replace(/["<>]/g, "")
    .replace(/\s+via\s+.*$/i, "");

  if (!cleaned || /no.?reply|unknown|gmail|info@/i.test(cleaned)) {
    return {
      firstName: "Unknown",
      lastName: "Neighbour",
      lowConfidenceFields: ["firstName", "lastName"],
    };
  }

  const parts = cleaned.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return {
      firstName: titleCase(parts[0]),
      lastName: "Neighbour",
      lowConfidenceFields: ["lastName"],
    };
  }

  return {
    firstName: titleCase(parts[0]),
    lastName: titleCase(parts.slice(1).join(" ")),
    lowConfidenceFields: [],
  };
}

function inferNameFromBody(body: string, senderName?: string | null) {
  const explicit = body.match(
    /\b(?:my name is|this is|i am|i'm)\s+([a-z][a-z .'-]+?)(?:[,.]|\n|$)/i
  );

  return splitName(explicit?.[1] ?? senderName);
}

function extractEmail(value: string) {
  return (
    value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? undefined
  );
}

function extractPhone(value: string) {
  return (
    value.match(
      /(?:\+?1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/
    )?.[0] ?? undefined
  );
}

function extractMunicipality(value: string) {
  const match = VANCOUVER_AREA_MUNICIPALITIES.find((municipality) =>
    new RegExp(`\\b${municipality}\\b`, "i").test(value)
  );

  return match ?? "Victoria";
}

function extractAddress(value: string, rawAddress?: string | null) {
  const candidate =
    cleanText(rawAddress) ||
    cleanText(
      value.match(
        new RegExp(
          `\\b\\d{2,6}\\s+[A-Z0-9][^\\n,]+(?:${STREET_SUFFIXES})\\b[^\\n,]*`,
          "i"
        )
      )?.[0]
    );

  if (candidate) {
    return {
      addressLine1: candidate,
      lowConfidence: false,
    };
  }

  return {
    addressLine1: "Address pending",
    lowConfidence: true,
  };
}

function extractInteger(value: string, patterns: RegExp[], fallback: number) {
  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      const parsed = Number.parseInt(match[1], 10);

      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }
  }

  return fallback;
}

function inferDueBucket(value: string) {
  if (/\btoday|tonight|urgent|as soon as|asap|emergency\b/i.test(value)) {
    return "today" as const;
  }

  if (/\btomorrow|next day\b/i.test(value)) {
    return "tomorrow" as const;
  }

  if (/\broutine|weekly|this week|later|next week\b/i.test(value)) {
    return "later" as const;
  }

  return "tomorrow" as const;
}

function inferRequestSummary(payload: ParsedRequestPayload) {
  return `${payload.dueBucket} ${payload.requestedMealCount}-meal request from ${payload.municipality}.`;
}

function inferVolunteerSummary(payload: ParsedVolunteerPayload) {
  return `${payload.minutesAvailable}-minute volunteer window in ${payload.homeArea}.`;
}

function isVolunteerIntent(text: string) {
  return /\b(volunteer|drive|driver|deliver|route|availability|available|help out|shift)\b/i.test(
    text
  );
}

function isRequestIntent(text: string) {
  return /\b(food|meal|meals|hamper|groceries|delivery|deliver|need|support|hungry|tray)\b/i.test(
    text
  );
}

function inferTimeWindow(value: string, minutesAvailable: number) {
  const range = value.match(
    /\b(?:from|between)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|to|and)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
  );

  if (range) {
    const start = normalizeHour(range[1], range[2], range[3] ?? range[6]);
    const end = normalizeHour(range[4], range[5], range[6] ?? range[3]);

    return { windowEnd: end, windowStart: start };
  }

  const after = value.match(/\bafter\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);

  if (after) {
    const start = normalizeHour(after[1], after[2], after[3]);
    const [hour, minute] = start.split(":").map((part) => Number(part));
    const endDate = new Date(2026, 3, 23, hour, minute);
    endDate.setMinutes(endDate.getMinutes() + minutesAvailable);

    return {
      windowEnd: `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
      windowStart: start,
    };
  }

  return { windowEnd: "13:00", windowStart: "09:00" };
}

function normalizeHour(hourRaw: string, minuteRaw?: string, meridiem?: string) {
  let hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw ?? "0", 10);

  if (/pm/i.test(meridiem ?? "") && hour < 12) {
    hour += 12;
  }

  if (/am/i.test(meridiem ?? "") && hour === 12) {
    hour = 0;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function fallbackRequestParse(source: RawIntakeSource): ParsedIntakeDraft {
  const body = compactBody(source.rawBody);
  const searchable = `${source.subject ?? ""}\n${body}\n${source.rawAddress ?? ""}`;
  const name = inferNameFromBody(body, source.senderName);
  const contactEmail = extractEmail(
    `${source.senderEmail ?? ""} ${source.rawBody}`
  );
  const contactPhone = extractPhone(
    `${source.senderPhone ?? ""} ${source.rawBody}`
  );
  const address = extractAddress(searchable, source.rawAddress);
  const householdSize = extractInteger(
    searchable,
    [
      /\bhousehold(?: size)?(?: of)?\s+(\d+)\b/i,
      /\bfamily of\s+(\d+)\b/i,
      /\bthere are\s+(\d+)\b/i,
      /\bfor\s+(\d+)\s+(?:people|persons|of us)\b/i,
    ],
    1
  );
  const requestedMealCount = extractInteger(
    searchable,
    [
      /\b(\d+)\s+(?:meal|meals|tray|trays|hamper|hampers)\b/i,
      /\bmeal(?:s)? for\s+(\d+)\b/i,
    ],
    Math.max(2, householdSize)
  );
  const foodConstraints = inferFoodConstraintsFromText(searchable);
  const lowConfidenceFields = [
    ...name.lowConfidenceFields,
    address.lowConfidence ? "addressLine1" : null,
    contactEmail || contactPhone ? null : "contact",
    /\b(today|tomorrow|urgent|routine|weekly|this week|next week)\b/i.test(
      searchable
    )
      ? null
      : "dueBucket",
  ].filter(Boolean) as string[];

  const payload: ParsedRequestPayload = {
    addressLine1: address.addressLine1,
    allergenFlags: foodConstraints.allergenFlags,
    contactEmail,
    contactPhone,
    coldChainRequired: foodConstraints.coldChainRequired,
    dietaryTags: foodConstraints.dietaryTags,
    dueBucket: inferDueBucket(searchable),
    firstName: name.firstName,
    householdSize,
    lastName: name.lastName,
    message: body || "No details supplied yet.",
    municipality: extractMunicipality(searchable),
    requestedMealCount,
  };

  return {
    confidenceScore: clampConfidence(86 - lowConfidenceFields.length * 7),
    draftType: "request",
    lowConfidenceFields,
    parserVersion: parserVersionFallback,
    structuredPayload: parsedRequestPayloadSchema.parse(payload),
    summary: inferRequestSummary(payload),
  };
}

function fallbackVolunteerParse(source: RawIntakeSource): ParsedIntakeDraft {
  const body = compactBody(source.rawBody);
  const searchable = `${source.subject ?? ""}\n${body}\n${source.rawAddress ?? ""}`;
  const name = inferNameFromBody(body, source.senderName);
  const contactEmail = extractEmail(
    `${source.senderEmail ?? ""} ${source.rawBody}`
  );
  const contactPhone = extractPhone(
    `${source.senderPhone ?? ""} ${source.rawBody}`
  );
  const minutesAvailable = extractInteger(
    searchable,
    [
      /\b(\d{2,3})\s*(?:minute|minutes|min)\b/i,
      /\b(\d)\s*(?:hour|hours|hr|hrs)\b/i,
    ],
    60
  );
  const normalizedMinutes =
    minutesAvailable <= 8 ? minutesAvailable * 60 : minutesAvailable;
  const timeWindow = inferTimeWindow(searchable, normalizedMinutes);
  const homeMunicipality = extractMunicipality(searchable);
  const homeArea =
    cleanText(
      searchable.match(
        /\b(?:starting|start|based|area|neighbourhood|neighborhood)(?:\s+area)?\s*:?\s*(?:in|near|around)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
      )?.[1]
    ) || homeMunicipality;
  const lowConfidenceFields = [
    ...name.lowConfidenceFields,
    contactEmail || contactPhone ? null : "contact",
    /\b(\d{2,3})\s*(?:minute|minutes|min)\b|\b(\d)\s*(?:hour|hours|hr|hrs)\b/i.test(
      searchable
    )
      ? null
      : "minutesAvailable",
    /(?:starting|start|based|area|neighbourhood|neighborhood)\s+(?:in|near|around)?/i.test(
      searchable
    )
      ? null
      : "homeArea",
  ].filter(Boolean) as string[];

  const payload: ParsedVolunteerPayload = {
    canClimbStairs: /\bstairs|walk[-\s]?up|climb\b/i.test(searchable),
    canHandleColdChain: /\bcold|fridge|frozen|refrigerated\b/i.test(searchable),
    contactEmail,
    contactPhone,
    firstName: name.firstName,
    hasVehicleAccess: /\bcar|vehicle|van|drive|hatchback|suv|truck\b/i.test(
      searchable
    ),
    homeArea,
    homeMunicipality,
    lastName: name.lastName,
    message: body || "No details supplied yet.",
    minutesAvailable: Math.min(Math.max(normalizedMinutes, 30), 180),
    windowEnd: timeWindow.windowEnd,
    windowStart: timeWindow.windowStart,
  };

  return {
    confidenceScore: clampConfidence(88 - lowConfidenceFields.length * 7),
    draftType: "volunteer",
    lowConfidenceFields,
    parserVersion: parserVersionFallback,
    structuredPayload: parsedVolunteerPayloadSchema.parse(payload),
    summary: inferVolunteerSummary(payload),
  };
}

function fallbackOtherParse(source: RawIntakeSource): ParsedIntakeDraft {
  return {
    confidenceScore: 48,
    draftType: "other",
    lowConfidenceFields: ["draftType"],
    parserVersion: parserVersionFallback,
    structuredPayload: {
      body: compactBody(source.rawBody),
      senderEmail: source.senderEmail,
      senderName: source.senderName,
      subject: source.subject,
    },
    summary: "Message needs manual triage before it can become a draft.",
  };
}

function fallbackParse(source: RawIntakeSource): ParsedIntakeDraft {
  const searchable = `${source.subject ?? ""}\n${source.rawBody}`;

  if (isVolunteerIntent(searchable) && !isRequestIntent(searchable)) {
    return fallbackVolunteerParse(source);
  }

  if (
    isVolunteerIntent(searchable) &&
    /\bavailable|volunteer|drive\b/i.test(searchable)
  ) {
    return fallbackVolunteerParse(source);
  }

  if (isRequestIntent(searchable)) {
    return fallbackRequestParse(source);
  }

  return fallbackOtherParse(source);
}

function jsonSchema() {
  return {
    additionalProperties: false,
    properties: {
      confidenceScore: {
        maximum: 100,
        minimum: 0,
        type: "integer",
      },
      draftType: {
        enum: ["request", "volunteer", "other"],
        type: "string",
      },
      lowConfidenceFields: {
        items: { type: "string" },
        type: "array",
      },
      request: {
        additionalProperties: false,
        properties: {
          addressLine1: { type: "string" },
          addressLine2: { type: "string" },
          allergenFlags: { items: { type: "string" }, type: "array" },
          contactEmail: { type: "string" },
          contactPhone: { type: "string" },
          coldChainRequired: { type: "boolean" },
          dietaryTags: { items: { type: "string" }, type: "array" },
          dueBucket: { enum: ["today", "tomorrow", "later"], type: "string" },
          firstName: { type: "string" },
          householdSize: { minimum: 1, type: "integer" },
          lastName: { type: "string" },
          message: { type: "string" },
          municipality: { type: "string" },
          neighborhood: { type: "string" },
          requestedMealCount: { minimum: 1, type: "integer" },
        },
        required: [
          "addressLine1",
          "addressLine2",
          "allergenFlags",
          "contactEmail",
          "contactPhone",
          "coldChainRequired",
          "dietaryTags",
          "dueBucket",
          "firstName",
          "householdSize",
          "lastName",
          "message",
          "municipality",
          "neighborhood",
          "requestedMealCount",
        ],
        type: "object",
      },
      summary: { type: "string" },
      volunteer: {
        additionalProperties: false,
        properties: {
          canClimbStairs: { type: "boolean" },
          canHandleColdChain: { type: "boolean" },
          contactEmail: { type: "string" },
          contactPhone: { type: "string" },
          firstName: { type: "string" },
          hasVehicleAccess: { type: "boolean" },
          homeArea: { type: "string" },
          homeMunicipality: { type: "string" },
          lastName: { type: "string" },
          message: { type: "string" },
          minutesAvailable: { maximum: 180, minimum: 30, type: "integer" },
          windowEnd: { type: "string" },
          windowStart: { type: "string" },
        },
        required: [
          "canClimbStairs",
          "canHandleColdChain",
          "contactEmail",
          "contactPhone",
          "firstName",
          "hasVehicleAccess",
          "homeArea",
          "homeMunicipality",
          "lastName",
          "message",
          "minutesAvailable",
          "windowEnd",
          "windowStart",
        ],
        type: "object",
      },
    },
    required: [
      "confidenceScore",
      "draftType",
      "lowConfidenceFields",
      "request",
      "summary",
      "volunteer",
    ],
    type: "object",
  };
}

function extractOpenAiOutputText(response: {
  output?: Array<{
    content?: Array<{ text?: string; type?: string }>;
  }>;
  output_text?: string;
}) {
  if (response.output_text) {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  return null;
}

function normalizeOpenAiDraft(parsed: z.infer<typeof openAiParsedSchema>) {
  const lowConfidenceFields = Array.from(
    new Set(parsed.lowConfidenceFields.filter(Boolean))
  );

  if (parsed.draftType === "request") {
    const rawPayload = parsedRequestPayloadSchema.parse({
      ...parsed.request,
      addressLine2: parsed.request.addressLine2 || undefined,
      contactEmail: parsed.request.contactEmail || undefined,
      contactPhone: parsed.request.contactPhone || undefined,
      message: parsed.request.message || "No details supplied yet.",
      neighborhood: parsed.request.neighborhood || undefined,
    });
    const payload = parsedRequestPayloadSchema.parse({
      ...rawPayload,
      ...normalizeFoodConstraints(rawPayload),
    });

    return {
      confidenceScore: clampConfidence(parsed.confidenceScore),
      draftType: "request",
      lowConfidenceFields,
      parserVersion: parserVersionOpenAi,
      structuredPayload: payload,
      summary: parsed.summary || inferRequestSummary(payload),
    } satisfies ParsedIntakeDraft;
  }

  if (parsed.draftType === "volunteer") {
    const payload = parsedVolunteerPayloadSchema.parse({
      ...parsed.volunteer,
      contactEmail: parsed.volunteer.contactEmail || undefined,
      contactPhone: parsed.volunteer.contactPhone || undefined,
      message: parsed.volunteer.message || "No details supplied yet.",
    });

    return {
      confidenceScore: clampConfidence(parsed.confidenceScore),
      draftType: "volunteer",
      lowConfidenceFields,
      parserVersion: parserVersionOpenAi,
      structuredPayload: payload,
      summary: parsed.summary || inferVolunteerSummary(payload),
    } satisfies ParsedIntakeDraft;
  }

  return {
    confidenceScore: clampConfidence(parsed.confidenceScore),
    draftType: "other",
    lowConfidenceFields:
      lowConfidenceFields.length > 0 ? lowConfidenceFields : ["draftType"],
    parserVersion: parserVersionOpenAi,
    structuredPayload: {},
    summary: parsed.summary || "Message needs manual triage.",
  } satisfies ParsedIntakeDraft;
}

async function parseWithOpenAi(source: RawIntakeSource) {
  if (!serverEnv.openAiApiKey || serverEnv.nodeEnv === "test") {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  const response = await fetch("https://api.openai.com/v1/responses", {
    body: JSON.stringify({
      input: [
        {
          content:
            "You parse food-delivery public intake for Mealflo. Return JSON only. " +
            "Classify as request, volunteer, or other. Make a best guess but list fields that need human review. " +
            "For request.message and volunteer.message, include only useful operational notes for review: access instructions, buzzer/intercom/door details, parking, timing constraints, mobility needs, allergies or diet caveats, cold-chain constraints, route preferences, or safety notes. " +
            "For request.dietaryTags, use only dietary categories like low_sodium, vegetarian, vegan, gluten_free, soft_food, diabetic_friendly, dairy_free, halal, renal_friendly, heart_healthy, or high_protein. Put avoidances and allergies like peanuts, tree nuts, shellfish, egg, fish, wheat, dairy, or gluten in request.allergenFlags instead. " +
            "Do not include greetings, thanks, signatures, organization names, filler, or facts already captured in structured fields such as name, address, phone, email, household size, meal count, availability, vehicle access, stairs, or start area. " +
            "If there are no extra operational notes, use exactly 'No extra access notes provided.' for requests or 'No extra route notes provided.' for volunteers.",
          role: "system",
        },
        {
          content: [
            `Channel: ${source.channel}`,
            `Subject: ${source.subject ?? ""}`,
            `Sender name: ${source.senderName ?? ""}`,
            `Sender email: ${source.senderEmail ?? ""}`,
            `Sender phone: ${source.senderPhone ?? ""}`,
            `Raw address: ${source.rawAddress ?? ""}`,
            "Body:",
            source.rawBody,
          ].join("\n"),
          role: "user",
        },
      ],
      model: serverEnv.openAiIntakeModel,
      text: {
        format: {
          description:
            "Structured Mealflo intake draft with confidence and low-confidence fields.",
          name: "mealflo_intake_draft",
          schema: jsonSchema(),
          strict: true,
          type: "json_schema",
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${serverEnv.openAiApiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
    output_text?: string;
  };
  const outputText = extractOpenAiOutputText(data);

  if (!outputText) {
    return null;
  }

  const parsed = openAiParsedSchema.parse(JSON.parse(outputText));

  return normalizeOpenAiDraft(parsed);
}

export async function parseIncomingIntake(
  source: RawIntakeSource
): Promise<ParsedIntakeDraft> {
  try {
    const openAiDraft = await parseWithOpenAi(source);

    if (openAiDraft) {
      return openAiDraft;
    }
  } catch {
    return fallbackParse(source);
  }

  return fallbackParse(source);
}

export function summarizeRequestPayload(payload: ParsedRequestPayload) {
  return inferRequestSummary(payload);
}

export function summarizeVolunteerPayload(payload: ParsedVolunteerPayload) {
  return inferVolunteerSummary(payload);
}

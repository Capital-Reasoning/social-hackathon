import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

const idColumn = (name = "id") => varchar(name, { length: 64 }).primaryKey();

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const intakeChannelEnum = pgEnum("intake_channel", [
  "public_form",
  "gmail",
  "manual_entry",
]);

export const intakeKindEnum = pgEnum("intake_kind", [
  "request",
  "volunteer",
  "other",
]);

export const intakeStatusEnum = pgEnum("intake_status", [
  "pending_review",
  "draft_ready",
  "approved",
  "ignored",
]);

export const draftTypeEnum = pgEnum("draft_type", [
  "request",
  "volunteer",
  "client",
  "other",
]);

export const draftStatusEnum = pgEnum("draft_status", [
  "pending",
  "approved",
  "ignored",
]);

export const volunteerRoleEnum = pgEnum("volunteer_role", [
  "volunteer",
  "staff",
]);

export const availabilitySourceEnum = pgEnum("availability_source", [
  "seeded",
  "public_form",
  "admin_entry",
  "driver_picker",
]);

export const vehicleTypeEnum = pgEnum("vehicle_type", [
  "sedan",
  "hatchback",
  "suv",
  "cargo_van",
  "refrigerated_van",
]);

export const requestKindEnum = pgEnum("request_kind", [
  "meal_delivery",
  "grocery_hamper",
]);

export const dueBucketEnum = pgEnum("due_bucket", [
  "today",
  "tomorrow",
  "later",
]);

export const priorityLabelEnum = pgEnum("priority_label", [
  "low",
  "normal",
  "high",
  "critical",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "draft",
  "approved",
  "held",
  "assigned",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

export const mealCategoryEnum = pgEnum("meal_category", [
  "hot_meal",
  "frozen_meal",
  "soup",
  "breakfast",
  "hamper",
  "snack",
]);

export const ingredientSourceTypeEnum = pgEnum("ingredient_source_type", [
  "donation",
  "purchase",
  "pantry",
  "farm",
  "hub_transfer",
]);

export const routeStatusEnum = pgEnum("route_status", [
  "draft",
  "planned",
  "approved",
  "in_progress",
  "completed",
  "reset",
]);

export const routeStopStatusEnum = pgEnum("route_stop_status", [
  "planned",
  "ready",
  "delivered",
  "could_not_deliver",
  "skipped",
]);

export const driverSessionStatusEnum = pgEnum("driver_session_status", [
  "active",
  "completed",
  "reset",
  "stale",
]);

export const depots = pgTable(
  "depots",
  {
    id: idColumn(),
    name: text("name").notNull(),
    municipality: text("municipality").notNull(),
    addressLine: text("address_line").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    hoursStart: varchar("hours_start", { length: 16 }).notNull(),
    hoursEnd: varchar("hours_end", { length: 16 }).notNull(),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => ({
    municipalityIdx: index("depots_municipality_idx").on(table.municipality),
  })
);

export const intakeMessages = pgTable(
  "intake_messages",
  {
    id: idColumn(),
    channel: intakeChannelEnum("channel").notNull(),
    intakeKind: intakeKindEnum("intake_kind").notNull(),
    senderName: text("sender_name"),
    senderEmail: text("sender_email"),
    senderPhone: text("sender_phone"),
    subject: text("subject").notNull(),
    rawBody: text("raw_body").notNull(),
    rawAddress: text("raw_address"),
    sourcePayload: jsonb("source_payload").$type<Record<string, unknown>>(),
    status: intakeStatusEnum("status").notNull().default("pending_review"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps(),
  },
  (table) => ({
    statusIdx: index("intake_messages_status_idx").on(table.status),
    receivedAtIdx: index("intake_messages_received_at_idx").on(
      table.receivedAt
    ),
  })
);

export const intakeDrafts = pgTable(
  "intake_drafts",
  {
    id: idColumn(),
    intakeMessageId: varchar("intake_message_id", { length: 64 })
      .notNull()
      .references(() => intakeMessages.id),
    draftType: draftTypeEnum("draft_type").notNull(),
    structuredPayload: jsonb("structured_payload")
      .$type<Record<string, unknown>>()
      .notNull(),
    confidenceScore: integer("confidence_score").notNull(),
    lowConfidenceFields: text("low_confidence_fields").array().notNull(),
    summary: text("summary").notNull(),
    parserVersion: text("parser_version").notNull(),
    approvedRecordType: text("approved_record_type"),
    approvedRecordId: varchar("approved_record_id", { length: 64 }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    status: draftStatusEnum("status").notNull().default("pending"),
    ...timestamps(),
  },
  (table) => ({
    statusIdx: index("intake_drafts_status_idx").on(table.status),
    intakeIdx: index("intake_drafts_intake_message_idx").on(
      table.intakeMessageId
    ),
  })
);

export const clients = pgTable(
  "clients",
  {
    id: idColumn(),
    sourceIntakeDraftId: varchar("source_intake_draft_id", {
      length: 64,
    }).references(() => intakeDrafts.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    phone: text("phone"),
    email: text("email"),
    municipality: text("municipality").notNull(),
    neighborhood: text("neighborhood"),
    addressLine1: text("address_line_1").notNull(),
    addressLine2: text("address_line_2"),
    postalCode: text("postal_code"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    householdSize: integer("household_size").notNull(),
    dietaryTags: text("dietary_tags").array().notNull(),
    allergenFlags: text("allergen_flags").array().notNull(),
    accessNotes: text("access_notes"),
    safeToLeave: boolean("safe_to_leave").notNull().default(false),
    doNotEnter: boolean("do_not_enter").notNull().default(false),
    assistanceAtDoor: boolean("assistance_at_door").notNull().default(false),
    requiresTwoPerson: boolean("requires_two_person").notNull().default(false),
    usesWheelchair: boolean("uses_wheelchair").notNull().default(false),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    lastApprovedRequestAt: timestamp("last_approved_request_at", {
      withTimezone: true,
    }),
    ...timestamps(),
  },
  (table) => ({
    municipalityIdx: index("clients_municipality_idx").on(table.municipality),
    activeIdx: index("clients_active_idx").on(table.active),
  })
);

export const volunteers = pgTable(
  "volunteers",
  {
    id: idColumn(),
    sourceIntakeDraftId: varchar("source_intake_draft_id", {
      length: 64,
    }).references(() => intakeDrafts.id),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    role: volunteerRoleEnum("role").notNull(),
    homeArea: text("home_area").notNull(),
    homeMunicipality: text("home_municipality").notNull(),
    hasVehicleAccess: boolean("has_vehicle_access").notNull().default(false),
    preferredVehicleId: varchar("preferred_vehicle_id", { length: 64 }),
    canHandleColdChain: boolean("can_handle_cold_chain")
      .notNull()
      .default(false),
    canHandleWheelchair: boolean("can_handle_wheelchair")
      .notNull()
      .default(false),
    canClimbStairs: boolean("can_climb_stairs").notNull().default(false),
    languages: text("languages").array().notNull(),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (table) => ({
    activeIdx: index("volunteers_active_idx").on(table.active),
    municipalityIdx: index("volunteers_municipality_idx").on(
      table.homeMunicipality
    ),
  })
);

export const volunteerAvailability = pgTable(
  "volunteer_availability",
  {
    id: idColumn(),
    volunteerId: varchar("volunteer_id", { length: 64 })
      .notNull()
      .references(() => volunteers.id),
    source: availabilitySourceEnum("source").notNull(),
    rawText: text("raw_text"),
    recurringRule: text("recurring_rule"),
    date: date("date").notNull(),
    windowStart: varchar("window_start", { length: 16 }).notNull(),
    windowEnd: varchar("window_end", { length: 16 }).notNull(),
    minutesAvailable: integer("minutes_available").notNull(),
    parsedConfidence: integer("parsed_confidence").notNull(),
    ...timestamps(),
  },
  (table) => ({
    volunteerIdx: index("volunteer_availability_volunteer_idx").on(
      table.volunteerId
    ),
    dateIdx: index("volunteer_availability_date_idx").on(table.date),
  })
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: idColumn(),
    name: text("name").notNull(),
    type: vehicleTypeEnum("type").notNull(),
    refrigerated: boolean("refrigerated").notNull().default(false),
    wheelchairLift: boolean("wheelchair_lift").notNull().default(false),
    capacityMeals: integer("capacity_meals").notNull(),
    homeDepotId: varchar("home_depot_id", { length: 64 })
      .notNull()
      .references(() => depots.id),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    ...timestamps(),
  },
  (table) => ({
    activeIdx: index("vehicles_active_idx").on(table.active),
    depotIdx: index("vehicles_home_depot_idx").on(table.homeDepotId),
  })
);

export const deliveryRequests = pgTable(
  "delivery_requests",
  {
    id: idColumn(),
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => clients.id),
    sourceIntakeDraftId: varchar("source_intake_draft_id", {
      length: 64,
    }).references(() => intakeDrafts.id),
    requestKind: requestKindEnum("request_kind").notNull(),
    dueBucket: dueBucketEnum("due_bucket").notNull(),
    scheduledDate: date("scheduled_date").notNull(),
    urgencyScore: integer("urgency_score").notNull(),
    priorityLabel: priorityLabelEnum("priority_label").notNull(),
    householdSizeSnapshot: integer("household_size_snapshot").notNull(),
    requestedMealCount: integer("requested_meal_count").notNull(),
    approvedMealCount: integer("approved_meal_count").notNull(),
    coldChainRequired: boolean("cold_chain_required").notNull().default(false),
    dietaryTagsSnapshot: text("dietary_tags_snapshot").array().notNull(),
    allergenFlagsSnapshot: text("allergen_flags_snapshot").array().notNull(),
    accessNotes: text("access_notes"),
    originalMessageExcerpt: text("original_message_excerpt"),
    notes: text("notes"),
    routingHoldReason: text("routing_hold_reason"),
    status: requestStatusEnum("status").notNull().default("draft"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    assignedRouteId: varchar("assigned_route_id", { length: 64 }),
    assignedStopSequence: integer("assigned_stop_sequence"),
    ...timestamps(),
  },
  (table) => ({
    clientIdx: index("delivery_requests_client_idx").on(table.clientId),
    statusIdx: index("delivery_requests_status_idx").on(table.status),
    scheduledIdx: index("delivery_requests_scheduled_date_idx").on(
      table.scheduledDate
    ),
    dueBucketIdx: index("delivery_requests_due_bucket_idx").on(table.dueBucket),
  })
);

export const deliverableMeals = pgTable(
  "deliverable_meals",
  {
    id: idColumn(),
    name: text("name").notNull(),
    category: mealCategoryEnum("category").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    allergenFlags: text("allergen_flags").array().notNull(),
    dietaryTags: text("dietary_tags").array().notNull(),
    refrigerated: boolean("refrigerated").notNull().default(false),
    unitLabel: text("unit_label").notNull(),
    sourceNote: text("source_note"),
    lowStockThreshold: integer("low_stock_threshold").notNull(),
    ...timestamps(),
  },
  (table) => ({
    categoryIdx: index("deliverable_meals_category_idx").on(table.category),
  })
);

export const ingredientItems = pgTable(
  "ingredient_items",
  {
    id: idColumn(),
    name: text("name").notNull(),
    quantity: integer("quantity").notNull(),
    unit: text("unit").notNull(),
    refrigerated: boolean("refrigerated").notNull().default(false),
    perishabilityScore: integer("perishability_score").notNull(),
    perishabilityLabel: text("perishability_label").notNull(),
    sourceType: ingredientSourceTypeEnum("source_type").notNull(),
    sourceReference: text("source_reference"),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => ({
    perishabilityIdx: index("ingredient_items_perishability_idx").on(
      table.perishabilityScore
    ),
  })
);

export const routes = pgTable(
  "routes",
  {
    id: idColumn(),
    routeName: text("route_name").notNull(),
    areaLabel: text("area_label").notNull(),
    serviceDate: date("service_date").notNull(),
    volunteerId: varchar("volunteer_id", { length: 64 })
      .notNull()
      .references(() => volunteers.id),
    vehicleId: varchar("vehicle_id", { length: 64 })
      .notNull()
      .references(() => vehicles.id),
    startDepotId: varchar("start_depot_id", { length: 64 })
      .notNull()
      .references(() => depots.id),
    status: routeStatusEnum("status").notNull().default("draft"),
    plannedDriveMinutes: integer("planned_drive_minutes").notNull(),
    plannedStopMinutes: integer("planned_stop_minutes").notNull(),
    plannedTotalMinutes: integer("planned_total_minutes").notNull(),
    stopCount: integer("stop_count").notNull(),
    deliveredCount: integer("delivered_count").notNull().default(0),
    remainingCount: integer("remaining_count").notNull().default(0),
    capacityUtilizationPercent: integer(
      "capacity_utilization_percent"
    ).notNull(),
    routeExplanation: text("route_explanation").notNull(),
    warnings: text("warnings").array().notNull(),
    routeGeometry:
      jsonb("route_geometry").$type<Array<readonly [number, number]>>(),
    routeDirections: jsonb("route_directions").$type<
      Array<{
        distanceMeters: number;
        durationSeconds: number;
        steps: Array<{
          distanceMeters: number;
          durationSeconds: number;
          instruction: string;
          waypointRange: readonly [number, number] | null;
        }>;
      }>
    >(),
    routeDistanceMeters: integer("route_distance_meters"),
    routeDurationSeconds: integer("route_duration_seconds"),
    routeFallbackReason: text("route_fallback_reason"),
    routedAt: timestamp("routed_at", { withTimezone: true }),
    routingProvider: text("routing_provider"),
    routingWaypointHash: text("routing_waypoint_hash"),
    dashboardAnchorSessionId: varchar("dashboard_anchor_session_id", {
      length: 64,
    }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => ({
    serviceDateIdx: index("routes_service_date_idx").on(table.serviceDate),
    statusIdx: index("routes_status_idx").on(table.status),
    volunteerIdx: index("routes_volunteer_idx").on(table.volunteerId),
  })
);

export const routeStops = pgTable(
  "route_stops",
  {
    id: idColumn(),
    routeId: varchar("route_id", { length: 64 })
      .notNull()
      .references(() => routes.id),
    requestId: varchar("request_id", { length: 64 })
      .notNull()
      .references(() => deliveryRequests.id),
    clientId: varchar("client_id", { length: 64 })
      .notNull()
      .references(() => clients.id),
    sequence: integer("sequence").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    addressLine: text("address_line").notNull(),
    eta: timestamp("eta", { withTimezone: true }).notNull(),
    mealSummary: text("meal_summary").notNull(),
    itemSummary: text("item_summary").notNull(),
    accessSummary: text("access_summary").notNull(),
    originalMessageExcerpt: text("original_message_excerpt"),
    dueBucketOrigin: dueBucketEnum("due_bucket_origin").notNull(),
    status: routeStopStatusEnum("status").notNull().default("planned"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => ({
    routeIdx: index("route_stops_route_idx").on(table.routeId),
    statusIdx: index("route_stops_status_idx").on(table.status),
  })
);

export const routeStopMealItems = pgTable(
  "route_stop_meal_items",
  {
    id: idColumn(),
    routeStopId: varchar("route_stop_id", { length: 64 })
      .notNull()
      .references(() => routeStops.id),
    mealId: varchar("meal_id", { length: 64 })
      .notNull()
      .references(() => deliverableMeals.id),
    mealNameSnapshot: text("meal_name_snapshot").notNull(),
    quantity: integer("quantity").notNull(),
    dietaryTags: text("dietary_tags").array().notNull(),
    allergenFlags: text("allergen_flags").array().notNull(),
    refrigerated: boolean("refrigerated").notNull().default(false),
    ...timestamps(),
  },
  (table) => ({
    routeStopIdx: index("route_stop_meal_items_route_stop_idx").on(
      table.routeStopId
    ),
  })
);

export const driverSessions = pgTable(
  "driver_sessions",
  {
    id: idColumn(),
    routeId: varchar("route_id", { length: 64 })
      .notNull()
      .references(() => routes.id),
    volunteerId: varchar("volunteer_id", { length: 64 })
      .notNull()
      .references(() => volunteers.id),
    deviceFingerprint: text("device_fingerprint").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    currentLat: doublePrecision("current_lat"),
    currentLng: doublePrecision("current_lng"),
    deliveredCountLocal: integer("delivered_count_local").notNull().default(0),
    currentStopIndex: integer("current_stop_index").notNull().default(0),
    isAnchor: boolean("is_anchor").notNull().default(false),
    status: driverSessionStatusEnum("status").notNull().default("active"),
    ...timestamps(),
  },
  (table) => ({
    routeIdx: index("driver_sessions_route_idx").on(table.routeId),
    statusIdx: index("driver_sessions_status_idx").on(table.status),
    lastSeenIdx: index("driver_sessions_last_seen_idx").on(table.lastSeenAt),
  })
);

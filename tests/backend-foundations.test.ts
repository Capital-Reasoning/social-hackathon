import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/server/db/client";
import {
  approveDraft,
  approveRoute,
  completeDriverStop,
  commitUnroutedPublicTodayRoutes,
  createGmailIntake,
  createRequestIntake,
  createVolunteerIntake,
  evaluateRoutePrerequisites,
  generateRoutes,
  getAdminDashboardData,
  getAdminInventoryData,
  getAdminInboxData,
  getAdminRoutesData,
  getDriverActiveData,
  getDriverOfferData,
  markDraftOther,
  heartbeatDriverSession,
  ignoreDraft,
  parseInventoryDocument,
  parsePublicIntakeDraft,
  previewUnroutedPublicTodayRoutes,
  recordManualInventoryEntry,
  resetAndSeedDemoData,
  resetDemoData,
  resetRouteSession,
  seedDemoData,
  startDriverSession,
} from "@/server/mealflo/backend";
import {
  clients,
  deliverableMeals,
  deliveryRequests,
  driverSessions,
  ingredientItems,
  intakeDrafts,
  intakeMessages,
  routeStops,
  routeStopMealItems,
  routes,
  volunteerAvailability,
  volunteers,
} from "@/server/db/schema";

const describeWithTestDatabase = process.env.NEON_DATABASE_URL
  ? describe.sequential
  : describe.sequential.skip;

describeWithTestDatabase("backend foundations", () => {
  beforeEach(async () => {
    await seedDemoData();
  });

  it("creates a raw intake message and request draft together", async () => {
    const db = getDb();
    const created = await createRequestIntake({
      firstName: "Daria",
      lastName: "Cole",
      addressLine1: "901 Bay St",
      municipality: "Victoria",
      householdSize: 2,
      requestedMealCount: 3,
      dueBucket: "today",
      message:
        "Three meals would help after dialysis. Please call from the lobby.",
    });

    const [intake] = await db
      .select()
      .from(intakeMessages)
      .where(eq(intakeMessages.id, created.intakeId));
    const [draft] = await db
      .select()
      .from(intakeDrafts)
      .where(eq(intakeDrafts.id, created.draftId));

    expect(intake.subject).toContain("Daria Cole");
    expect(intake.status).toBe("pending_review");
    expect(draft.draftType).toBe("request");
    expect(draft.status).toBe("pending");
    expect(draft.confidenceScore).toBeGreaterThanOrEqual(80);

    const inboxBeforeParse = await getAdminInboxData(created.draftId);
    expect(
      inboxBeforeParse.inboxItems.find((item) => item.id === created.draftId)
        ?.isParsing
    ).toBe(true);

    await parsePublicIntakeDraft(created.draftId);

    const [parsedIntake] = await db
      .select()
      .from(intakeMessages)
      .where(eq(intakeMessages.id, created.intakeId));
    const inboxAfterParse = await getAdminInboxData(created.draftId);

    expect(parsedIntake.status).toBe("draft_ready");
    expect(inboxAfterParse.selectedItem.isParsing).toBe(false);
    expect(inboxAfterParse.selectedItem.rawParagraphs).toEqual([
      "Three meals would help after dialysis. Please call from the lobby.",
    ]);
    expect(inboxAfterParse.selectedItem.accessNotes).toBe(
      "Please call from the lobby."
    );
  });

  it("approves public requests with coordinates and scopes them into today's unrouted count", async () => {
    const db = getDb();
    const created = await createRequestIntake({
      firstName: "Rina",
      lastName: "Public",
      addressLine1: "901 Bay St",
      dueBucket: "today",
      householdSize: 2,
      message:
        "Two meals would help today. Please call when you are close to the lobby.",
      municipality: "Victoria",
      requestedMealCount: 2,
    });

    await parsePublicIntakeDraft(created.draftId);
    const approved = await approveDraft(created.draftId);
    const [request] = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.id, approved.recordId));
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, request.clientId));
    const routesData = await getAdminRoutesData();

    expect(client.latitude).toBeTypeOf("number");
    expect(client.longitude).toBeTypeOf("number");
    expect(routesData.unroutedPublicToday.count).toBe(1);
    expect(routesData.unroutedPublicToday.stops[0]?.id).toBe(request.id);
  });

  it("commits scoped public-form routes without deleting seeded routes", async () => {
    const db = getDb();
    const seededRouteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(routes);
    const created = await createRequestIntake({
      firstName: "Mara",
      lastName: "Scoped",
      addressLine1: "742 Cook Street",
      dueBucket: "today",
      householdSize: 1,
      message: "A couple of meals today would help. Side door is easiest.",
      municipality: "Victoria",
      requestedMealCount: 2,
    });

    await parsePublicIntakeDraft(created.draftId);
    const approved = await approveDraft(created.draftId);
    const preview = await previewUnroutedPublicTodayRoutes({
      batchId: "commit-scope-test",
    });
    const summary = await commitUnroutedPublicTodayRoutes({
      batchId: "commit-scope-test",
      assignments: [],
    });
    const [updatedRequest] = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.id, approved.recordId));
    const generatedRoutes = await db
      .select()
      .from(routes)
      .where(sql`${routes.id} like 'route-public-commit-scope-test%'`);
    const generatedStops = await db
      .select()
      .from(routeStops)
      .where(eq(routeStops.requestId, approved.recordId));
    const generatedMealItems = await db
      .select()
      .from(routeStopMealItems)
      .where(eq(routeStopMealItems.routeStopId, generatedStops[0]!.id));
    const [seededRoute] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));
    const finalRouteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(routes);

    expect(preview.stopCount).toBe(1);
    expect(summary.routeCount).toBe(1);
    expect(summary.stopCount).toBe(1);
    expect(generatedRoutes).toHaveLength(1);
    expect(generatedRoutes[0]?.plannedTotalMinutes).toBeLessThanOrEqual(180);
    expect(generatedStops).toHaveLength(1);
    expect(generatedMealItems.length).toBeGreaterThan(0);
    expect(updatedRequest.assignedRouteId).toBe(generatedRoutes[0]?.id);
    expect(updatedRequest.assignedStopSequence).toBe(1);
    expect(updatedRequest.status).toBe("assigned");
    expect(seededRoute).toBeTruthy();
    expect(Number(finalRouteCount[0]?.count ?? 0)).toBe(
      Number(seededRouteCount[0]?.count ?? 0) + 1
    );
  });

  it("keeps public form ids unique when same-name submissions land together", async () => {
    const submittedAt = new Date("2026-04-25T17:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(submittedAt);

    try {
      const [first, second, volunteer] = await Promise.all([
        createRequestIntake({
          firstName: "Same",
          lastName: "Neighbor",
          addressLine1: "901 Bay St",
          dueBucket: "today",
          householdSize: 1,
          message: "Need one meal today.",
          municipality: "Victoria",
          requestedMealCount: 1,
        }),
        createRequestIntake({
          firstName: "Same",
          lastName: "Neighbor",
          addressLine1: "902 Bay St",
          dueBucket: "today",
          householdSize: 1,
          message: "Need one meal today.",
          municipality: "Victoria",
          requestedMealCount: 1,
        }),
        createVolunteerIntake({
          firstName: "Same",
          lastName: "Neighbor",
          canClimbStairs: true,
          canHandleColdChain: false,
          hasVehicleAccess: true,
          homeArea: "Fernwood",
          homeMunicipality: "Victoria",
          message: "Available for a quick route.",
          minutesAvailable: 60,
          windowEnd: "13:00",
          windowStart: "12:00",
        }),
      ]);

      expect(
        new Set([first.intakeId, second.intakeId, volunteer.intakeId]).size
      ).toBe(3);
      expect(
        new Set([first.draftId, second.draftId, volunteer.draftId]).size
      ).toBe(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("ingests only Mealflo Gmail alias messages into pending drafts", async () => {
    const db = getDb();
    const skipped = await createGmailIntake({
      deliveredTo: ["info@capitalreasoning.com"],
      fromEmail: "wrong-alias@example.com",
      id: "gmail-wrong-alias-test",
      rawBody: "Need two meals today at 100 Cook St, Victoria.",
      subject: "Food request",
      to: ["info@capitalreasoning.com"],
    });
    const nearMatch = await createGmailIntake({
      deliveredTo: ["newsletter-info+mealflo@capitalreasoning.com.invalid"],
      fromEmail: "near-match@example.com",
      id: "gmail-near-alias-test",
      rawBody: "Need two meals today at 101 Cook St, Victoria.",
      subject: "Food request",
      to: ["newsletter-info+mealflo@capitalreasoning.com.invalid"],
    });
    const created = await createGmailIntake({
      deliveredTo: ["info+mealflo@capitalreasoning.com"],
      fromEmail: "nora.ng@example.com",
      fromName: "Nora Ng",
      id: "gmail-mealflo-alias-test",
      rawBody:
        "My name is Nora Ng. I need two meals today at 100 Cook St, Victoria. Please call 250-555-8899 from the lobby.",
      subject: "Need meals today",
      to: ["info+mealflo@capitalreasoning.com"],
    });
    const duplicate = await createGmailIntake({
      deliveredTo: ["info+mealflo@capitalreasoning.com"],
      fromEmail: "nora.ng@example.com",
      fromName: "Nora Ng",
      id: "gmail-mealflo-alias-test",
      rawBody:
        "My name is Nora Ng. I need two meals today at 100 Cook St, Victoria.",
      subject: "Need meals today",
      to: ["info+mealflo@capitalreasoning.com"],
    });

    expect(skipped.action).toBe("skipped");
    expect(nearMatch.action).toBe("skipped");
    expect(created.action).toBe("created");
    expect(duplicate.action).toBe("duplicate");

    if (created.action !== "created") {
      throw new Error("Expected staged Gmail message to create a draft.");
    }

    const createdDraftId = created.draftId;
    if (!createdDraftId) {
      throw new Error("Expected staged Gmail result to include a draft id.");
    }

    const [draft] = await db
      .select()
      .from(intakeDrafts)
      .where(eq(intakeDrafts.id, createdDraftId));
    const inbox = await getAdminInboxData();

    expect(draft.draftType).toBe("request");
    expect(draft.status).toBe("pending");
    expect(draft.confidenceScore).toBeGreaterThanOrEqual(70);
    expect(inbox.inboxItems.some((item) => item.id === draft.id)).toBe(true);
  });

  it("keeps ignored Gmail messages hidden across sync and reseed", async () => {
    const gmailMessage = {
      deliveredTo: ["info+mealflo@capitalreasoning.com"],
      fromEmail: "ignored.sender@example.com",
      fromName: "Ignored Sender",
      id: "gmail-ignored-source-test",
      rawBody:
        "My name is Ignored Sender. I need one meal today at 1320 Bond St, Victoria.",
      subject: "Please ignore this one",
      to: ["info+mealflo@capitalreasoning.com"],
    };
    const created = await createGmailIntake(gmailMessage);

    expect(created.action).toBe("created");

    if (created.action !== "created") {
      throw new Error("Expected staged Gmail message to create a draft.");
    }

    const createdDraftId = created.draftId;
    if (!createdDraftId) {
      throw new Error("Expected staged Gmail result to include a draft id.");
    }

    await ignoreDraft(createdDraftId);

    const sameSync = await createGmailIntake(gmailMessage);
    const inboxAfterIgnore = await getAdminInboxData();

    expect(sameSync.action).toBe("ignored");
    expect(
      inboxAfterIgnore.inboxItems.some((item) => item.id === createdDraftId)
    ).toBe(false);

    await seedDemoData();

    const afterReseed = await createGmailIntake(gmailMessage);
    const inboxAfterReseed = await getAdminInboxData();

    expect(afterReseed.action).toBe("ignored");
    expect(
      inboxAfterReseed.inboxItems.some(
        (item) => item.sender === "Ignored Sender"
      )
    ).toBe(false);
  });

  it("approves existing Gmail request drafts without duplicate client errors", async () => {
    const db = getDb();
    const inbox = await getAdminInboxData("draft-request-hillside");

    expect(inbox.selectedItem.accessNotes).toBe(
      "Text before arrival because the buzzer directory is out of date."
    );

    const approved = await approveDraft("draft-request-hillside");
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, "client-amina-yusuf"));

    expect(approved.recordType).toBe("delivery_request");
    expect(client.firstName).toBe("Amina");
    expect(client.accessNotes).toBe(
      "Text before arrival because the buzzer directory is out of date."
    );
  });

  it("approves a volunteer draft into structured volunteer records", async () => {
    const db = getDb();
    const created = await createVolunteerIntake({
      firstName: "Jules",
      lastName: "Meyer",
      homeArea: "Oaklands",
      homeMunicipality: "Victoria",
      minutesAvailable: 60,
      windowStart: "16:30",
      windowEnd: "18:00",
      hasVehicleAccess: true,
      message:
        "Happy to cover a short route after work with my hatchback. Please keep assignments close to Oaklands.",
    });
    const inbox = await getAdminInboxData(created.draftId);

    const approved = await approveDraft(created.draftId);
    const [volunteer] = await db
      .select()
      .from(volunteers)
      .where(eq(volunteers.id, approved.recordId));
    const [availability] = await db
      .select()
      .from(volunteerAvailability)
      .where(eq(volunteerAvailability.volunteerId, approved.recordId));

    expect(inbox.selectedItem.rawParagraphs).toEqual([
      "Happy to cover a short route after work with my hatchback. Please keep assignments close to Oaklands.",
    ]);
    expect(inbox.selectedItem.accessNotes).toBe(
      "Please keep assignments close to Oaklands."
    );
    expect(approved.recordType).toBe("volunteer");
    expect(volunteer.firstName).toBe("Jules");
    expect(volunteer.notes).toBe("Please keep assignments close to Oaklands.");
    expect(availability.minutesAvailable).toBe(60);
    expect(availability.rawText).toBe(
      "Please keep assignments close to Oaklands."
    );
  });

  it("marks a pending draft for manual intake triage", async () => {
    const db = getDb();
    const inbox = await getAdminInboxData();
    const draftId = inbox.selectedItem.draftId;

    if (!draftId) {
      throw new Error("Expected seeded inbox to include a pending draft.");
    }

    const marked = await markDraftOther(draftId);
    const [draft] = await db
      .select()
      .from(intakeDrafts)
      .where(eq(intakeDrafts.id, draftId));

    expect(marked.draftType).toBe("other");
    expect(draft.draftType).toBe("other");
    expect(draft.status).toBe("pending");
    expect(draft.lowConfidenceFields).toContain("draftType");
  });

  it("flags hard route prerequisite failures", () => {
    const issues = evaluateRoutePrerequisites({
      isApproved: false,
      hasCoordinates: false,
      needsColdChain: true,
      vehicleRefrigerated: false,
      driveMinutes: 48,
      stopCount: 6,
      driverMinutesAvailable: 60,
      inventoryAvailable: 0,
    });

    expect(issues).toContain(
      "Request must be approved before it can be routed."
    );
    expect(issues).toContain("Request must have a valid geocoded address.");
    expect(issues).toContain(
      "Requests that need refrigeration require a cooler-ready vehicle."
    );
    expect(issues).toContain("Assigned meal inventory is not available.");
    expect(issues).toContain(
      "Route would exceed the 75% driver availability cap."
    );
  });

  it("returns route map data from the depot through realistic stops", async () => {
    const routesData = await getAdminRoutesData();
    const firstPoint = routesData.routeLine[0];

    expect(routesData.routeLine.length).toBeGreaterThan(2);
    expect(routesData.routeLine.length).toBeGreaterThan(
      routesData.stopRows.length + 1
    );
    expect(firstPoint?.[0]).toBeCloseTo(-123.3748, 3);
    expect(firstPoint?.[1]).toBeCloseTo(48.4291, 3);
    expect(routesData.routePlans[0]?.stopCount).toBeGreaterThan(0);
  });

  it("returns driver route directions with the resolved map geometry", async () => {
    const db = getDb();
    const offer = await getDriverOfferData();
    const route = offer.routeOptions[0];
    const [persistedRoute] = await db.select().from(routes);

    expect(route?.routeDirections.length).toBeGreaterThan(0);
    expect(route?.routeLine.length).toBeGreaterThan(route?.stops.length ?? 0);
    expect(route?.routingProvider).toMatch(/fallback|openrouteservice/);
    expect(persistedRoute?.routeGeometry?.length).toBeGreaterThan(
      route?.stops.length ?? 0
    );
    expect(persistedRoute?.routingWaypointHash).toBeTruthy();
  });

  it("prefers the newest generated public route in driver offers", async () => {
    const created = await createRequestIntake({
      firstName: "Theo",
      lastName: "Driver",
      addressLine1: "608 Johnson Street",
      dueBucket: "today",
      householdSize: 1,
      message: "One meal today would help. Text when you arrive.",
      municipality: "Victoria",
      requestedMealCount: 1,
    });

    await parsePublicIntakeDraft(created.draftId);
    await approveDraft(created.draftId);
    await commitUnroutedPublicTodayRoutes({
      batchId: "driver-offer-test",
      assignments: [],
    });

    const offer = await getDriverOfferData();

    expect(offer.suggestedRoute.routeId).toMatch(
      /^route-public-driver-offer-test/
    );
    expect(offer.routeOptions[0]?.id).toBe(offer.suggestedRoute.routeId);
    expect(offer.availabilityOptions).toContain(180);
  });

  it("persists generated route plans within the time cap", async () => {
    const db = getDb();
    const summary = await generateRoutes();
    const generatedRoutes = await db.select().from(routes);
    const generatedStops = await db.select().from(routeStops);

    expect(summary.routeCount).toBeGreaterThan(0);
    expect(summary.stopCount).toBe(generatedStops.length);
    expect(summary.excludedRequests.length).toBeGreaterThan(0);
    expect(
      generatedRoutes.every(
        (route) =>
          route.plannedTotalMinutes ===
            route.plannedDriveMinutes + route.plannedStopMinutes &&
          route.plannedStopMinutes === route.stopCount * 2 &&
          route.capacityUtilizationPercent <= 75
      )
    ).toBe(true);
  });

  it("parses receipt drafts and confirms inventory entries by layer", async () => {
    const db = getDb();
    const draft = await parseInventoryDocument({
      documentName: "Morning grocery rescue",
      rawText: "12 spinach bags\n8 produce hampers",
      sourceNote: "Morning grocery rescue",
    });
    const ingredientDraft = draft.items.find(
      (item) => item.entryType === "ingredient"
    );
    const mealDraft = draft.items.find((item) => item.entryType === "meal");

    expect(draft.confidence).toBeGreaterThan(70);
    expect(ingredientDraft?.perishability.label).toBe("Use today");
    expect(mealDraft?.name).toBe("Produce Hamper");

    if (!ingredientDraft || !mealDraft) {
      throw new Error(
        "Expected one ingredient and one deliverable meal draft."
      );
    }

    const ingredient = await recordManualInventoryEntry({
      entryType: "ingredient",
      name: ingredientDraft.name,
      notes: ingredientDraft.notes,
      perishabilityLabel: ingredientDraft.perishability.label,
      perishabilityScore: ingredientDraft.perishability.score,
      quantity: ingredientDraft.quantity,
      refrigerated: ingredientDraft.refrigerated,
      sourceReference: "Morning grocery rescue",
      sourceType: ingredientDraft.sourceType,
      unit: ingredientDraft.unit,
    });
    const meal = await recordManualInventoryEntry({
      allergenFlags: mealDraft.allergenFlags,
      category: mealDraft.category,
      dietaryTags: mealDraft.dietaryTags,
      entryType: "meal",
      name: mealDraft.name,
      quantity: mealDraft.quantity,
      refrigerated: mealDraft.refrigerated,
      sourceReference: "Morning grocery rescue",
      unit: mealDraft.unit,
    });
    const [savedIngredient] = await db
      .select()
      .from(ingredientItems)
      .where(eq(ingredientItems.id, ingredient.id));
    const [savedMeal] = await db
      .select()
      .from(deliverableMeals)
      .where(eq(deliverableMeals.id, meal.id));

    expect(savedIngredient.perishabilityScore).toBe(5);
    expect(savedMeal.category).toBe("hamper");
  });

  it("surfaces shortage holds and sorts ingredients by perishability", async () => {
    const inventory = await getAdminInventoryData();

    expect(inventory.shortageNotes.length).toBeGreaterThan(0);
    expect(
      inventory.shortageNotes.map((note) => note.reason).join(" ")
    ).toMatch(/stock|refrigerat|cooler/i);
    expect(inventory.ingredients[0]?.perishabilityScore).toBeGreaterThanOrEqual(
      inventory.ingredients.at(-1)?.perishabilityScore ?? 0
    );
  });

  it("resets anchor-session state for a route", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));
    const routeSessions = await db
      .select()
      .from(driverSessions)
      .where(eq(driverSessions.routeId, "route-victoria-core"));
    const stops = await db
      .select()
      .from(routeStops)
      .where(eq(routeStops.routeId, "route-victoria-core"));

    expect(route.status).toBe("reset");
    expect(route.dashboardAnchorSessionId).toBeNull();
    expect(route.deliveredCount).toBe(0);
    expect(route.remainingCount).toBe(route.stopCount);
    expect(stops.every((stop) => stop.status === "planned")).toBe(true);
    expect(routeSessions.every((session) => session.isAnchor === false)).toBe(
      true
    );
    expect(routeSessions.every((session) => session.status === "reset")).toBe(
      true
    );
  });

  it("approves a reset route for driver pickup", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });
    const approved = await approveRoute({ routeId: "route-victoria-core" });

    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));
    const stops = await db
      .select()
      .from(routeStops)
      .where(eq(routeStops.routeId, "route-victoria-core"));
    const firstStop = stops.find((stop) => stop.sequence === 1);
    const laterStops = stops.filter((stop) => stop.sequence !== 1);

    expect(approved.status).toBe("approved");
    expect(route.status).toBe("approved");
    expect(route.dashboardAnchorSessionId).toBeNull();
    expect(route.deliveredCount).toBe(0);
    expect(route.remainingCount).toBe(route.stopCount);
    expect(firstStop?.status).toBe("ready");
    expect(laterStops.every((stop) => stop.status === "planned")).toBe(true);
  });

  it("keeps the first active route session as the dashboard anchor", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    const first = await startDriverSession({
      deviceFingerprint: "phone-one",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const second = await startDriverSession({
      deviceFingerprint: "phone-two",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));

    expect(first.isAnchor).toBe(true);
    expect(second.isAnchor).toBe(false);
    expect(route.dashboardAnchorSessionId).toBe(first.id);
  });

  it("resumes the same device session when a driver page opens twice", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    const deviceFingerprint = "driver-8c4d91d0-7344-4f01-9d85-bbcf350a0a20";
    const first = await startDriverSession({
      deviceFingerprint,
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const resumed = await startDriverSession({
      currentLat: 48.431,
      currentLng: -123.365,
      deviceFingerprint,
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const sessions = await db
      .select()
      .from(driverSessions)
      .where(eq(driverSessions.routeId, "route-victoria-core"));
    const activeSameDeviceSessions = sessions.filter(
      (session) =>
        session.deviceFingerprint === deviceFingerprint &&
        session.status === "active"
    );

    expect(resumed.id).toBe(first.id);
    expect(resumed.currentLat).toBeCloseTo(48.431, 3);
    expect(resumed.isAnchor).toBe(true);
    expect(activeSameDeviceSessions).toHaveLength(1);
    expect(activeSameDeviceSessions[0]!.id.length).toBeLessThanOrEqual(64);
  });

  it("does not let a shadow phone update dashboard progress", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    await startDriverSession({
      deviceFingerprint: "anchor-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const shadow = await startDriverSession({
      deviceFingerprint: "shadow-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });

    await heartbeatDriverSession({
      currentLat: 48.43,
      currentLng: -123.36,
      currentStopIndex: 2,
      deliveredCountLocal: 2,
      sessionId: shadow.id,
    });

    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));

    expect(route.deliveredCount).toBe(0);
    expect(route.remainingCount).toBe(route.stopCount);
  });

  it("treats could-not-deliver stops as completed progress", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    const session = await startDriverSession({
      deviceFingerprint: "could-not-deliver-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const stopRows = await db
      .select()
      .from(routeStops)
      .where(eq(routeStops.routeId, "route-victoria-core"));
    const [firstStop] = stopRows.sort(
      (left, right) => left.sequence - right.sequence
    );

    if (!firstStop) {
      throw new Error(
        "Expected route-victoria-core to have at least one stop."
      );
    }

    await completeDriverStop({
      sessionId: session.id,
      status: "could_not_deliver",
      stopId: firstStop.id,
    });

    const active = await getDriverActiveData("route-victoria-core");
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));

    expect(active.currentStop.id).not.toBe(firstStop.id);
    expect(route.deliveredCount).toBe(0);
    expect(route.remainingCount).toBe(route.stopCount - 1);
  });

  it("shows one live driver marker per route when duplicate phones join", async () => {
    await resetRouteSession({ routeId: "route-victoria-core" });

    const first = await startDriverSession({
      currentLat: 48.431,
      currentLng: -123.365,
      deviceFingerprint: "map-anchor-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const second = await startDriverSession({
      currentLat: 48.49,
      currentLng: -123.41,
      deviceFingerprint: "map-shadow-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });

    await heartbeatDriverSession({
      currentLat: 48.432,
      currentLng: -123.366,
      currentStopIndex: 0,
      deliveredCountLocal: 0,
      sessionId: first.id,
    });
    await heartbeatDriverSession({
      currentLat: 48.491,
      currentLng: -123.411,
      currentStopIndex: 2,
      deliveredCountLocal: 2,
      sessionId: second.id,
    });

    const dashboard = await getAdminDashboardData();
    const routeDriverMarkers = dashboard.liveMarkers.filter(
      (marker) => marker.id === "driver-route-victoria-core"
    );

    expect(routeDriverMarkers).toHaveLength(1);
    expect(routeDriverMarkers[0]?.icon).toBe("delivery-van");
    expect(routeDriverMarkers[0]?.latitude).toBeCloseTo(48.432, 3);
    expect(routeDriverMarkers[0]?.longitude).toBeCloseTo(-123.366, 3);
  });

  it("elects a new anchor after the previous anchor is lost", async () => {
    const db = getDb();

    await resetRouteSession({ routeId: "route-victoria-core" });

    const first = await startDriverSession({
      deviceFingerprint: "lost-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });
    const second = await startDriverSession({
      deviceFingerprint: "replacement-phone",
      routeId: "route-victoria-core",
      volunteerId: "volunteer-rosa-martinez",
    });

    await db
      .update(driverSessions)
      .set({
        lastSeenAt: new Date(Date.now() - 5 * 60_000),
      })
      .where(eq(driverSessions.id, first.id));

    const heartbeat = await heartbeatDriverSession({
      currentLat: 48.43,
      currentLng: -123.36,
      currentStopIndex: 1,
      deliveredCountLocal: 1,
      sessionId: second.id,
    });
    const [route] = await db
      .select()
      .from(routes)
      .where(eq(routes.id, "route-victoria-core"));

    expect(heartbeat.isAnchor).toBe(true);
    expect(route.dashboardAnchorSessionId).toBe(second.id);
    expect(route.deliveredCount).toBe(1);
  });

  it("supports a clean reset followed by reseed", async () => {
    const db = getDb();

    await resetDemoData();

    const clearedRouteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(routes);

    expect(Number(clearedRouteCount[0]?.count ?? 0)).toBe(0);

    await seedDemoData();

    const seededRouteCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(routes);

    expect(Number(seededRouteCount[0]?.count ?? 0)).toBeGreaterThan(0);
  });

  it("reset-and-seed removes custom public requests and generated routes", async () => {
    const db = getDb();
    const baseline = {
      clients: await db.select({ count: sql<number>`count(*)` }).from(clients),
      requests: await db
        .select({ count: sql<number>`count(*)` })
        .from(deliveryRequests),
      routes: await db.select({ count: sql<number>`count(*)` }).from(routes),
    };
    const created = await createRequestIntake({
      firstName: "Reset",
      lastName: "Case",
      addressLine1: "912 Pandora Avenue",
      dueBucket: "today",
      householdSize: 1,
      message: "Please leave the meals with the front desk.",
      municipality: "Victoria",
      requestedMealCount: 2,
    });

    await parsePublicIntakeDraft(created.draftId);
    await approveDraft(created.draftId);
    await commitUnroutedPublicTodayRoutes({
      batchId: "reset-flow-test",
      assignments: [],
    });

    const customRoutesBefore = await db
      .select()
      .from(routes)
      .where(sql`${routes.id} like 'route-public-reset-flow-test%'`);

    expect(customRoutesBefore).toHaveLength(1);

    await resetAndSeedDemoData();
    await resetAndSeedDemoData();

    const customRoutesAfter = await db
      .select()
      .from(routes)
      .where(sql`${routes.id} like 'route-public-reset-flow-test%'`);
    const customIntakesAfter = await db
      .select()
      .from(intakeMessages)
      .where(eq(intakeMessages.id, created.intakeId));
    const countsAfter = {
      clients: await db.select({ count: sql<number>`count(*)` }).from(clients),
      requests: await db
        .select({ count: sql<number>`count(*)` })
        .from(deliveryRequests),
      routes: await db.select({ count: sql<number>`count(*)` }).from(routes),
    };

    expect(customRoutesAfter).toHaveLength(0);
    expect(customIntakesAfter).toHaveLength(0);
    expect(Number(countsAfter.clients[0]?.count ?? 0)).toBe(
      Number(baseline.clients[0]?.count ?? 0)
    );
    expect(Number(countsAfter.requests[0]?.count ?? 0)).toBe(
      Number(baseline.requests[0]?.count ?? 0)
    );
    expect(Number(countsAfter.routes[0]?.count ?? 0)).toBe(
      Number(baseline.routes[0]?.count ?? 0)
    );
  });
});

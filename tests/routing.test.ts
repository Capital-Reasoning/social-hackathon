import { describe, expect, it } from "vitest";

import {
  generateRoutePlans,
  getRouteBudget,
  scoreRouteRequest,
  type PlannerAvailability,
  type PlannerDepot,
  type PlannerMeal,
  type PlannerRequest,
  type PlannerVehicle,
  type PlannerVolunteer,
} from "@/server/mealflo/routing";
import {
  PUBLIC_ROUTE_MAX_TOTAL_MINUTES,
  generateUnroutedPublicTodayRoutePlans,
  selectUnroutedPublicTodayRequests,
  type PublicScopedPlannerRequest,
} from "@/server/mealflo/public-routing";

const depot: PlannerDepot = {
  id: "depot-test",
  latitude: 48.4291,
  longitude: -123.3748,
  name: "Victoria Central Depot",
};

const refrigeratedVehicle: PlannerVehicle = {
  capacityMeals: 20,
  homeDepotId: depot.id,
  id: "vehicle-cold",
  name: "Cold van",
  refrigerated: true,
  wheelchairLift: false,
};

const standardVehicle: PlannerVehicle = {
  ...refrigeratedVehicle,
  id: "vehicle-standard",
  name: "Standard car",
  refrigerated: false,
};

const volunteer: PlannerVolunteer = {
  active: true,
  canHandleColdChain: true,
  canHandleWheelchair: false,
  firstName: "Rosa",
  hasVehicleAccess: true,
  id: "volunteer-rosa",
  lastName: "Martinez",
  preferredVehicleId: refrigeratedVehicle.id,
};

const availability: PlannerAvailability = {
  date: "2026-04-23",
  id: "availability-rosa",
  minutesAvailable: 60,
  volunteerId: volunteer.id,
  windowEnd: "13:00",
  windowStart: "10:00",
};

const meals: PlannerMeal[] = [
  {
    allergenFlags: [],
    dietaryTags: ["high_protein"],
    id: "meal-chicken",
    name: "Roast chicken",
    quantityAvailable: 12,
    refrigerated: true,
    unitLabel: "tray",
  },
  {
    allergenFlags: [],
    dietaryTags: ["vegetarian"],
    id: "meal-soup",
    name: "Vegetable soup",
    quantityAvailable: 12,
    refrigerated: false,
    unitLabel: "container",
  },
];

function request(overrides: Partial<PlannerRequest>): PlannerRequest {
  return {
    accessSummary: "Buzz from the lobby.",
    addressLine: "1312 Gladstone Ave, Victoria",
    allergenFlags: [],
    approvedAt: new Date("2026-04-23T08:00:00-07:00"),
    approvedMealCount: 2,
    clientId: "client-test",
    clientName: "Mabel Hart",
    coldChainRequired: false,
    dietaryTags: [],
    doNotEnter: false,
    dueBucket: "today",
    householdSize: 1,
    id: "request-test",
    latitude: 48.4275,
    longitude: -123.3522,
    municipality: "Victoria",
    neighborhood: "Fernwood",
    originalMessageExcerpt: "Two meals would help today.",
    requestKind: "meal_delivery",
    requestedItems: [{ mealId: "meal-soup", quantity: 2 }],
    requiresTwoPerson: false,
    routingHoldReason: null,
    safeToLeave: false,
    status: "approved",
    urgencyScore: 80,
    usesWheelchair: false,
    ...overrides,
  };
}

function publicRequest(
  overrides: Partial<PublicScopedPlannerRequest>
): PublicScopedPlannerRequest {
  return {
    ...request(overrides),
    assignedRouteId: null,
    scheduledDate: "2026-04-23",
    sourceChannel: "public_form",
    ...overrides,
  };
}

describe("routing planner", () => {
  it("scores urgent requests ahead of lower urgency household impact", () => {
    const urgent = request({
      householdSize: 1,
      id: "urgent",
      urgencyScore: 94,
    });
    const largeHousehold = request({
      householdSize: 5,
      id: "large-household",
      urgencyScore: 70,
    });

    expect(scoreRouteRequest(urgent)).toBeGreaterThan(
      scoreRouteRequest(largeHousehold)
    );
  });

  it("honors the 66% to 75% budget band without crossing the cap", () => {
    const result = generateRoutePlans({
      availability: [availability],
      baseDates: {
        later: "2026-04-26",
        today: "2026-04-23",
        tomorrow: "2026-04-24",
      },
      depots: [depot],
      meals,
      requests: [
        request({
          id: "request-fernwood",
          latitude: 48.4275,
          longitude: -123.3522,
        }),
        request({
          id: "request-north-park",
          latitude: 48.4309,
          longitude: -123.3624,
        }),
        request({
          id: "request-sooke",
          latitude: 48.3734,
          longitude: -123.7317,
        }),
      ],
      vehicles: [refrigeratedVehicle],
      volunteers: [volunteer],
    });
    const budget = getRouteBudget(availability.minutesAvailable);

    expect(result.plans.length).toBe(1);
    expect(result.plans[0]?.plannedTotalMinutes).toBeLessThanOrEqual(
      budget.upperCapMinutes
    );
    expect(result.plans[0]?.plannedStopMinutes).toBe(
      (result.plans[0]?.stopCount ?? 0) * 2
    );
  });

  it("pulls a compatible tomorrow stop forward when it fits the cluster", () => {
    const result = generateRoutePlans({
      availability: [availability],
      baseDates: {
        later: "2026-04-26",
        today: "2026-04-23",
        tomorrow: "2026-04-24",
      },
      depots: [depot],
      meals,
      requests: [
        request({
          id: "request-today",
          latitude: 48.4275,
          longitude: -123.3522,
        }),
        request({
          dueBucket: "tomorrow",
          id: "request-tomorrow-nearby",
          latitude: 48.4309,
          longitude: -123.3624,
        }),
      ],
      vehicles: [refrigeratedVehicle],
      volunteers: [volunteer],
    });
    const stopIds = result.plans.flatMap((plan) =>
      plan.stops.map((stop) => stop.requestId)
    );

    expect(stopIds).toContain("request-tomorrow-nearby");
    expect(result.plans[0]?.routeExplanation).toContain("pulled forward");
  });

  it("excludes refrigeration and inventory failures cleanly", () => {
    const noColdVolunteer = {
      ...volunteer,
      preferredVehicleId: standardVehicle.id,
    };
    const result = generateRoutePlans({
      availability: [availability],
      baseDates: {
        later: "2026-04-26",
        today: "2026-04-23",
        tomorrow: "2026-04-24",
      },
      depots: [depot],
      meals: [
        {
          ...meals[0]!,
          allergenFlags: ["peanut"],
          id: "meal-peanut",
          quantityAvailable: 1,
        },
      ],
      requests: [
        request({
          coldChainRequired: true,
          id: "request-cold",
          requestedItems: [{ mealId: "meal-peanut", quantity: 1 }],
        }),
        request({
          allergenFlags: ["peanut"],
          id: "request-allergy",
          requestedItems: [{ mealId: "meal-peanut", quantity: 1 }],
        }),
      ],
      vehicles: [standardVehicle],
      volunteers: [noColdVolunteer],
    });

    expect(result.plans).toHaveLength(0);
    expect(result.excludedRequests.map((entry) => entry.requestId)).toEqual(
      expect.arrayContaining(["request-cold", "request-allergy"])
    );
  });

  it("scopes public today route generation away from seeded and assigned requests", () => {
    const scoped = selectUnroutedPublicTodayRequests(
      [
        publicRequest({ id: "request-public-today" }),
        publicRequest({
          id: "request-seeded",
          sourceChannel: "manual_entry",
        }),
        publicRequest({
          assignedRouteId: "route-existing",
          id: "request-already-routed",
        }),
        publicRequest({
          id: "request-public-tomorrow",
          scheduledDate: "2026-04-24",
        }),
      ],
      {
        later: "2026-04-26",
        today: "2026-04-23",
        tomorrow: "2026-04-24",
      }
    );

    expect(scoped.map((entry) => entry.id)).toEqual(["request-public-today"]);
  });

  it("splits large public-form batches so no generated route exceeds 3 hours", () => {
    const manyRequests = Array.from({ length: 96 }, (_, index) =>
      publicRequest({
        addressLine: `${800 + index} Cook St, Victoria`,
        clientId: `client-public-${index}`,
        clientName: `Public Neighbour ${index}`,
        id: `request-public-${index}`,
        latitude: 48.414 + (index % 16) * 0.0014,
        longitude: -123.36 + Math.floor(index / 16) * 0.0015,
        requestedItems: [{ mealId: "meal-soup", quantity: 1 }],
      })
    );
    const result = generateUnroutedPublicTodayRoutePlans({
      availability: [availability],
      baseDates: {
        later: "2026-04-26",
        today: "2026-04-23",
        tomorrow: "2026-04-24",
      },
      batchId: "pure-test",
      depots: [depot],
      meals: [{ ...meals[1]!, quantityAvailable: 140 }],
      requests: manyRequests,
      vehicles: [refrigeratedVehicle],
      volunteers: [volunteer],
    });

    expect(result.plans.length).toBeGreaterThan(1);
    expect(
      result.plans.every(
        (plan) => plan.plannedTotalMinutes <= PUBLIC_ROUTE_MAX_TOTAL_MINUTES
      )
    ).toBe(true);
  });
});

export type DueBucket = "today" | "tomorrow" | "later";
export type RequestStatus =
  | "approved"
  | "assigned"
  | "cancelled"
  | "delivered"
  | "draft"
  | "held"
  | "out_for_delivery";

export type PlannerDepot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export type PlannerVehicle = {
  id: string;
  name: string;
  refrigerated: boolean;
  wheelchairLift: boolean;
  capacityMeals: number;
  homeDepotId: string;
};

export type PlannerVolunteer = {
  active: boolean;
  canHandleColdChain: boolean;
  canHandleWheelchair: boolean;
  firstName: string;
  hasVehicleAccess: boolean;
  id: string;
  lastName: string;
  preferredVehicleId?: string | null;
};

export type PlannerAvailability = {
  date: string;
  id: string;
  minutesAvailable: number;
  volunteerId: string;
  windowEnd: string;
  windowStart: string;
};

export type PlannerMeal = {
  allergenFlags: string[];
  dietaryTags: string[];
  id: string;
  name: string;
  quantityAvailable: number;
  refrigerated: boolean;
  unitLabel: string;
};

export type RequestedMealItem = {
  mealId: string;
  quantity: number;
};

export type PlannerRequest = {
  accessSummary?: string | null;
  addressLine: string;
  allergenFlags: string[];
  approvedAt?: Date | null;
  approvedMealCount: number;
  clientId: string;
  clientName: string;
  coldChainRequired: boolean;
  dietaryTags: string[];
  doNotEnter: boolean;
  dueBucket: DueBucket;
  householdSize: number;
  id: string;
  latitude: number | null;
  longitude: number | null;
  municipality: string;
  neighborhood?: string | null;
  originalMessageExcerpt?: string | null;
  requestKind: "grocery_hamper" | "meal_delivery";
  requestedItems?: RequestedMealItem[];
  requiresTwoPerson: boolean;
  routingHoldReason?: string | null;
  safeToLeave: boolean;
  status: RequestStatus;
  urgencyScore: number;
  usesWheelchair: boolean;
};

export type RouteMealAllocation = {
  allergenFlags: string[];
  dietaryTags: string[];
  mealId: string;
  mealNameSnapshot: string;
  quantity: number;
  refrigerated: boolean;
  unitLabel: string;
};

export type GeneratedRouteStop = {
  accessSummary: string;
  addressLine: string;
  clientId: string;
  clientName: string;
  dueBucketOrigin: DueBucket;
  eta: Date;
  id: string;
  itemSummary: string;
  latitude: number;
  longitude: number;
  mealItems: RouteMealAllocation[];
  mealSummary: string;
  originalMessageExcerpt: string | null;
  requestId: string;
  sequence: number;
};

export type GeneratedRoutePlan = {
  areaLabel: string;
  capacityUtilizationPercent: number;
  driverMinutesAvailable: number;
  id: string;
  lowerTargetMinutes: number;
  plannedDriveMinutes: number;
  plannedStopMinutes: number;
  plannedTotalMinutes: number;
  routeExplanation: string;
  routeName: string;
  serviceDate: string;
  startDepotId: string;
  status: "approved" | "planned";
  stopCount: number;
  stops: GeneratedRouteStop[];
  upperCapMinutes: number;
  vehicleId: string;
  volunteerId: string;
  warnings: string[];
};

export type RouteGenerationExclusion = {
  requestId: string;
  reason: string;
};

export type RouteGenerationResult = {
  excludedRequests: RouteGenerationExclusion[];
  plans: GeneratedRoutePlan[];
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

type RouteCandidate = PlannerRequest & Coordinate;

type AllocationResult =
  | {
      mealItems: RouteMealAllocation[];
      ok: true;
    }
  | {
      ok: false;
      reason: string;
    };

const eligibleRequestStatuses = new Set<RequestStatus>([
  "approved",
  "assigned",
  "out_for_delivery",
]);

const bucketWeight: Record<DueBucket, number> = {
  today: 90,
  tomorrow: 22,
  later: 8,
};

const bucketRank: Record<DueBucket, number> = {
  today: 0,
  tomorrow: 1,
  later: 2,
};

const clusterLabels: Record<string, string> = {
  "oak-bay-jubilee": "Oak Bay and Jubilee",
  peninsula: "Peninsula",
  saanich: "Saanich",
  "victoria-core": "Victoria core",
  "west-side": "Vic West and Esquimalt",
  "west-shore": "West Shore",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getRouteBudget(minutesAvailable: number) {
  return {
    lowerTargetMinutes: Math.ceil(minutesAvailable * 0.66),
    upperCapMinutes: Math.floor(minutesAvailable * 0.75),
  };
}

export function estimateDriveMinutes(from: Coordinate, to: Coordinate): number {
  const earthKm = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const lat1 = (from.latitude * Math.PI) / 180;
  const lat2 = (to.latitude * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const distanceKm = 2 * earthKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.max(3, Math.ceil((distanceKm / 32) * 60 + 2));
}

export function calculateRouteDriveMinutes(
  depot: Coordinate,
  stops: Coordinate[]
) {
  if (stops.length === 0) {
    return 0;
  }

  let driveMinutes = 0;
  let previous = depot;

  for (const stop of stops) {
    driveMinutes += estimateDriveMinutes(previous, stop);
    previous = stop;
  }

  return driveMinutes;
}

export function getRouteCluster(request: {
  latitude: number;
  longitude: number;
  municipality: string;
  neighborhood?: string | null;
}) {
  const municipality = request.municipality.toLowerCase();
  const neighborhood = request.neighborhood?.toLowerCase() ?? "";

  if (
    municipality.includes("sidney") ||
    request.latitude > 48.55 ||
    neighborhood.includes("peninsula")
  ) {
    return "peninsula";
  }

  if (
    municipality.includes("langford") ||
    municipality.includes("colwood") ||
    municipality.includes("metchosin") ||
    municipality.includes("sooke") ||
    request.longitude < -123.45
  ) {
    return "west-shore";
  }

  if (
    municipality.includes("esquimalt") ||
    neighborhood.includes("vic west") ||
    request.longitude < -123.385
  ) {
    return "west-side";
  }

  if (
    municipality.includes("oak bay") ||
    neighborhood.includes("jubilee") ||
    request.longitude > -123.34
  ) {
    return "oak-bay-jubilee";
  }

  if (municipality.includes("saanich") || request.latitude > 48.45) {
    return "saanich";
  }

  return "victoria-core";
}

export function scoreRouteRequest(request: PlannerRequest) {
  const urgency = request.urgencyScore * 3.2;
  const householdImpact = request.householdSize * 14;
  const mealImpact = request.approvedMealCount * 5;
  const perishability = request.coldChainRequired ? 18 : 0;
  const continuity = request.approvedAt ? 8 : 0;
  const due = bucketWeight[request.dueBucket];
  const safetyPenalty =
    (request.requiresTwoPerson ? 5 : 0) + (request.usesWheelchair ? 4 : 0);

  return (
    due +
    urgency +
    householdImpact +
    mealImpact +
    perishability +
    continuity -
    safetyPenalty
  );
}

function hasAllergenConflict(meal: PlannerMeal, request: PlannerRequest) {
  const blockers = new Set(
    request.allergenFlags.map((entry) => entry.toLowerCase())
  );

  return meal.allergenFlags.some((flag) => blockers.has(flag.toLowerCase()));
}

function hasDietaryFit(meal: PlannerMeal, request: PlannerRequest) {
  if (request.dietaryTags.length === 0) {
    return true;
  }

  const mealTags = new Set(
    meal.dietaryTags.map((entry) => entry.toLowerCase())
  );

  return request.dietaryTags.some((tag) => mealTags.has(tag.toLowerCase()));
}

function describeMealItems(items: RouteMealAllocation[]) {
  return items.map((item) => `${item.quantity} ${item.mealNameSnapshot}`);
}

function summarizeUnits(items: RouteMealAllocation[]) {
  return items.map((item) => `${item.quantity} ${item.unitLabel}`);
}

function allocateRequestedItems({
  inventory,
  mealsById,
  request,
}: {
  inventory: Map<string, number>;
  mealsById: Map<string, PlannerMeal>;
  request: PlannerRequest;
}): AllocationResult {
  const allocated: RouteMealAllocation[] = [];
  const requestedItems = request.requestedItems ?? [];

  if (requestedItems.length > 0) {
    for (const item of requestedItems) {
      const meal = mealsById.get(item.mealId);

      if (!meal) {
        return {
          ok: false,
          reason: "Requested meal item is no longer available.",
        };
      }

      if (hasAllergenConflict(meal, request)) {
        return {
          ok: false,
          reason: `${meal.name} conflicts with an allergy flag.`,
        };
      }

      if ((inventory.get(meal.id) ?? 0) < item.quantity) {
        return {
          ok: false,
          reason: `${meal.name} inventory is short for this stop.`,
        };
      }

      allocated.push({
        allergenFlags: meal.allergenFlags,
        dietaryTags: meal.dietaryTags,
        mealId: meal.id,
        mealNameSnapshot: meal.name,
        quantity: item.quantity,
        refrigerated: meal.refrigerated,
        unitLabel: meal.unitLabel,
      });
    }

    return { ok: true, mealItems: allocated };
  }

  let remaining = request.approvedMealCount;
  const meals = Array.from(mealsById.values())
    .filter((meal) => !hasAllergenConflict(meal, request))
    .filter((meal) => (inventory.get(meal.id) ?? 0) > 0)
    .sort((left, right) => {
      const leftDietFit = hasDietaryFit(left, request) ? 1 : 0;
      const rightDietFit = hasDietaryFit(right, request) ? 1 : 0;
      const leftKindFit =
        request.requestKind === "grocery_hamper" && left.unitLabel === "hamper"
          ? 1
          : 0;
      const rightKindFit =
        request.requestKind === "grocery_hamper" && right.unitLabel === "hamper"
          ? 1
          : 0;
      const leftColdFit =
        request.coldChainRequired && left.refrigerated ? 1 : 0;
      const rightColdFit =
        request.coldChainRequired && right.refrigerated ? 1 : 0;

      return (
        rightKindFit - leftKindFit ||
        rightDietFit - leftDietFit ||
        rightColdFit - leftColdFit ||
        right.quantityAvailable - left.quantityAvailable ||
        left.name.localeCompare(right.name)
      );
    });

  for (const meal of meals) {
    if (remaining <= 0) {
      break;
    }

    const available = inventory.get(meal.id) ?? 0;
    const quantity = Math.min(available, remaining);

    if (quantity <= 0) {
      continue;
    }

    allocated.push({
      allergenFlags: meal.allergenFlags,
      dietaryTags: meal.dietaryTags,
      mealId: meal.id,
      mealNameSnapshot: meal.name,
      quantity,
      refrigerated: meal.refrigerated,
      unitLabel: meal.unitLabel,
    });
    remaining -= quantity;
  }

  if (remaining > 0) {
    return {
      ok: false,
      reason: "Not enough compatible deliverable meal inventory.",
    };
  }

  return { ok: true, mealItems: allocated };
}

function applyAllocation(
  inventory: Map<string, number>,
  mealItems: RouteMealAllocation[]
) {
  for (const item of mealItems) {
    inventory.set(
      item.mealId,
      (inventory.get(item.mealId) ?? 0) - item.quantity
    );
  }
}

function sameCluster(left: RouteCandidate, right: RouteCandidate) {
  return getRouteCluster(left) === getRouteCluster(right);
}

function findBestInsertion({
  candidate,
  depot,
  stops,
}: {
  candidate: RouteCandidate;
  depot: PlannerDepot;
  stops: RouteCandidate[];
}) {
  if (stops.length === 0) {
    return {
      driveMinutes: calculateRouteDriveMinutes(depot, [candidate]),
      extraDriveMinutes: calculateRouteDriveMinutes(depot, [candidate]),
      index: 0,
    };
  }

  const currentDriveMinutes = calculateRouteDriveMinutes(depot, stops);
  let best = {
    driveMinutes: Number.POSITIVE_INFINITY,
    extraDriveMinutes: Number.POSITIVE_INFINITY,
    index: stops.length,
  };

  for (let index = 0; index <= stops.length; index += 1) {
    const nextStops = stops.slice();
    nextStops.splice(index, 0, candidate);
    const driveMinutes = calculateRouteDriveMinutes(depot, nextStops);
    const extraDriveMinutes = driveMinutes - currentDriveMinutes;

    if (driveMinutes < best.driveMinutes) {
      best = { driveMinutes, extraDriveMinutes, index };
    }
  }

  return best;
}

function toCandidate(request: PlannerRequest): RouteCandidate | null {
  if (request.latitude === null || request.longitude === null) {
    return null;
  }

  return {
    ...request,
    latitude: request.latitude,
    longitude: request.longitude,
  };
}

function isHardEligible({
  request,
  vehicle,
}: {
  request: PlannerRequest;
  vehicle: PlannerVehicle;
}) {
  if (!eligibleRequestStatuses.has(request.status)) {
    return "Only approved requests can be routed.";
  }

  if (request.routingHoldReason && request.status === "held") {
    return request.routingHoldReason;
  }

  if (request.latitude === null || request.longitude === null) {
    return "A valid geocoded address is required.";
  }

  if (request.coldChainRequired && !vehicle.refrigerated) {
    return "Requests that need refrigeration require a cooler-ready vehicle.";
  }

  if (request.usesWheelchair && !vehicle.wheelchairLift) {
    return "Wheelchair access needs the lift-equipped vehicle.";
  }

  return null;
}

function servicePrimaryBucket(
  date: string,
  baseDates: Record<DueBucket, string>
) {
  if (date <= baseDates.today) {
    return "today" as const;
  }

  if (date <= baseDates.tomorrow) {
    return "tomorrow" as const;
  }

  return "later" as const;
}

function routeStartTime(date: string, windowStart: string) {
  return new Date(`${date}T${windowStart}:00-07:00`);
}

function areaLabelFromStops(stops: RouteCandidate[]) {
  const first = stops[0];

  if (!first) {
    return "Route area";
  }

  return clusterLabels[getRouteCluster(first)] ?? "Route area";
}

function buildExplanation({
  earlyStops,
  plan,
  priorityStops,
}: {
  earlyStops: number;
  plan: Pick<
    GeneratedRoutePlan,
    | "capacityUtilizationPercent"
    | "plannedDriveMinutes"
    | "plannedTotalMinutes"
    | "stopCount"
  >;
  priorityStops: number;
}) {
  const parts = [
    `${plan.stopCount} stops fit in ${plan.plannedTotalMinutes} minutes with ${plan.plannedDriveMinutes} minutes of drive time.`,
    `${priorityStops} high-urgency stops are covered first.`,
    `The route uses ${plan.capacityUtilizationPercent}% of the driver's available window.`,
  ];

  if (earlyStops > 0) {
    parts.push(
      `${earlyStops} compatible later stop${earlyStops === 1 ? "" : "s"} pulled forward.`
    );
  }

  return parts.join(" ");
}

function makeStop({
  depot,
  index,
  request,
  routeStart,
  selectedStops,
  mealItems,
}: {
  depot: PlannerDepot;
  index: number;
  mealItems: RouteMealAllocation[];
  request: RouteCandidate;
  routeStart: Date;
  selectedStops: RouteCandidate[];
}) {
  const driveToStop = calculateRouteDriveMinutes(
    depot,
    selectedStops.slice(0, index + 1)
  );
  const serviceMinutesBefore = index * 2;
  const eta = new Date(
    routeStart.getTime() + (driveToStop + serviceMinutesBefore) * 60_000
  );
  const mealSummary = describeMealItems(mealItems).join(", ");
  const itemSummary = summarizeUnits(mealItems).join(", ");

  return {
    accessSummary: request.accessSummary ?? "Standard door handoff.",
    addressLine: request.addressLine,
    clientId: request.clientId,
    clientName: request.clientName,
    dueBucketOrigin: request.dueBucket,
    eta,
    id: `stop-${request.id}`,
    itemSummary,
    latitude: request.latitude,
    longitude: request.longitude,
    mealItems,
    mealSummary,
    originalMessageExcerpt: request.originalMessageExcerpt ?? null,
    requestId: request.id,
    sequence: index + 1,
  } satisfies GeneratedRouteStop;
}

function requestSort(left: PlannerRequest, right: PlannerRequest) {
  return (
    bucketRank[left.dueBucket] - bucketRank[right.dueBucket] ||
    scoreRouteRequest(right) - scoreRouteRequest(left) ||
    left.clientName.localeCompare(right.clientName)
  );
}

function buildRouteWarnings(
  stops: RouteCandidate[],
  total: number,
  lower: number
) {
  const warnings: string[] = [];

  if (total < lower) {
    warnings.push(
      "Below the 66% target because no compatible nearby stop fit cleanly."
    );
  }

  if (stops.some((stop) => stop.requiresTwoPerson)) {
    warnings.push(
      "One stop needs two-person support confirmed before dispatch."
    );
  }

  if (stops.some((stop) => stop.doNotEnter)) {
    warnings.push("Do-not-enter access note is surfaced for the driver.");
  }

  if (stops.some((stop) => stop.safeToLeave)) {
    warnings.push("Safe-to-leave stops need bag placement checked at handoff.");
  }

  return warnings;
}

function buildExclusionReason({
  depots,
  meals,
  request,
  vehicles,
}: {
  depots: PlannerDepot[];
  meals: PlannerMeal[];
  request: PlannerRequest;
  vehicles: PlannerVehicle[];
}) {
  if (!eligibleRequestStatuses.has(request.status)) {
    return null;
  }

  if (request.latitude === null || request.longitude === null) {
    return "Excluded because the address is not geocoded yet.";
  }

  const requestCoordinate = {
    latitude: request.latitude,
    longitude: request.longitude,
  };

  if (
    request.coldChainRequired &&
    vehicles.every((vehicle) => !vehicle.refrigerated)
  ) {
    return "Excluded because no available vehicle can carry refrigerated items.";
  }

  if (
    request.usesWheelchair &&
    vehicles.every((vehicle) => !vehicle.wheelchairLift)
  ) {
    return "Excluded because the lift-equipped vehicle is not available.";
  }

  const compatibleMealCount = meals
    .filter((meal) => !hasAllergenConflict(meal, request))
    .reduce((sum, meal) => sum + meal.quantityAvailable, 0);

  if (compatibleMealCount < request.approvedMealCount) {
    return "Excluded because compatible deliverable meal inventory is short.";
  }

  const nearestDepot = depots
    .map((depot) => ({
      depot,
      minutes: calculateRouteDriveMinutes(depot, [requestCoordinate]),
    }))
    .sort((left, right) => left.minutes - right.minutes)[0];

  if (nearestDepot && nearestDepot.minutes > 50) {
    return "Excluded because the stop sits outside the current route clusters.";
  }

  return "Excluded because it did not fit the 75% route cap after higher-priority stops.";
}

export function generateRoutePlans({
  availability,
  baseDates,
  depots,
  meals,
  requests,
  vehicles,
  volunteers,
}: {
  availability: PlannerAvailability[];
  baseDates: Record<DueBucket, string>;
  depots: PlannerDepot[];
  meals: PlannerMeal[];
  requests: PlannerRequest[];
  vehicles: PlannerVehicle[];
  volunteers: PlannerVolunteer[];
}): RouteGenerationResult {
  const plans: GeneratedRoutePlan[] = [];
  const includedRequestIds = new Set<string>();
  const excludedByRequest = new Map<string, string>();
  const mealsById = new Map(meals.map((meal) => [meal.id, meal] as const));
  const mealInventory = new Map(
    meals.map((meal) => [meal.id, meal.quantityAvailable] as const)
  );
  const volunteerById = new Map(
    volunteers
      .filter((volunteer) => volunteer.active)
      .map((entry) => [entry.id, entry] as const)
  );
  const vehicleById = new Map(
    vehicles.map((vehicle) => [vehicle.id, vehicle] as const)
  );
  const depotById = new Map(depots.map((depot) => [depot.id, depot] as const));
  const sortedAvailability = availability
    .slice()
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        right.minutesAvailable - left.minutesAvailable ||
        left.windowStart.localeCompare(right.windowStart)
    );

  for (const window of sortedAvailability) {
    const volunteer = volunteerById.get(window.volunteerId);

    if (!volunteer || !volunteer.hasVehicleAccess) {
      continue;
    }

    const vehicle =
      (volunteer.preferredVehicleId
        ? vehicleById.get(volunteer.preferredVehicleId)
        : undefined) ??
      vehicles.find((entry) => entry.homeDepotId === depots[0]?.id);

    if (!vehicle) {
      continue;
    }

    const depot = depotById.get(vehicle.homeDepotId) ?? depots[0];

    if (!depot) {
      continue;
    }

    const budget = getRouteBudget(window.minutesAvailable);
    const primaryBucket = servicePrimaryBucket(window.date, baseDates);
    const selectedStops: RouteCandidate[] = [];
    const allocations = new Map<string, RouteMealAllocation[]>();

    const openRequests = requests
      .filter((request) => !includedRequestIds.has(request.id))
      .filter((request) => eligibleRequestStatuses.has(request.status))
      .slice()
      .sort(requestSort);

    const tryAddRequest = (
      request: PlannerRequest,
      mode: "early" | "primary"
    ) => {
      const hardIssue = isHardEligible({ request, vehicle });
      const candidate = toCandidate(request);

      if (hardIssue) {
        excludedByRequest.set(request.id, hardIssue);
        return false;
      }

      if (!candidate) {
        excludedByRequest.set(
          request.id,
          "A valid geocoded address is required."
        );
        return false;
      }

      if (
        selectedStops.length > 0 &&
        !sameCluster(selectedStops[0]!, candidate)
      ) {
        return false;
      }

      const insertion = findBestInsertion({
        candidate,
        depot,
        stops: selectedStops,
      });
      const plannedTotalMinutes =
        insertion.driveMinutes + (selectedStops.length + 1) * 2;

      if (plannedTotalMinutes > budget.upperCapMinutes) {
        return false;
      }

      if (mode === "early" && selectedStops.length > 0) {
        const currentDrive = calculateRouteDriveMinutes(depot, selectedStops);
        const allowedExtra = Math.min(8, Math.max(4, currentDrive * 0.12));

        if (insertion.extraDriveMinutes > allowedExtra) {
          return false;
        }
      }

      const allocation = allocateRequestedItems({
        inventory: mealInventory,
        mealsById,
        request,
      });

      if (!allocation.ok) {
        excludedByRequest.set(request.id, allocation.reason);
        return false;
      }

      selectedStops.splice(insertion.index, 0, candidate);
      allocations.set(request.id, allocation.mealItems);
      includedRequestIds.add(request.id);
      applyAllocation(mealInventory, allocation.mealItems);

      return true;
    };

    for (const request of openRequests.filter(
      (entry) => entry.dueBucket === primaryBucket
    )) {
      tryAddRequest(request, "primary");
    }

    if (selectedStops.length > 0) {
      const futureRequests = openRequests
        .filter((request) => !includedRequestIds.has(request.id))
        .filter(
          (request) => bucketRank[request.dueBucket] > bucketRank[primaryBucket]
        )
        .sort(
          (left, right) => scoreRouteRequest(right) - scoreRouteRequest(left)
        );

      for (const request of futureRequests) {
        tryAddRequest(request, "early");
      }
    }

    if (selectedStops.length === 0) {
      continue;
    }

    const plannedDriveMinutes = calculateRouteDriveMinutes(
      depot,
      selectedStops
    );
    const plannedStopMinutes = selectedStops.length * 2;
    const plannedTotalMinutes = plannedDriveMinutes + plannedStopMinutes;
    const utilization = clamp(
      Math.round((plannedTotalMinutes / window.minutesAvailable) * 100),
      0,
      75
    );
    const routeStart = routeStartTime(window.date, window.windowStart);
    const areaLabel = areaLabelFromStops(selectedStops);
    const routeName = `${areaLabel} ${window.windowStart < "12:00" ? "morning" : "afternoon"} run`;
    const stops = selectedStops.map((request, index) =>
      makeStop({
        depot,
        index,
        mealItems: allocations.get(request.id) ?? [],
        request,
        routeStart,
        selectedStops,
      })
    );
    const highPriorityStops = selectedStops.filter(
      (stop) => stop.urgencyScore >= 80
    ).length;
    const earlyStops = selectedStops.filter(
      (stop) => bucketRank[stop.dueBucket] > bucketRank[primaryBucket]
    ).length;
    const planSummary = {
      capacityUtilizationPercent: utilization,
      plannedDriveMinutes,
      plannedTotalMinutes,
      stopCount: selectedStops.length,
    };
    const routeId = `route-generated-${slugify(formatName(volunteer.firstName, volunteer.lastName))}-${window.date}`;

    plans.push({
      ...budget,
      areaLabel,
      capacityUtilizationPercent: utilization,
      driverMinutesAvailable: window.minutesAvailable,
      id: routeId,
      plannedDriveMinutes,
      plannedStopMinutes,
      plannedTotalMinutes,
      routeExplanation: buildExplanation({
        earlyStops,
        plan: planSummary,
        priorityStops: highPriorityStops,
      }),
      routeName,
      serviceDate: window.date,
      startDepotId: depot.id,
      status: window.date === baseDates.today ? "approved" : "planned",
      stopCount: selectedStops.length,
      stops,
      vehicleId: vehicle.id,
      volunteerId: volunteer.id,
      warnings: buildRouteWarnings(
        selectedStops,
        plannedTotalMinutes,
        budget.lowerTargetMinutes
      ),
    });
  }

  const excludedRequests = requests
    .filter((request) => eligibleRequestStatuses.has(request.status))
    .filter((request) => !includedRequestIds.has(request.id))
    .map((request) => ({
      requestId: request.id,
      reason:
        excludedByRequest.get(request.id) ??
        buildExclusionReason({ depots, meals, request, vehicles }),
    }))
    .filter(
      (entry): entry is RouteGenerationExclusion =>
        typeof entry.reason === "string"
    );

  return {
    excludedRequests,
    plans,
  };
}

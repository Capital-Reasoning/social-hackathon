import {
  generateRoutePlans,
  type DueBucket,
  type GeneratedRoutePlan,
  type PlannerAvailability,
  type PlannerDepot,
  type PlannerMeal,
  type PlannerRequest,
  type PlannerVehicle,
  type PlannerVolunteer,
  type RouteGenerationExclusion,
} from "@/server/mealflo/routing";

export const PUBLIC_ROUTE_MAX_TOTAL_MINUTES = 180;
const PUBLIC_ROUTE_SYNTHETIC_AVAILABILITY_MINUTES = Math.ceil(
  PUBLIC_ROUTE_MAX_TOTAL_MINUTES / 0.75
);

export type PublicRouteSource = "gmail" | "manual_entry" | "public_form";

export type PublicScopedPlannerRequest = PlannerRequest & {
  assignedRouteId: string | null;
  scheduledDate: string;
  sourceChannel: PublicRouteSource;
};

export type PublicRoutePlannerInput = {
  availability: PlannerAvailability[];
  baseDates: Record<DueBucket, string>;
  batchId: string;
  depots: PlannerDepot[];
  idPrefix?: string;
  meals: PlannerMeal[];
  requests: PublicScopedPlannerRequest[];
  vehicles: PlannerVehicle[];
  volunteers: PlannerVolunteer[];
};

export type PublicRoutePlannerResult = {
  excludedRequests: RouteGenerationExclusion[];
  plans: GeneratedRoutePlan[];
  scopedRequests: PublicScopedPlannerRequest[];
  splitCount: number;
};

export function isUnroutedPublicTodayRequest(
  request: PublicScopedPlannerRequest,
  baseDates: Record<DueBucket, string>
) {
  return (
    request.sourceChannel === "public_form" &&
    request.status === "approved" &&
    !request.assignedRouteId &&
    request.scheduledDate === baseDates.today
  );
}

export function selectUnroutedPublicTodayRequests(
  requests: PublicScopedPlannerRequest[],
  baseDates: Record<DueBucket, string>
) {
  return requests.filter((request) =>
    isUnroutedPublicTodayRequest(request, baseDates)
  );
}

function buildSyntheticAvailability({
  availability,
  baseDates,
  requestCount,
  volunteers,
}: {
  availability: PlannerAvailability[];
  baseDates: Record<DueBucket, string>;
  requestCount: number;
  volunteers: PlannerVolunteer[];
}) {
  const volunteerById = new Map(volunteers.map((entry) => [entry.id, entry]));
  const todayWindows = availability
    .filter((entry) => entry.date === baseDates.today)
    .filter((entry) => {
      const volunteer = volunteerById.get(entry.volunteerId);

      return Boolean(volunteer?.active && volunteer.hasVehicleAccess);
    })
    .sort(
      (left, right) =>
        left.windowStart.localeCompare(right.windowStart) ||
        right.minutesAvailable - left.minutesAvailable ||
        left.volunteerId.localeCompare(right.volunteerId)
    );
  const fallbackVolunteer = volunteers
    .filter((entry) => entry.active && entry.hasVehicleAccess)
    .sort((left, right) => left.id.localeCompare(right.id))[0];
  const fallbackWindow = fallbackVolunteer
    ? [
        {
          date: baseDates.today,
          id: `availability-public-fallback-${fallbackVolunteer.id}`,
          minutesAvailable: PUBLIC_ROUTE_SYNTHETIC_AVAILABILITY_MINUTES,
          volunteerId: fallbackVolunteer.id,
          windowEnd: "16:00",
          windowStart: "13:00",
        } satisfies PlannerAvailability,
      ]
    : [];
  const sourceWindows = todayWindows.length > 0 ? todayWindows : fallbackWindow;
  const neededWindows = Math.max(1, requestCount, sourceWindows.length);

  return Array.from({ length: neededWindows }, (_, index) => {
    const source = sourceWindows[index % sourceWindows.length];

    if (!source) {
      return null;
    }

    return {
      ...source,
      id: `availability-public-${source.volunteerId}-${index + 1}`,
      minutesAvailable: PUBLIC_ROUTE_SYNTHETIC_AVAILABILITY_MINUTES,
    } satisfies PlannerAvailability;
  }).filter((entry): entry is PlannerAvailability => Boolean(entry));
}

function publicRouteName(
  plan: GeneratedRoutePlan,
  index: number,
  splitCount: number
) {
  const area = plan.areaLabel.toLowerCase();
  const areaName = area.includes("oak bay")
    ? "Oak Bay meal run"
    : area.includes("jubilee")
      ? "Jubilee meal run"
      : area.includes("esquimalt")
        ? "Esquimalt meal run"
        : area.includes("vic west")
          ? "Vic West meal run"
          : area.includes("saanich")
            ? "Saanich meal run"
            : area.includes("fernwood")
              ? "Fernwood meal run"
              : area.includes("james bay")
                ? "James Bay meal run"
                : "Victoria core meal run";

  return splitCount > 1 ? `${areaName} ${index + 1}` : areaName;
}

function labelPlan(
  plan: GeneratedRoutePlan,
  index: number,
  splitCount: number
) {
  const displayWarnings = plan.warnings.filter(
    (warning) => !/below the 66% target/i.test(warning)
  );

  return {
    ...plan,
    routeExplanation: [
      `${plan.stopCount} newly approved public-form stops are ready for dispatch.`,
      `${plan.plannedTotalMinutes} minutes total keeps this route under 3 hours.`,
      splitCount > 1
        ? `Split into ${splitCount} routes to stay under 3 hours.`
        : null,
    ]
      .filter(Boolean)
      .join(" "),
    routeName: publicRouteName(plan, index, splitCount),
    status: "approved" as const,
    warnings:
      plan.plannedTotalMinutes > PUBLIC_ROUTE_MAX_TOTAL_MINUTES
        ? [
            ...displayWarnings,
            "Route must be split before assignment because it exceeds 3 hours.",
          ]
        : displayWarnings,
  } satisfies GeneratedRoutePlan;
}

export function generateUnroutedPublicTodayRoutePlans({
  availability,
  baseDates,
  batchId,
  depots,
  idPrefix = "route-public-preview",
  meals,
  requests,
  vehicles,
  volunteers,
}: PublicRoutePlannerInput): PublicRoutePlannerResult {
  const scopedRequests = selectUnroutedPublicTodayRequests(requests, baseDates);

  if (scopedRequests.length === 0) {
    return {
      excludedRequests: [],
      plans: [],
      scopedRequests,
      splitCount: 0,
    };
  }

  const result = generateRoutePlans({
    availability: buildSyntheticAvailability({
      availability,
      baseDates,
      requestCount: scopedRequests.length,
      volunteers,
    }),
    baseDates,
    depots,
    meals,
    requests: scopedRequests,
    vehicles,
    volunteers,
  });
  const splitCount = result.plans.length;

  return {
    excludedRequests: result.excludedRequests,
    plans: result.plans.map((plan, index) => ({
      ...labelPlan(plan, index, splitCount),
      id: `${idPrefix}-${batchId}-${index + 1}`,
    })),
    scopedRequests,
    splitCount,
  };
}

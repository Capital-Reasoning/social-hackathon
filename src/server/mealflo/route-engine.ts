import { serverEnv } from "@/lib/config/server-env";

export type RouteCoordinate = readonly [number, number];

export type RouteDirectionStep = {
  distanceMeters: number;
  durationSeconds: number;
  instruction: string;
  waypointRange: readonly [number, number] | null;
};

export type RouteSegmentDirections = {
  distanceMeters: number;
  durationSeconds: number;
  steps: RouteDirectionStep[];
};

export type ResolvedRoute = {
  distanceMeters: number;
  durationSeconds: number;
  fallbackReason: string | null;
  geometry: RouteCoordinate[];
  provider: "fallback" | "openrouteservice";
  segments: RouteSegmentDirections[];
};

type OpenRouteServiceFeature = {
  geometry?: {
    coordinates?: unknown;
    type?: string;
  };
  properties?: {
    segments?: Array<{
      distance?: number;
      duration?: number;
      steps?: Array<{
        distance?: number;
        duration?: number;
        instruction?: string;
        way_points?: [number, number];
      }>;
    }>;
    summary?: {
      distance?: number;
      duration?: number;
    };
  };
};

type OpenRouteServiceResponse = {
  features?: OpenRouteServiceFeature[];
};

export type RouteEngine = {
  resolveRoute(waypoints: readonly RouteCoordinate[]): Promise<ResolvedRoute>;
};

const routeCache = new Map<string, Promise<ResolvedRoute>>();

function isFiniteCoordinate([longitude, latitude]: RouteCoordinate) {
  return (
    Number.isFinite(longitude) &&
    Number.isFinite(latitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude >= -90 &&
    latitude <= 90
  );
}

function normalizeWaypoints(waypoints: readonly RouteCoordinate[]) {
  return waypoints
    .filter(isFiniteCoordinate)
    .map(
      ([longitude, latitude]) =>
        [Number(longitude.toFixed(6)), Number(latitude.toFixed(6))] as const
    );
}

function routeCacheKey(waypoints: readonly RouteCoordinate[]) {
  return waypoints
    .map(
      ([longitude, latitude]) =>
        `${longitude.toFixed(6)},${latitude.toFixed(6)}`
    )
    .join("|");
}

function haversineMeters(from: RouteCoordinate, to: RouteCoordinate) {
  const earthMeters = 6_371_000;
  const dLat = ((to[1] - from[1]) * Math.PI) / 180;
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const lat1 = (from[1] * Math.PI) / 180;
  const lat2 = (to[1] * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function appendCoordinate(
  geometry: RouteCoordinate[],
  coordinate: RouteCoordinate
) {
  const previous = geometry.at(-1);

  if (
    !previous ||
    previous[0] !== coordinate[0] ||
    previous[1] !== coordinate[1]
  ) {
    geometry.push(coordinate);
  }
}

function interpolate(
  from: RouteCoordinate,
  to: RouteCoordinate,
  steps: number
) {
  const coordinates: RouteCoordinate[] = [];

  for (let index = 1; index <= steps; index += 1) {
    const ratio = index / steps;
    coordinates.push([
      Number((from[0] + (to[0] - from[0]) * ratio).toFixed(6)),
      Number((from[1] + (to[1] - from[1]) * ratio).toFixed(6)),
    ]);
  }

  return coordinates;
}

function directionLabel(
  from: RouteCoordinate,
  to: RouteCoordinate,
  axis: "east-west" | "north-south"
) {
  if (axis === "east-west") {
    return to[0] >= from[0] ? "east" : "west";
  }

  return to[1] >= from[1] ? "north" : "south";
}

function buildFallbackRoute(
  waypoints: readonly RouteCoordinate[],
  fallbackReason: string | null
): ResolvedRoute {
  if (waypoints.length < 2) {
    return {
      distanceMeters: 0,
      durationSeconds: 0,
      fallbackReason,
      geometry: [...waypoints],
      provider: "fallback",
      segments: [],
    };
  }

  const geometry: RouteCoordinate[] = [waypoints[0]!];
  const segments: RouteSegmentDirections[] = [];
  let distanceMeters = 0;
  let durationSeconds = 0;

  for (let index = 0; index < waypoints.length - 1; index += 1) {
    const from = waypoints[index]!;
    const to = waypoints[index + 1]!;
    const midLongitude = Number(
      (from[0] + (to[0] - from[0]) * 0.62).toFixed(6)
    );
    const bendA: RouteCoordinate = [midLongitude, from[1]];
    const bendB: RouteCoordinate = [midLongitude, to[1]];
    const legPoints = [bendA, bendB, to];

    for (const point of legPoints) {
      const previous = geometry.at(-1)!;
      const segmentDistance = haversineMeters(previous, point);
      const interpolationSteps = Math.max(1, Math.ceil(segmentDistance / 450));

      for (const coordinate of interpolate(
        previous,
        point,
        interpolationSteps
      )) {
        appendCoordinate(geometry, coordinate);
      }
    }

    const legDistance =
      haversineMeters(from, bendA) +
      haversineMeters(bendA, bendB) +
      haversineMeters(bendB, to);
    const legDuration = Math.max(180, Math.ceil((legDistance / 32_000) * 3600));

    distanceMeters += legDistance;
    durationSeconds += legDuration;
    segments.push({
      distanceMeters: Math.round(legDistance),
      durationSeconds: legDuration,
      steps: [
        {
          distanceMeters: Math.round(haversineMeters(from, bendA)),
          durationSeconds: Math.round(legDuration * 0.38),
          instruction: `Head ${directionLabel(from, bendA, "east-west")} toward stop ${index + 1}.`,
          waypointRange: null,
        },
        {
          distanceMeters: Math.round(haversineMeters(bendA, bendB)),
          durationSeconds: Math.round(legDuration * 0.38),
          instruction: `Turn ${directionLabel(bendA, bendB, "north-south")} and continue through the neighbourhood grid.`,
          waypointRange: null,
        },
        {
          distanceMeters: Math.round(haversineMeters(bendB, to)),
          durationSeconds: Math.round(legDuration * 0.24),
          instruction: `Arrive at stop ${index + 1}.`,
          waypointRange: null,
        },
      ],
    });
  }

  return {
    distanceMeters: Math.round(distanceMeters),
    durationSeconds,
    fallbackReason,
    geometry,
    provider: "fallback",
    segments,
  };
}

function parseOpenRouteServiceResponse(
  payload: OpenRouteServiceResponse,
  waypoints: readonly RouteCoordinate[]
): ResolvedRoute {
  const feature = payload.features?.[0];
  const geometry = feature?.geometry;

  if (
    !feature ||
    geometry?.type !== "LineString" ||
    !Array.isArray(geometry.coordinates)
  ) {
    throw new Error("openrouteservice did not return route geometry.");
  }

  const coordinates = geometry.coordinates
    .map((coordinate) =>
      Array.isArray(coordinate) &&
      typeof coordinate[0] === "number" &&
      typeof coordinate[1] === "number"
        ? ([coordinate[0], coordinate[1]] as const)
        : null
    )
    .filter(Boolean) as RouteCoordinate[];

  if (coordinates.length < waypoints.length) {
    throw new Error("openrouteservice returned incomplete route geometry.");
  }

  const summary = feature.properties?.summary;
  const segments =
    feature.properties?.segments?.map((segment) => ({
      distanceMeters: Math.round(segment.distance ?? 0),
      durationSeconds: Math.round(segment.duration ?? 0),
      steps:
        segment.steps?.map((step) => ({
          distanceMeters: Math.round(step.distance ?? 0),
          durationSeconds: Math.round(step.duration ?? 0),
          instruction: step.instruction ?? "Continue.",
          waypointRange: step.way_points ?? null,
        })) ?? [],
    })) ?? [];

  return {
    distanceMeters: Math.round(summary?.distance ?? 0),
    durationSeconds: Math.round(summary?.duration ?? 0),
    fallbackReason: null,
    geometry: coordinates,
    provider: "openrouteservice",
    segments,
  };
}

class OpenRouteServiceRouteEngine implements RouteEngine {
  constructor(private readonly apiKey: string) {}

  async resolveRoute(waypoints: readonly RouteCoordinate[]) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4_500);

    try {
      const response = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
          body: JSON.stringify({
            coordinates: waypoints,
            geometry: true,
            instructions: true,
            instructions_format: "text",
            preference: "recommended",
            units: "m",
          }),
          headers: {
            Accept: "application/geo+json, application/json",
            Authorization: this.apiKey,
            "Content-Type": "application/json",
          },
          method: "POST",
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`openrouteservice returned HTTP ${response.status}.`);
      }

      return parseOpenRouteServiceResponse(
        (await response.json()) as OpenRouteServiceResponse,
        waypoints
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

class FallbackRouteEngine implements RouteEngine {
  constructor(private readonly reason: string | null = null) {}

  async resolveRoute(waypoints: readonly RouteCoordinate[]) {
    return buildFallbackRoute(waypoints, this.reason);
  }
}

function shouldUseLiveRouting() {
  return (
    serverEnv.routingMode !== "fallback" &&
    serverEnv.nodeEnv !== "test" &&
    Boolean(serverEnv.openRouteServiceApiKey)
  );
}

function createRouteEngine(): RouteEngine {
  if (shouldUseLiveRouting() && serverEnv.openRouteServiceApiKey) {
    return new OpenRouteServiceRouteEngine(serverEnv.openRouteServiceApiKey);
  }

  return new FallbackRouteEngine(
    serverEnv.openRouteServiceApiKey
      ? "Live routing disabled in this environment."
      : "OPENROUTESERVICE_API_KEY is not configured."
  );
}

const routeEngine = createRouteEngine();

export function resolveStreetRoute(
  rawWaypoints: readonly RouteCoordinate[]
): Promise<ResolvedRoute> {
  const waypoints = normalizeWaypoints(rawWaypoints);

  if (waypoints.length < 2) {
    return Promise.resolve(buildFallbackRoute(waypoints, null));
  }

  const key = routeCacheKey(waypoints);
  const cached = routeCache.get(key);

  if (cached) {
    return cached;
  }

  const pending = routeEngine
    .resolveRoute(waypoints)
    .catch((error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : "Street route could not be resolved.";

      console.warn("Falling back to deterministic route geometry.", message);

      return buildFallbackRoute(waypoints, message);
    });

  routeCache.set(key, pending);

  return pending;
}

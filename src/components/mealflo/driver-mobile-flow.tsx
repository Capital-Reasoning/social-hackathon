"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button, ButtonLink } from "@/components/mealflo/button";
import { Card } from "@/components/mealflo/card";
import { getDirectionProgress } from "@/components/mealflo/driver-navigation";
import { IconSwatch, MealfloIcon } from "@/components/mealflo/icon";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import {
  demoDriverControlEvent,
  demoDriverStatusEvent,
  demoDriverStatusRequestEvent,
  type DemoDriverControlAction,
} from "@/lib/demo";
import { cn } from "@/lib/utils";
import type {
  DriverOfferData,
  DriverRouteDirection,
  DriverRouteOption,
  DriverRouteStop,
} from "@/server/mealflo/backend";

type DriverMobileFlowProps = {
  data: DriverOfferData;
  initialRouteId?: string;
  initialScreen?: DriverScreen;
};

type DriverScreen = "availability" | "offer" | "active" | "stop";
type LocationMode = "asking" | "blocked" | "demo" | "gps" | "idle";
type StopOutcome = "could_not_deliver" | "delivered";
type CompletionStage = "celebrating" | "driving" | "idle";
type RouteDrivePhase = "collecting" | "idle" | "to_stop";

type SessionResponse = {
  data?: {
    id: string;
    isAnchor: boolean;
  };
  error?: string;
  ok: boolean;
};

type StoredProgress = {
  completedStops: Record<string, StopOutcome>;
  currentStopIndex: number;
};
type MapDirection = Pick<
  DriverRouteDirection,
  "distance" | "duration" | "instruction"
> & {
  sequence?: number;
};
type DirectionGlyphKind = "arrive" | "left" | "pickup" | "right" | "straight";

const progressKey = (routeId: string) => `mealflo-driver-progress:${routeId}`;
const fingerprintKey = "mealflo-device-fingerprint";
const DRIVER_SESSION_HEARTBEAT_INTERVAL_MS = 3_000;
const driveAnimationTuning = {
  bearingLookaheadMeters: 44,
  bearingMaxDegreesPerSecond: 145,
  bearingSmoothingMs: 560,
  cameraLookaheadMeters: 75,
  cameraMoveDurationMs: 180,
  maxDurationMs: 90_000,
  minDurationMs: 10_000,
  targetSpeedKmh: 200,
};
function formatAvailabilityLabel(minutes: number) {
  if (minutes === 60) {
    return "1hr";
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60}hr`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}hr ${remainingMinutes}min`;
  }

  return `${remainingMinutes}min`;
}

function getDeviceFingerprint() {
  const existing = window.localStorage.getItem(fingerprintKey);

  if (existing) {
    return existing;
  }

  const fingerprint = `driver-${crypto.randomUUID()}`;
  window.localStorage.setItem(fingerprintKey, fingerprint);

  return fingerprint;
}

function getRouteStart(routeLine: ReadonlyArray<readonly [number, number]>) {
  const [longitude, latitude] = routeLine[0] ?? [-123.3656, 48.4284];

  return {
    currentLat: latitude,
    currentLng: longitude,
  };
}

function toRouteCoordinate(position: {
  currentLat: number;
  currentLng: number;
}) {
  return [position.currentLng, position.currentLat] as const;
}

function distanceMeters(
  from: readonly [number, number],
  to: readonly [number, number]
) {
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

function bearingBetween(
  from: readonly [number, number],
  to: readonly [number, number]
) {
  const fromLat = (from[1] * Math.PI) / 180;
  const toLat = (to[1] * Math.PI) / 180;
  const dLng = ((to[0] - from[0]) * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(dLng);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function normalizeBearing(value: number) {
  return ((value % 360) + 360) % 360;
}

function shortestBearingDelta(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

function smoothBearing({
  deltaMs,
  previous,
  target,
}: {
  deltaMs: number;
  previous?: number;
  target?: number;
}) {
  if (target === undefined) {
    return previous;
  }

  if (previous === undefined) {
    return normalizeBearing(target);
  }

  const delta = shortestBearingDelta(previous, target);
  const smoothingFactor =
    1 - Math.exp(-deltaMs / driveAnimationTuning.bearingSmoothingMs);
  const easedFactor = 1 - Math.pow(1 - smoothingFactor, 3);
  const maxDelta =
    driveAnimationTuning.bearingMaxDegreesPerSecond * (deltaMs / 1000);
  const nextDelta =
    Math.sign(delta) *
    Math.min(Math.abs(delta) * easedFactor, maxDelta, Math.abs(delta));

  return normalizeBearing(previous + nextDelta);
}

function readStoredProgress(route: DriverRouteOption): StoredProgress {
  const baseline = {
    completedStops: {},
    currentStopIndex: 0,
  };

  try {
    const raw = window.localStorage.getItem(progressKey(route.id));

    if (!raw) {
      return baseline;
    }

    const parsed = JSON.parse(raw) as Partial<StoredProgress>;
    const currentStopIndex =
      typeof parsed.currentStopIndex === "number"
        ? Math.min(Math.max(parsed.currentStopIndex, 0), route.stops.length)
        : baseline.currentStopIndex;

    return {
      completedStops:
        parsed.completedStops && typeof parsed.completedStops === "object"
          ? { ...baseline.completedStops, ...parsed.completedStops }
          : baseline.completedStops,
      currentStopIndex,
    };
  } catch {
    return baseline;
  }
}

function countDelivered(completedStops: Record<string, StopOutcome>) {
  return Object.values(completedStops).filter(
    (status) => status === "delivered"
  ).length;
}

function displayDriverLabel(value: string) {
  return value
    .replace(/cold-chain/gi, "needs refrigeration")
    .replace(/Cold chain/g, "Needs refrigeration")
    .replace(/Fridge/g, "Needs refrigeration");
}

function getCurrentRouteDirection(
  route: DriverRouteOption,
  currentStopIndex: number,
  stepOffset = 0
) {
  const segmentDirections = route.routeDirections.filter(
    (direction) => direction.segmentIndex === currentStopIndex
  );

  if (segmentDirections.length > 0) {
    return segmentDirections[
      Math.min(stepOffset, segmentDirections.length - 1)
    ]!;
  }

  return (
    route.routeDirections.find(
      (direction) => direction.segmentIndex >= currentStopIndex
    ) ??
    route.routeDirections[0] ??
    null
  );
}

function formatMapDistanceMeters(value: number) {
  if (value <= 0) {
    return "0 m";
  }

  if (value < 1000) {
    return `${Math.max(10, Math.round(value / 10) * 10)} m`;
  }

  return `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)} km`;
}

function getDirectionGlyphKind(instruction: string): DirectionGlyphKind {
  const normalized = instruction.toLowerCase();

  if (normalized.includes("collect") || normalized.includes("pickup")) {
    return "pickup";
  }

  if (normalized.includes("arrive")) {
    return "arrive";
  }

  if (normalized.includes("left")) {
    return "left";
  }

  if (normalized.includes("right")) {
    return "right";
  }

  return "straight";
}

function pickRoute(
  routes: DriverRouteOption[],
  availabilityOptions: number[],
  minutesAvailable: number
) {
  const orderedRoutes = routes.slice();
  const fitting = orderedRoutes.filter(
    (route) => route.plannedTotalMinutes <= minutesAvailable
  );

  const selectedAvailabilityIndex = availabilityOptions.findIndex(
    (minutes) => minutes === minutesAvailable
  );
  const fallbackByIndex =
    selectedAvailabilityIndex >= 0
      ? orderedRoutes[
          Math.min(
            selectedAvailabilityIndex,
            Math.max(orderedRoutes.length - 1, 0)
          )
        ]
      : null;

  return fitting[0] ?? fallbackByIndex ?? orderedRoutes[0] ?? routes[0];
}

function findClosestLineIndex(
  line: ReadonlyArray<readonly [number, number]>,
  point: readonly [number, number]
) {
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  line.forEach((coordinate, index) => {
    const distance = distanceMeters(coordinate, point);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
}

function interpolatePosition(
  from: readonly [number, number],
  to: readonly [number, number],
  ratio: number
) {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
  ] as const;
}

function buildDriveAnimationLine({
  from,
  route,
  stopIndex,
}: {
  from: { currentLat: number; currentLng: number };
  route: DriverRouteOption;
  stopIndex: number;
}) {
  const start = toRouteCoordinate(from);
  const destinationStop = route.stops[stopIndex + 1];

  if (!destinationStop) {
    const currentStop = route.stops[stopIndex];

    return currentStop
      ? [start, [currentStop.longitude, currentStop.latitude] as const]
      : [start];
  }

  return buildRouteLineBetween({
    from: start,
    route,
    to: [destinationStop.longitude, destinationStop.latitude] as const,
  });
}

function buildRouteLineBetween({
  from,
  route,
  to,
}: {
  from: readonly [number, number];
  route: DriverRouteOption;
  to: readonly [number, number];
}) {
  const startIndex = findClosestLineIndex(route.routeLine, from);
  const endIndex = findClosestLineIndex(route.routeLine, to);
  const sliced =
    endIndex > startIndex
      ? route.routeLine.slice(startIndex, endIndex + 1)
      : [];

  return sliced.length > 1 ? [from, ...sliced, to] : [from, to];
}

function buildFutureRouteLine({
  route,
  stopIndex,
}: {
  route: DriverRouteOption;
  stopIndex: number;
}) {
  const stop = route.stops[stopIndex];

  if (!stop) {
    return [];
  }

  const stopCoordinate = [stop.longitude, stop.latitude] as const;
  const startIndex = findClosestLineIndex(route.routeLine, stopCoordinate);
  const futureCoordinates = route.routeLine.slice(startIndex + 1);

  return futureCoordinates.length > 0
    ? [stopCoordinate, ...futureCoordinates]
    : [];
}

function getLineDistanceMeters(line: ReadonlyArray<readonly [number, number]>) {
  return line
    .slice(1)
    .reduce(
      (sum, coordinate, index) =>
        sum + distanceMeters(line[index]!, coordinate),
      0
    );
}

function getRemainingLineFromDistance({
  distanceAlongLine,
  line,
}: {
  distanceAlongLine: number;
  line: ReadonlyArray<readonly [number, number]>;
}) {
  if (line.length <= 1) {
    return line;
  }

  const distances = line
    .slice(1)
    .map((coordinate, index) => distanceMeters(line[index]!, coordinate));
  let walked = 0;

  for (let index = 0; index < distances.length; index += 1) {
    const legDistance = distances[index]!;
    const nextWalked = walked + legDistance;

    if (nextWalked >= distanceAlongLine) {
      const from = line[index]!;
      const to = line[index + 1]!;
      const current = interpolatePosition(
        from,
        to,
        legDistance === 0 ? 1 : (distanceAlongLine - walked) / legDistance
      );
      const upcoming = distanceMeters(current, to) < 1 ? index + 2 : index + 1;

      return [current, ...line.slice(upcoming)];
    }

    walked = nextWalked;
  }

  return [line.at(-1)!];
}

function getDriveAnimationDurationMs(
  line: ReadonlyArray<readonly [number, number]>
) {
  const metersPerSecond = (driveAnimationTuning.targetSpeedKmh * 1000) / 3600;
  const duration = (getLineDistanceMeters(line) / metersPerSecond) * 1000;

  return Math.round(
    Math.min(
      Math.max(duration, driveAnimationTuning.minDurationMs),
      driveAnimationTuning.maxDurationMs
    )
  );
}

function getLinePointWithBearing(
  line: ReadonlyArray<readonly [number, number]>,
  progress: number
) {
  if (line.length <= 1) {
    return {
      bearing: undefined,
      coordinate: line[0] ?? ([-123.3656, 48.4284] as const),
      distanceAlongLine: 0,
    };
  }

  const distances = line
    .slice(1)
    .map((coordinate, index) => distanceMeters(line[index]!, coordinate));
  const totalDistance = distances.reduce((sum, distance) => sum + distance, 0);
  const targetDistance = totalDistance * progress;
  let walked = 0;

  for (let index = 0; index < distances.length; index += 1) {
    const legDistance = distances[index]!;

    if (walked + legDistance >= targetDistance) {
      const from = line[index]!;
      const to = line[index + 1]!;

      return {
        bearing: bearingBetween(from, to),
        coordinate: interpolatePosition(
          from,
          to,
          legDistance === 0 ? 1 : (targetDistance - walked) / legDistance
        ),
        distanceAlongLine: targetDistance,
      };
    }

    walked += legDistance;
  }

  return {
    bearing: bearingBetween(line.at(-2)!, line.at(-1)!),
    coordinate: line.at(-1)!,
    distanceAlongLine: totalDistance,
  };
}

function getCameraBearingTarget({
  coordinate,
  distanceAlongLine,
  fallbackBearing,
  line,
  lineDistance,
}: {
  coordinate: readonly [number, number];
  distanceAlongLine: number;
  fallbackBearing?: number;
  line: ReadonlyArray<readonly [number, number]>;
  lineDistance: number;
}) {
  if (lineDistance <= 0) {
    return fallbackBearing;
  }

  const lookaheadDistance = Math.min(
    distanceAlongLine + driveAnimationTuning.bearingLookaheadMeters,
    lineDistance
  );
  const { coordinate: lookaheadCoordinate } = getLinePointWithBearing(
    line,
    lookaheadDistance / lineDistance
  );

  if (distanceMeters(coordinate, lookaheadCoordinate) < 3) {
    return fallbackBearing;
  }

  return bearingBetween(coordinate, lookaheadCoordinate);
}

function formatPhoneHref(phone: string | null) {
  if (!phone) {
    return null;
  }

  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function ProgressDots({
  completedStops,
  currentStopIndex,
  isMoving = false,
  stops,
}: {
  completedStops: Record<string, StopOutcome>;
  currentStopIndex: number;
  isMoving?: boolean;
  stops: DriverRouteStop[];
}) {
  return (
    <div className="flex items-center gap-2" aria-label="Route progress">
      {stops.map((stop, index) => {
        const outcome = completedStops[stop.id];
        const active = index === currentStopIndex && !outcome;
        const state = outcome ?? (active ? "in_progress" : "pending");

        return (
          <span
            key={stop.id}
            aria-label={`${stop.name}: ${state.replaceAll("_", " ")}`}
            className={cn(
              "h-2.5 flex-1 rounded-full transition-[background-color,transform] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-out)]",
              outcome === "delivered"
                ? "bg-[var(--mf-color-green-300)]"
                : outcome === "could_not_deliver"
                  ? "bg-[var(--mf-color-red-300)]"
                  : active
                    ? cn(
                        "bg-action scale-y-125",
                        isMoving && "mf-route-progress-pulse"
                      )
                    : "bg-[rgba(24,24,60,0.14)]"
            )}
            data-moving={active && isMoving ? "true" : "false"}
            data-progress-state={state}
          />
        );
      })}
    </div>
  );
}

function MetricStrip({
  route,
  remainingCount,
  showRemaining = true,
}: {
  remainingCount: number;
  route: DriverRouteOption;
  showRemaining?: boolean;
}) {
  const details = [
    {
      label: route.stopCount === 1 ? "stop" : "stops",
      value: String(route.stopCount),
    },
    {
      label: "drive",
      value: route.driveTime,
    },
    showRemaining
      ? {
          label: "left",
          value: String(remainingCount),
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="rounded-[16px] border-[1.5px] border-[rgba(24,24,60,0.18)] bg-[rgba(255,253,240,0.68)] px-4 py-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted text-[12px] font-medium">Total route</p>
          <p className="font-display text-ink mt-1 text-[31px] leading-none font-semibold tracking-[-0.03em]">
            {route.totalPlannedTime}
          </p>
        </div>
        <div className="grid shrink-0 gap-1.5 text-right">
          {details.map((item) => (
            <p
              key={item.label}
              className="text-muted text-[13px] leading-tight font-medium"
            >
              <span className="font-display text-ink text-[18px] font-semibold tracking-[-0.02em] whitespace-nowrap">
                {item.value}
              </span>{" "}
              {item.label}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompletionTimeMetrics({ route }: { route: DriverRouteOption }) {
  const items = [
    {
      label: "Drive",
      value: route.driveTime,
    },
    {
      label: "Total",
      value: route.totalPlannedTime,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map((item) => (
        <div key={item.label} className="border-line border-t-[1.5px] pt-3">
          <p className="font-display text-ink text-[29px] leading-[0.95] font-semibold tracking-[-0.03em]">
            {item.value}
          </p>
          <p className="text-muted mt-1 text-[13px] font-medium">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function CallButton({
  className,
  phone,
  variant = "secondary",
}: {
  className?: string;
  phone: string | null;
  variant?: "primary" | "secondary" | "warm";
}) {
  const href = formatPhoneHref(phone);
  const icon = <MealfloIcon name="phone-handset" size={24} />;

  if (!href) {
    return (
      <Button
        className={className}
        disabled
        fullWidth
        leading={icon}
        size="lg"
        variant={variant}
      >
        Call
      </Button>
    );
  }

  return (
    <ButtonLink
      className={className}
      fullWidth
      href={href}
      leading={icon}
      size="lg"
      variant={variant}
    >
      Call
    </ButtonLink>
  );
}

function DirectionGlyph({
  instruction,
  size = 42,
}: {
  instruction: string;
  size?: number;
}) {
  const kind = getDirectionGlyphKind(instruction);
  const rotationByKind: Record<DirectionGlyphKind, number> = {
    arrive: 0,
    left: -90,
    pickup: 0,
    right: 90,
    straight: 0,
  };

  if (kind === "pickup") {
    return (
      <span
        className="border-line flex shrink-0 items-center justify-center rounded-[14px] border-[1.5px] bg-[rgba(250,226,120,0.24)]"
        style={{ height: size, width: size }}
      >
        <MealfloIcon name="grocery-bag" size={26} />
      </span>
    );
  }

  if (kind === "arrive") {
    return (
      <span
        className="border-line flex shrink-0 items-center justify-center rounded-[14px] border-[1.5px] bg-[rgba(240,243,255,0.78)]"
        style={{ height: size, width: size }}
      >
        <MealfloIcon name="flag" size={25} />
      </span>
    );
  }

  return (
    <span
      className="border-line flex shrink-0 items-center justify-center rounded-[14px] border-[1.5px] bg-[rgba(240,243,255,0.78)]"
      style={{ height: size, width: size }}
      aria-hidden
    >
      <span
        className="relative block h-7 w-7 transition-transform duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]"
        style={{ transform: `rotate(${rotationByKind[kind]}deg)` }}
      >
        <span className="bg-action absolute top-1 left-1/2 h-5 w-[3px] -translate-x-1/2 rounded-full" />
        <span className="border-action absolute top-1 left-1/2 h-3.5 w-3.5 -translate-x-1/2 rotate-45 border-t-[3px] border-l-[3px]" />
      </span>
    </span>
  );
}

function TurnByTurnDirection({ direction }: { direction: MapDirection }) {
  const directionKey = `${direction.sequence ?? "pickup"}-${direction.instruction}`;
  const keyRef = useRef(directionKey);
  const previousDirectionRef = useRef<MapDirection | null>(direction);
  const [animationId, setAnimationId] = useState(0);
  const [exitingDirection, setExitingDirection] = useState<MapDirection | null>(
    null
  );

  useEffect(() => {
    if (keyRef.current === directionKey) {
      return;
    }

    setExitingDirection(previousDirectionRef.current);
    setAnimationId((value) => value + 1);
    keyRef.current = directionKey;

    const timeout = window.setTimeout(() => {
      setExitingDirection(null);
    }, 420);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [directionKey]);

  useEffect(() => {
    previousDirectionRef.current = direction;
  }, [direction]);

  return (
    <div className="absolute inset-x-3 top-3 z-20 overflow-hidden rounded-[16px] border-[1.5px] border-[rgba(120,144,250,0.24)] bg-white/92 shadow-[0_10px_28px_rgba(24,24,60,0.1)] backdrop-blur">
      {exitingDirection ? (
        <div className="mf-direction-slide-out absolute inset-0 flex items-center gap-3 px-3 py-2.5">
          <MealfloIcon name="route-road" size={30} />
          <div className="min-w-0 flex-1">
            <p className="text-muted text-xs leading-4 font-semibold">
              {exitingDirection.distance} · {exitingDirection.duration}
            </p>
            <p className="text-ink mt-0.5 line-clamp-2 text-[15px] leading-5 font-semibold">
              {exitingDirection.instruction}
            </p>
          </div>
          <DirectionGlyph instruction={exitingDirection.instruction} />
        </div>
      ) : null}

      <div
        key={`${directionKey}-${animationId}`}
        className="mf-direction-slide-in relative flex items-center gap-3 px-3 py-2.5"
      >
        <MealfloIcon name="route-road" size={30} />
        <div className="min-w-0 flex-1">
          <p className="text-muted text-xs leading-4 font-semibold">
            {direction.distance} · {direction.duration}
          </p>
          <p className="text-ink mt-0.5 line-clamp-2 text-[15px] leading-5 font-semibold">
            {direction.instruction}
          </p>
        </div>
        <DirectionGlyph instruction={direction.instruction} />
      </div>
    </div>
  );
}

function RouteMap({
  activeRoutePath,
  cameraPosition,
  children,
  className,
  currentPosition,
  currentStop,
  drivingBearing,
  navigationStopIndex,
  route,
  view = "offer",
}: {
  activeRoutePath?: ReadonlyArray<readonly [number, number]>;
  cameraPosition?: { currentLat: number; currentLng: number } | null;
  children?: React.ReactNode;
  className?: string;
  currentPosition: { currentLat: number; currentLng: number };
  currentStop: DriverRouteStop | null;
  drivingBearing?: number;
  navigationStopIndex?: number;
  route: DriverRouteOption;
  view?: "active" | "offer";
}) {
  const targetStop =
    navigationStopIndex !== undefined
      ? route.stops[navigationStopIndex]
      : currentStop;
  const activeStopIndex = targetStop
    ? route.stops.findIndex((stop) => stop.id === targetStop.id)
    : -1;
  const activePath =
    view === "active"
      ? (activeRoutePath ??
        (targetStop && activeStopIndex >= 0
          ? buildRouteLineBetween({
              from: toRouteCoordinate(currentPosition),
              route,
              to: [targetStop.longitude, targetStop.latitude] as const,
            })
          : []))
      : undefined;
  const futurePath =
    view === "active" && activeStopIndex >= 0
      ? buildFutureRouteLine({ route, stopIndex: activeStopIndex })
      : undefined;

  const markers = useMemo(() => {
    const start = getRouteStart(route.routeLine);
    const stopMarkers = route.stops.map((stop, index) => ({
      id: stop.id,
      icon: "location-pin" as const,
      label: index === 0 ? "First stop" : `Stop ${index + 1}`,
      latitude: stop.latitude,
      longitude: stop.longitude,
      tone:
        index === activeStopIndex ? ("warning" as const) : ("info" as const),
    }));

    return [
      {
        id: `${route.id}-depot`,
        icon: "grocery-bag" as const,
        label: "Depot",
        latitude: start.currentLat,
        longitude: start.currentLng,
        tone: "primary" as const,
      },
      ...stopMarkers,
      {
        id: `${route.id}-driver`,
        icon: "delivery-van" as const,
        label: route.volunteer.name.split(" ")[0] ?? "Driver",
        latitude: currentPosition.currentLat,
        longitude: currentPosition.currentLng,
        tone: "success" as const,
      },
    ];
  }, [activeStopIndex, currentPosition, route]);

  return (
    <MapCanvas
      centerControlLabel="Center to me"
      camera={
        view === "active"
          ? {
              bearing: drivingBearing,
              center: cameraPosition
                ? {
                    latitude: cameraPosition.currentLat,
                    longitude: cameraPosition.currentLng,
                  }
                : undefined,
              duration: driveAnimationTuning.cameraMoveDurationMs,
              followMarkerId: `${route.id}-driver`,
              mode: "driver",
              pitch: 48,
              zoom: 16.35,
            }
          : undefined
      }
      className={className}
      markerStyle="icon"
      markers={markers}
      activePath={activePath}
      futurePath={futurePath}
      path={route.routeLine}
      showCenterControl
      showNavigationControls={false}
    >
      {children}
    </MapCanvas>
  );
}

function RouteOfferSummary({
  remainingCount,
  route,
}: {
  remainingCount: number;
  route: DriverRouteOption;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <MealfloIcon name="route-road" size={64} />
        <div className="min-w-0 space-y-1">
          <h1 className="font-display text-ink text-[31px] leading-[1.04] font-bold tracking-[-0.03em]">
            {route.name}
          </h1>
        </div>
      </div>
      <MetricStrip
        remainingCount={remainingCount}
        route={route}
        showRemaining={false}
      />
    </div>
  );
}

export function DriverMobileFlow({
  data,
  initialRouteId,
  initialScreen = "availability",
}: DriverMobileFlowProps) {
  if (data.routeOptions.length === 0) {
    return (
      <Card className="mf-enter space-y-3">
        <IconSwatch framed name="warning-alert" tone="warm" />
        <h1 className="font-display text-ink text-[34px] font-bold tracking-[-0.03em]">
          No route ready
        </h1>
        <p className="text-muted text-base leading-7">
          Ask dispatch to approve a route before opening driver mode.
        </p>
      </Card>
    );
  }

  return (
    <DriverMobileFlowReady
      data={data}
      initialRouteId={initialRouteId}
      initialScreen={initialScreen}
    />
  );
}

function DriverMobileFlowReady({
  data,
  initialRouteId,
  initialScreen = "availability",
}: DriverMobileFlowProps) {
  const suggestedOption = useMemo(
    () =>
      data.routeOptions.find(
        (route) => route.id === data.suggestedRoute.routeId
      ) ?? data.routeOptions[0],
    [data.routeOptions, data.suggestedRoute.routeId]
  );
  const defaultMinutes =
    data.availabilityOptions.find(
      (minutes) => minutes >= (suggestedOption?.plannedTotalMinutes ?? 60)
    ) ??
    data.availabilityOptions.at(-1) ??
    60;
  const initialRoute = useMemo(
    () =>
      data.routeOptions.find((route) => route.id === initialRouteId) ??
      suggestedOption ??
      pickRoute(data.routeOptions, data.availabilityOptions, defaultMinutes) ??
      data.routeOptions[0]!,
    [
      data.availabilityOptions,
      data.routeOptions,
      defaultMinutes,
      initialRouteId,
      suggestedOption,
    ]
  );
  const [selectedMinutes, setSelectedMinutes] = useState(defaultMinutes);
  const [selectedRouteId, setSelectedRouteId] = useState(initialRoute.id);
  const selectedRoute = useMemo(
    () =>
      data.routeOptions.find((route) => route.id === selectedRouteId) ??
      initialRoute,
    [data.routeOptions, initialRoute, selectedRouteId]
  );
  const [screen, setScreen] = useState<DriverScreen>(initialScreen);
  const [completedStops, setCompletedStops] = useState<
    Record<string, StopOutcome>
  >({});
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [activeRoutePath, setActiveRoutePath] = useState<
    ReadonlyArray<readonly [number, number]> | undefined
  >();
  const [cameraPosition, setCameraPosition] = useState<{
    currentLat: number;
    currentLng: number;
  } | null>(null);
  const [drivingBearing, setDrivingBearing] = useState<number | undefined>();
  const [directionDistanceMeters, setDirectionDistanceMeters] = useState<
    number | null
  >(null);
  const [directionInstruction, setDirectionInstruction] = useState<
    string | null
  >(null);
  const [directionSegmentIndex, setDirectionSegmentIndex] = useState(0);
  const [directionStepIndex, setDirectionStepIndex] = useState(0);
  const [currentPosition, setCurrentPosition] = useState(() =>
    getRouteStart(initialRoute.routeLine)
  );
  const [completionStage, setCompletionStage] =
    useState<CompletionStage>("idle");
  const [routeDrivePhase, setRouteDrivePhase] =
    useState<RouteDrivePhase>("idle");
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("idle");
  const [preferGps, setPreferGps] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState(
    "Choose your time window to see the best route."
  );
  const locationModeRef = useRef<LocationMode>("idle");
  const lastLocationRef = useRef(getRouteStart(initialRoute.routeLine));
  const currentStopIndexRef = useRef(currentStopIndex);
  const deliveredCountRef = useRef(countDelivered(completedStops));
  const routeRef = useRef(selectedRoute);
  const drivingBearingRef = useRef<number | undefined>(undefined);
  const sessionIdRef = useRef<string | null>(null);
  const closedSessionIdsRef = useRef<Set<string>>(new Set());
  const liveSessionMountedRef = useRef(false);
  const jumpDriveAnimationRef = useRef(false);

  const deliveredCount = countDelivered(completedStops);
  const progressedCount = Object.keys(completedStops).length;
  const currentStop =
    currentStopIndex < selectedRoute.stops.length
      ? selectedRoute.stops[currentStopIndex]!
      : null;
  const remainingCount = Math.max(
    selectedRoute.stops.length - progressedCount,
    0
  );
  const routeComplete = currentStopIndex >= selectedRoute.stops.length;
  const currentStopPhone = currentStop?.phone ?? selectedRoute.volunteer.phone;
  const isRouteMotion = routeDrivePhase === "to_stop";
  const canJumpToNextStop = screen === "active" && isRouteMotion;
  const navigationStopIndex = routeComplete
    ? undefined
    : isRouteMotion
      ? directionSegmentIndex
      : currentStopIndex;
  const navigationStop =
    navigationStopIndex !== undefined
      ? (selectedRoute.stops[navigationStopIndex] ?? null)
      : null;
  const currentDirection = getCurrentRouteDirection(
    selectedRoute,
    directionSegmentIndex,
    directionStepIndex
  );
  const actionsHidden =
    isCompleting || completionStage !== "idle" || isRouteMotion;
  const currentMapDirection =
    routeDrivePhase === "collecting"
      ? {
          distance: "Pickup",
          duration: "ready",
          instruction: "Collect food before the first delivery",
        }
      : currentDirection
        ? {
            ...currentDirection,
            distance:
              directionDistanceMeters !== null
                ? formatMapDistanceMeters(directionDistanceMeters)
                : currentDirection.distance,
            instruction: directionInstruction ?? currentDirection.instruction,
          }
        : null;
  const bottomSheetTitle =
    routeDrivePhase === "collecting"
      ? "Food depot"
      : (navigationStop?.name ?? currentStop?.name ?? selectedRoute.name);
  const bottomSheetSubtitle =
    routeDrivePhase === "collecting"
      ? "Meals are ready for pickup"
      : (navigationStop?.address ?? currentStop?.address ?? selectedRoute.area);

  useEffect(() => {
    const stored = readStoredProgress(selectedRoute);
    const start = getRouteStart(selectedRoute.routeLine);
    let cancelled = false;

    sessionIdRef.current = null;
    lastLocationRef.current = start;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setCompletedStops(stored.completedStops);
      setCurrentStopIndex(stored.currentStopIndex);
      setActiveRoutePath(undefined);
      setCameraPosition(null);
      drivingBearingRef.current = undefined;
      setDrivingBearing(undefined);
      setDirectionDistanceMeters(null);
      setDirectionInstruction(null);
      setDirectionSegmentIndex(stored.currentStopIndex);
      setDirectionStepIndex(0);
      setCurrentPosition(start);
      setSessionId(null);
      setCompletionStage("idle");
      setRouteDrivePhase("idle");
      setStatusText(
        stored.currentStopIndex >= selectedRoute.stops.length
          ? "This phone has completed the route."
          : "Route ready on this phone."
      );
    });

    return () => {
      cancelled = true;
    };
  }, [selectedRoute]);

  useEffect(() => {
    currentStopIndexRef.current = currentStopIndex;
    deliveredCountRef.current = deliveredCount;
    locationModeRef.current = locationMode;
    routeRef.current = selectedRoute;
    sessionIdRef.current = sessionId;
  }, [
    currentStopIndex,
    deliveredCount,
    locationMode,
    selectedRoute,
    sessionId,
  ]);

  useEffect(() => {
    const dispatchDriverStatus = () => {
      window.dispatchEvent(
        new CustomEvent(demoDriverStatusEvent, {
          detail: {
            canJumpToNextStop,
          },
        })
      );
    };

    dispatchDriverStatus();
    window.addEventListener(demoDriverStatusRequestEvent, dispatchDriverStatus);

    return () => {
      window.removeEventListener(
        demoDriverStatusRequestEvent,
        dispatchDriverStatus
      );
      window.dispatchEvent(
        new CustomEvent(demoDriverStatusEvent, {
          detail: {
            canJumpToNextStop: false,
          },
        })
      );
    };
  }, [canJumpToNextStop]);

  useEffect(() => {
    window.localStorage.setItem(
      progressKey(selectedRoute.id),
      JSON.stringify({
        completedStops,
        currentStopIndex,
      } satisfies StoredProgress)
    );
  }, [completedStops, currentStopIndex, selectedRoute.id]);

  const requestLocation = useCallback(() => {
    setPreferGps(true);

    if (!("geolocation" in navigator)) {
      setPreferGps(false);
      setLocationMode("demo");
      setStatusText("GPS is unavailable here. Demo location is ready.");
      return;
    }

    setLocationMode("asking");
    setStatusText("Waiting for location permission.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          currentLat: position.coords.latitude,
          currentLng: position.coords.longitude,
        };
        lastLocationRef.current = nextLocation;
        setCurrentPosition(nextLocation);
        setLocationMode("gps");
        setStatusText("Location is ready for the route.");
      },
      () => {
        setPreferGps(false);
        setLocationMode("blocked");
        setStatusText("GPS was not allowed. Demo location is ready.");
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10_000,
        timeout: 12_000,
      }
    );
  }, []);

  const heartbeat = useCallback(
    async (override?: {
      currentStopIndex?: number;
      deliveredCountLocal?: number;
    }) => {
      const activeSessionId = sessionIdRef.current;

      if (!activeSessionId) {
        return;
      }

      const response = await fetch("/api/driver/session/heartbeat", {
        body: JSON.stringify({
          ...lastLocationRef.current,
          currentStopIndex:
            override?.currentStopIndex ?? currentStopIndexRef.current,
          deliveredCountLocal:
            override?.deliveredCountLocal ?? deliveredCountRef.current,
          sessionId: activeSessionId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Location update missed.");
      }
    },
    []
  );

  const endSession = useCallback((activeSessionId: string | null) => {
    if (!activeSessionId || closedSessionIdsRef.current.has(activeSessionId)) {
      return;
    }

    closedSessionIdsRef.current.add(activeSessionId);

    const body = JSON.stringify({
      sessionId: activeSessionId,
    });

    if ("sendBeacon" in navigator) {
      const blob = new Blob([body], {
        type: "application/json",
      });
      navigator.sendBeacon("/api/driver/session/end", blob);
      return;
    }

    void fetch("/api/driver/session/end", {
      body,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    });
  }, []);

  const startSession = useCallback(async () => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    setIsStartingSession(true);
    setStatusText("Starting route session.");

    try {
      const response = await fetch("/api/driver/session/start", {
        body: JSON.stringify({
          ...lastLocationRef.current,
          deviceFingerprint: getDeviceFingerprint(),
          routeId: routeRef.current.id,
          volunteerId: routeRef.current.volunteer.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Route session could not start.");
      }

      setSessionId(payload.data.id);
      sessionIdRef.current = payload.data.id;
      setStatusText(
        payload.data.isAnchor
          ? "This phone is live on the dashboard."
          : "This phone is following locally."
      );

      if (locationModeRef.current !== "gps") {
        setLocationMode("demo");
      }

      await heartbeat({
        currentStopIndex: currentStopIndexRef.current,
        deliveredCountLocal: deliveredCountRef.current,
      }).catch(() => {
        setStatusText("Route started. Location update will retry.");
      });

      return payload.data.id;
    } catch (error) {
      setStatusText(
        error instanceof Error
          ? error.message
          : "Route session could not start."
      );
      return null;
    } finally {
      setIsStartingSession(false);
    }
  }, [heartbeat]);

  useEffect(() => {
    if (screen !== "active" && screen !== "stop") {
      return;
    }

    if (!sessionId) {
      void startSession();
    }
  }, [screen, sessionId, startSession]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const activeSessionId = sessionId;
    liveSessionMountedRef.current = true;

    const endCurrentSession = () => {
      endSession(activeSessionId);
    };

    window.addEventListener("pagehide", endCurrentSession);

    return () => {
      window.removeEventListener("pagehide", endCurrentSession);
      liveSessionMountedRef.current = false;

      window.setTimeout(() => {
        if (
          !liveSessionMountedRef.current &&
          sessionIdRef.current === activeSessionId
        ) {
          endCurrentSession();
        }
      }, 200);
    };
  }, [endSession, sessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let watchId: number | null = null;

    if (preferGps && "geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const nextLocation = {
            currentLat: position.coords.latitude,
            currentLng: position.coords.longitude,
          };
          lastLocationRef.current = nextLocation;
          setCurrentPosition(nextLocation);
          setLocationMode("gps");
        },
        () => {
          if (locationModeRef.current !== "gps") {
            setLocationMode("demo");
          }
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 12_000,
        }
      );
    }

    const tick = () => {
      heartbeat().catch(() => {
        setStatusText("Location update missed. Retrying.");
      });
    };

    tick();
    const interval = window.setInterval(
      tick,
      DRIVER_SESSION_HEARTBEAT_INTERVAL_MS
    );

    return () => {
      window.clearInterval(interval);

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [heartbeat, preferGps, sessionId]);

  const applyAvailability = (minutes: number) => {
    const route = pickRoute(
      data.routeOptions,
      data.availabilityOptions,
      minutes
    );
    setSelectedMinutes(minutes);
    setSelectedRouteId(route.id);
  };

  const resetPhoneRouteProgress = (
    start = getRouteStart(selectedRoute.routeLine)
  ) => {
    currentStopIndexRef.current = 0;
    deliveredCountRef.current = 0;
    lastLocationRef.current = start;
    setCompletedStops({});
    setCurrentStopIndex(0);
    setActiveRoutePath(undefined);
    setCameraPosition(null);
    drivingBearingRef.current = undefined;
    setDrivingBearing(undefined);
    setDirectionDistanceMeters(null);
    setDirectionInstruction(null);
    setDirectionSegmentIndex(0);
    setDirectionStepIndex(0);
    setCurrentPosition(start);
    setCompletionStage("idle");
    setRouteDrivePhase("idle");
    window.localStorage.removeItem(progressKey(selectedRoute.id));
  };

  const animateCurrentPosition = useCallback(
    async ({
      duration,
      line,
      segmentDirections = [],
    }: {
      duration: number;
      line: ReadonlyArray<readonly [number, number]>;
      segmentDirections?: DriverRouteOption["routeDirections"];
    }) => {
      await new Promise<void>((resolve) => {
        const startedAt = performance.now();
        const lineDistance = getLineDistanceMeters(line);
        let previousTimestamp = startedAt;

        const tick = (timestamp: number) => {
          const deltaMs = Math.max(timestamp - previousTimestamp, 16);
          previousTimestamp = timestamp;
          const jumpToEnd = jumpDriveAnimationRef.current;
          const progress = jumpToEnd
            ? 1
            : Math.min((timestamp - startedAt) / duration, 1);

          if (jumpToEnd) {
            jumpDriveAnimationRef.current = false;
          }

          const { bearing, coordinate, distanceAlongLine } =
            getLinePointWithBearing(line, progress);
          const targetBearing = getCameraBearingTarget({
            coordinate,
            distanceAlongLine,
            fallbackBearing: bearing,
            line,
            lineDistance,
          });
          const nextBearing = smoothBearing({
            deltaMs,
            previous: drivingBearingRef.current,
            target: targetBearing,
          });
          const lookaheadProgress =
            lineDistance > 0
              ? Math.min(
                  (distanceAlongLine +
                    driveAnimationTuning.cameraLookaheadMeters) /
                    lineDistance,
                  1
                )
              : progress;
          const { coordinate: cameraCoordinate } = getLinePointWithBearing(
            line,
            lookaheadProgress
          );
          const directionProgress = getDirectionProgress(
            segmentDirections,
            distanceAlongLine
          );
          const [longitude, latitude] = coordinate;
          const [cameraLongitude, cameraLatitude] = cameraCoordinate;
          const nextLocation = {
            currentLat: latitude,
            currentLng: longitude,
          };

          setActiveRoutePath(
            getRemainingLineFromDistance({ distanceAlongLine, line })
          );
          setCameraPosition({
            currentLat: cameraLatitude,
            currentLng: cameraLongitude,
          });
          lastLocationRef.current = nextLocation;
          drivingBearingRef.current = nextBearing;
          setDrivingBearing(nextBearing);
          setCurrentPosition(nextLocation);
          setDirectionStepIndex(directionProgress.stepIndex);
          setDirectionInstruction(directionProgress.instruction ?? null);
          setDirectionDistanceMeters(directionProgress.remainingMeters);

          if (progress < 1) {
            window.requestAnimationFrame(tick);
            return;
          }

          resolve();
        };

        window.requestAnimationFrame(tick);
      });
    },
    []
  );

  const acceptRoute = async () => {
    const depot = getRouteStart(selectedRoute.routeLine);

    resetPhoneRouteProgress(depot);
    setRouteDrivePhase("collecting");
    setScreen("active");
    await startSession();
    setStatusText("Collect food at the depot.");
    await heartbeat().catch(() => {
      setStatusText("Collect food at the depot. Location update will retry.");
    });
  };

  const continueFromAvailability = async () => {
    const depot = getRouteStart(selectedRoute.routeLine);

    lastLocationRef.current = depot;
    setCurrentPosition(depot);
    setLocationMode("demo");
    setStatusText("Preparing your route.");
    setScreen("offer");
  };

  const collectFood = async () => {
    const firstStop = selectedRoute.stops[0];

    if (!firstStop) {
      setRouteDrivePhase("idle");
      setStatusText("Food collected.");
      return;
    }

    const depot = getRouteStart(selectedRoute.routeLine);
    const firstStopCoordinate = [
      firstStop.longitude,
      firstStop.latitude,
    ] as const;
    const segmentDirections = selectedRoute.routeDirections.filter(
      (direction) => direction.segmentIndex === 0
    );
    const animationLine = buildRouteLineBetween({
      from: toRouteCoordinate(depot),
      route: selectedRoute,
      to: firstStopCoordinate,
    });

    setRouteDrivePhase("to_stop");
    setStatusText("Food collected. Driving to the first stop.");
    setActiveRoutePath(animationLine);
    setDirectionSegmentIndex(0);
    setDirectionStepIndex(0);
    setDirectionInstruction(null);
    setDirectionDistanceMeters(segmentDirections[0]?.distanceMeters ?? null);
    await animateCurrentPosition({
      duration: getDriveAnimationDurationMs(animationLine),
      line: animationLine,
      segmentDirections,
    });
    setActiveRoutePath(undefined);
    setCameraPosition(null);
    setRouteDrivePhase("idle");
    setStatusText("Arrived at the first stop.");
    await heartbeat().catch(() => {
      setStatusText("Arrived at the first stop. Location update will retry.");
    });
  };

  const completeStop = async (status: StopOutcome) => {
    if (!currentStop) {
      return;
    }

    const previousCompletedStops = completedStops;
    const nextCompletedStops = {
      ...completedStops,
      [currentStop.id]: status,
    };
    const nextStopIndex = currentStopIndex + 1;
    const nextDeliveredCount = countDelivered(nextCompletedStops);

    setCompletedStops(nextCompletedStops);
    setIsCompleting(true);
    setScreen("active");
    setCompletionStage(status === "delivered" ? "celebrating" : "driving");

    try {
      const activeSessionId = sessionIdRef.current ?? (await startSession());

      if (!activeSessionId) {
        throw new Error("Route session could not start.");
      }

      const response = await fetch("/api/driver/session/stop-complete", {
        body: JSON.stringify({
          sessionId: activeSessionId,
          status,
          stopId: currentStop.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        ok: boolean;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Stop update failed.");
      }

      setStatusText(
        status === "delivered"
          ? "Delivery marked complete."
          : "Stop marked as could not deliver."
      );

      if (status === "delivered") {
        await new Promise((resolve) => window.setTimeout(resolve, 1_250));
      }

      const animationLine = buildDriveAnimationLine({
        from: currentPosition,
        route: selectedRoute,
        stopIndex: currentStopIndex,
      });
      const movementSegmentIndex = nextStopIndex;
      const segmentDirections = selectedRoute.routeDirections.filter(
        (direction) => direction.segmentIndex === movementSegmentIndex
      );

      setCompletionStage("driving");

      if (nextStopIndex < selectedRoute.stops.length) {
        setRouteDrivePhase("to_stop");
        setActiveRoutePath(animationLine);
        setDirectionSegmentIndex(movementSegmentIndex);
        setDirectionStepIndex(0);
        setDirectionInstruction(null);
        setDirectionDistanceMeters(
          segmentDirections[0]?.distanceMeters ?? null
        );
        await animateCurrentPosition({
          duration: getDriveAnimationDurationMs(animationLine),
          line: animationLine,
          segmentDirections,
        });
        setActiveRoutePath(undefined);
        setCameraPosition(null);
        setDirectionStepIndex(Math.max(segmentDirections.length - 1, 0));
        setDirectionInstruction(null);
        setDirectionDistanceMeters(0);
      } else {
        setActiveRoutePath(undefined);
        setCameraPosition(null);
        setDirectionInstruction(null);
        setDirectionDistanceMeters(null);
      }

      currentStopIndexRef.current = nextStopIndex;
      deliveredCountRef.current = nextDeliveredCount;
      setCurrentStopIndex(nextStopIndex);
      await heartbeat({
        currentStopIndex: nextStopIndex,
        deliveredCountLocal: nextDeliveredCount,
      });
      setScreen("active");
    } catch (error) {
      setCompletedStops(previousCompletedStops);
      setStatusText(
        error instanceof Error ? error.message : "Stop update failed."
      );
    } finally {
      setCompletionStage("idle");
      setRouteDrivePhase("idle");
      setIsCompleting(false);
    }
  };

  const resetLocalProgress = () => {
    resetPhoneRouteProgress();
    setScreen("offer");
    setStatusText("Route ready on this phone.");
  };

  const resetRouteForDemo = async () => {
    setStatusText("Resetting this route.");

    try {
      const response = await fetch("/api/driver/session/reset", {
        body: JSON.stringify({
          routeId: selectedRoute.id,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        ok: boolean;
      };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Route reset failed.");
      }

      endSession(sessionIdRef.current);
      sessionIdRef.current = null;
      setSessionId(null);
      setCompletedStops({});
      setCurrentStopIndex(0);
      setActiveRoutePath(undefined);
      setCameraPosition(null);
      drivingBearingRef.current = undefined;
      setDrivingBearing(undefined);
      setDirectionDistanceMeters(null);
      setDirectionSegmentIndex(0);
      setDirectionStepIndex(0);
      setCurrentPosition(getRouteStart(selectedRoute.routeLine));
      setCompletionStage("idle");
      setRouteDrivePhase("idle");
      window.localStorage.removeItem(progressKey(selectedRoute.id));
      setScreen("offer");
      setStatusText("Route reset. Accept it to start again.");
    } catch (error) {
      setStatusText(
        error instanceof Error ? error.message : "Route reset failed."
      );
    }
  };

  const switchDriverForDemo = () => {
    const currentIndex = data.routeOptions.findIndex(
      (route) => route.id === selectedRoute.id
    );
    const nextRoute =
      data.routeOptions[(currentIndex + 1) % data.routeOptions.length] ??
      data.routeOptions[0];

    if (!nextRoute) {
      setStatusText("No other route is ready.");
      return;
    }

    endSession(sessionIdRef.current);
    sessionIdRef.current = null;
    setSessionId(null);
    setActiveRoutePath(undefined);
    setCameraPosition(null);
    drivingBearingRef.current = undefined;
    setDrivingBearing(undefined);
    setDirectionDistanceMeters(null);
    setDirectionSegmentIndex(0);
    setDirectionStepIndex(0);
    setRouteDrivePhase("idle");
    setSelectedRouteId(nextRoute.id);
    setScreen("offer");
    setStatusText(`${nextRoute.volunteer.name} is ready to accept a route.`);
  };

  const toggleLocationForDemo = () => {
    if (preferGps || locationMode === "gps" || locationMode === "asking") {
      setPreferGps(false);
      setLocationMode("demo");
      setStatusText("Demo location is on for the stage demo.");
      return;
    }

    requestLocation();
  };

  useEffect(() => {
    const handleControl = (event: Event) => {
      const action = (
        event as CustomEvent<{ action?: DemoDriverControlAction }>
      ).detail?.action;

      if (action === "jump-to-next-stop") {
        if (routeDrivePhase === "to_stop") {
          jumpDriveAnimationRef.current = true;
          setStatusText("Jumping to the next stop.");
        } else {
          setStatusText("Jump is available while driving.");
        }
        return;
      }

      if (action === "advance-stop") {
        void completeStop("delivered");
        return;
      }

      if (action === "reset-route") {
        void resetRouteForDemo();
        return;
      }

      if (action === "switch-driver") {
        switchDriverForDemo();
        return;
      }

      if (action === "toggle-location") {
        toggleLocationForDemo();
      }
    };

    window.addEventListener(demoDriverControlEvent, handleControl);

    return () => {
      window.removeEventListener(demoDriverControlEvent, handleControl);
    };
  });

  if (screen === "availability") {
    return (
      <section className="mf-enter flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        <p className="sr-only" role="status">
          {statusText}
        </p>
        <div className="border-line mx-1 mt-3 grid shrink-0 justify-items-center gap-4 rounded-[22px] border-[1.5px] bg-[linear-gradient(180deg,rgba(250,226,120,0.24)_0%,rgba(255,255,255,0)_86%)] px-4 py-7 text-center">
          <MealfloIcon name="delivery-van" size={104} />
          <div className="space-y-3">
            <h1 className="font-display text-ink text-[30px] leading-[1.02] font-bold tracking-[-0.03em]">
              Welcome to mealflo
            </h1>
            <p className="text-muted mx-auto max-w-[31ch] text-[15px] leading-5 font-medium">
              Delivering food to those who need it most
            </p>
          </div>
        </div>

        <div className="min-h-4 flex-1" />

        <div className="grid shrink-0 gap-3 px-1">
          <h2 className="font-display text-ink text-[25px] leading-[1.08] font-semibold tracking-[-0.02em]">
            How much time do you have?
          </h2>
          <div
            className="grid gap-2.5"
            role="radiogroup"
            aria-label="Available time"
          >
            {data.availabilityOptions.map((minutes) => (
              <button
                key={minutes}
                type="button"
                aria-checked={selectedMinutes === minutes}
                role="radio"
                onClick={() => applyAvailability(minutes)}
                className={cn(
                  "border-line hover:border-line-strong flex min-h-[56px] w-full items-center justify-between rounded-[14px] border-[1.5px] bg-white px-4 text-left transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.55)]",
                  selectedMinutes === minutes &&
                    "border-[rgba(120,144,250,0.42)] bg-[var(--mf-color-blue-50)]"
                )}
              >
                <span className="font-display text-ink text-[20px] leading-none font-semibold tracking-[-0.01em]">
                  {formatAvailabilityLabel(minutes)}
                </span>
                <span
                  className={cn(
                    "border-line flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] bg-white",
                    selectedMinutes === minutes &&
                      "border-[var(--mf-color-blue-500)]"
                  )}
                  aria-hidden="true"
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 rounded-full bg-transparent",
                      selectedMinutes === minutes && "bg-action"
                    )}
                  />
                </span>
              </button>
            ))}
          </div>

          <Button
            className="mt-1 mb-5 h-12 min-h-12 shrink-0 text-[15px]"
            fullWidth
            onClick={() => void continueFromAvailability()}
            size="md"
            variant="primary"
          >
            Continue
          </Button>
        </div>
      </section>
    );
  }

  if (screen === "offer") {
    return (
      <section className="mf-enter flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 space-y-3 px-1">
          <RouteOfferSummary
            remainingCount={remainingCount}
            route={selectedRoute}
          />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <RouteMap
            className="h-full min-h-0"
            currentPosition={currentPosition}
            currentStop={currentStop}
            route={selectedRoute}
          />
          {locationMode === "asking" ? (
            <div className="absolute inset-x-4 top-4 rounded-[14px] border-[1.5px] border-[rgba(120,144,250,0.24)] bg-white/92 px-4 py-3 backdrop-blur">
              <p className="text-ink text-sm font-semibold">
                Finding your starting point
              </p>
            </div>
          ) : null}
        </div>

        <Button
          className="mb-5 shrink-0"
          fullWidth
          leading={<MealfloIcon name="checkmark-circle" size={32} />}
          onClick={acceptRoute}
          size="lg"
          variant="primary"
          disabled={isStartingSession}
        >
          Start Route
        </Button>
      </section>
    );
  }

  if (routeComplete) {
    return (
      <section className="mf-enter flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="shrink-0 space-y-4 px-1 pt-1">
          <div className="flex items-center gap-4">
            <IconSwatch
              framed
              name="checkmark-circle"
              size={38}
              swatchSize={58}
              tone="surface"
            />
            <h1 className="font-display text-ink text-[42px] leading-[0.98] font-bold tracking-[-0.04em]">
              Thank you!
            </h1>
          </div>
          <CompletionTimeMetrics route={selectedRoute} />
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden">
          <RouteMap
            className="h-full min-h-0"
            currentPosition={currentPosition}
            currentStop={null}
            route={selectedRoute}
          />
        </div>

        <div className="grid shrink-0 gap-3 pb-5">
          <Button
            fullWidth
            onClick={resetLocalProgress}
            size="lg"
            variant="warm"
          >
            Restart demo
          </Button>
        </div>
      </section>
    );
  }

  if (screen === "stop" && currentStop) {
    return (
      <section className="mf-enter flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 pb-2">
        <div className="shrink-0">
          <Button
            leading={<MealfloIcon name="route-road" size={22} />}
            onClick={() => setScreen("active")}
            size="md"
            variant="secondary"
          >
            Back to Map
          </Button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <h1 className="font-display text-ink text-[40px] leading-[1] font-bold tracking-[-0.035em]">
              {currentStop.name}
            </h1>
            <p className="text-muted text-[17px] leading-7">
              {currentStop.address}
            </p>
          </div>

          <section className="border-line space-y-2 border-t-[1.5px] pt-4">
            <div className="flex items-start gap-3">
              <MealfloIcon name="door" size={32} />
              <div>
                <p className="text-ink font-medium">Access notes</p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {currentStop.accessSummary}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <MealfloIcon name="grocery-bag" size={30} />
              <h2 className="font-display text-ink text-[26px] font-semibold tracking-[-0.02em]">
                Items
              </h2>
            </div>
            <div className="grid gap-2">
              {currentStop.items.map((item) => (
                <div
                  key={`${currentStop.id}-${item.name}`}
                  className="border-line border-t-[1.5px] py-3 first:border-t-0"
                >
                  <p className="text-ink font-medium">
                    {item.quantity} {item.name}
                  </p>
                  {item.refrigerated ? (
                    <p className="text-muted mt-1 text-sm leading-6">
                      Keep cold until handoff.
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {currentStop.originalMessageExcerpt ? (
            <section className="border-line space-y-2 border-t-[1.5px] pt-4">
              <p className="text-ink text-sm font-medium">Original note</p>
              <p className="text-muted text-sm leading-6">
                {displayDriverLabel(currentStop.originalMessageExcerpt)}
              </p>
            </section>
          ) : null}
        </div>

        <div className="border-line sticky bottom-0 mt-auto grid gap-2 border-t-[1.5px] bg-[rgba(255,253,240,0.96)] pt-3 pb-[calc(4px+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="grid grid-cols-2 gap-2">
            <CallButton
              className="h-11 min-h-11 text-[15px]"
              phone={currentStopPhone}
              variant="secondary"
            />
            <Button
              className="h-11 min-h-11 text-[15px]"
              fullWidth
              onClick={() => completeStop("could_not_deliver")}
              size="md"
              variant="danger"
              disabled={actionsHidden || isStartingSession}
            >
              Couldn&apos;t deliver
            </Button>
          </div>
          <Button
            fullWidth
            onClick={() => completeStop("delivered")}
            size="lg"
            variant="primary"
            disabled={actionsHidden || isStartingSession}
          >
            Delivered
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="mf-enter -mx-3 flex min-h-0 flex-1 overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <RouteMap
          activeRoutePath={activeRoutePath}
          cameraPosition={cameraPosition}
          className="h-full min-h-0 rounded-none border-0"
          currentPosition={currentPosition}
          currentStop={currentStop}
          drivingBearing={drivingBearing}
          navigationStopIndex={navigationStopIndex}
          route={selectedRoute}
          view="active"
        />

        {currentMapDirection ? (
          <TurnByTurnDirection direction={currentMapDirection} />
        ) : null}

        {completionStage === "celebrating" ? (
          <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[rgba(255,253,240,0.18)]">
            <div className="mf-driver-check flex h-32 w-32 items-center justify-center rounded-full border-[1.5px] border-[rgba(78,173,111,0.26)] bg-white/92 shadow-[0_18px_54px_rgba(24,24,60,0.18)]">
              <MealfloIcon name="checkmark-circle" size={88} />
            </div>
          </div>
        ) : null}

        <div className="border-line absolute inset-x-0 bottom-0 z-20 rounded-t-[22px] border-x-0 border-t-[1.5px] bg-white px-4 pt-4 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-14px_34px_rgba(24,24,60,0.14)]">
          <div className="min-w-0 space-y-3">
            <div className="space-y-1">
              <h1 className="font-display text-ink truncate text-[28px] leading-[1.02] font-bold tracking-[-0.03em]">
                {bottomSheetTitle}
              </h1>
              <p className="text-muted truncate text-sm leading-5">
                {bottomSheetSubtitle}
              </p>
            </div>

            <ProgressDots
              completedStops={completedStops}
              currentStopIndex={navigationStopIndex ?? currentStopIndex}
              isMoving={isRouteMotion}
              stops={selectedRoute.stops}
            />

            {routeDrivePhase === "collecting" ? (
              <Button
                className="h-[56px] min-h-[56px] text-base"
                fullWidth
                leading={<MealfloIcon name="grocery-bag" size={30} />}
                onClick={() => void collectFood()}
                size="lg"
                variant="primary"
                disabled={isStartingSession}
              >
                Collect food
              </Button>
            ) : actionsHidden ? (
              <div className="mf-control-feedback border-line rounded-[14px] border-[1.5px] bg-[rgba(240,243,255,0.64)] px-4 py-3">
                <p className="text-ink text-sm font-semibold">
                  {routeDrivePhase === "to_stop"
                    ? "Driving to the next stop"
                    : completionStage === "celebrating"
                      ? "Delivered"
                      : "Moving to the next stop"}
                </p>
              </div>
            ) : (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    className="h-[54px] min-h-[54px] text-base"
                    fullWidth
                    onClick={() => setScreen("stop")}
                    size="lg"
                    variant="primary"
                  >
                    Details
                  </Button>
                  <Button
                    className="h-[54px] min-h-[54px] text-base"
                    fullWidth
                    onClick={() => completeStop("delivered")}
                    size="lg"
                    variant="warm"
                    disabled={isStartingSession}
                  >
                    Delivered
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <CallButton
                    className="h-11 min-h-11 text-[15px]"
                    phone={currentStopPhone}
                    variant="secondary"
                  />
                  <Button
                    className="h-11 min-h-11 text-[15px]"
                    fullWidth
                    onClick={() => completeStop("could_not_deliver")}
                    size="md"
                    variant="danger"
                    disabled={isStartingSession}
                  >
                    Couldn&apos;t deliver
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

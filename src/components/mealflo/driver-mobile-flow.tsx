"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/mealflo/badge";
import { Button, ButtonLink } from "@/components/mealflo/button";
import { Card } from "@/components/mealflo/card";
import { ChoiceChip } from "@/components/mealflo/field";
import { IconSwatch, MealfloIcon } from "@/components/mealflo/icon";
import {
  demoDriverControlEvent,
  type DemoDriverControlAction,
} from "@/lib/demo";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import type {
  DriverOfferData,
  DriverRouteOption,
  DriverRouteStop,
  LiveMarker,
} from "@/server/mealflo/backend";
import { cn } from "@/lib/utils";

type DriverMobileFlowProps = {
  data: DriverOfferData;
  initialRouteId?: string;
  initialScreen?: DriverScreen;
};

type DriverScreen = "welcome" | "availability" | "offer" | "active" | "stop";
type LocationMode = "asking" | "blocked" | "demo" | "gps" | "idle";
type StopOutcome = "could_not_deliver" | "delivered";

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

const progressKey = (routeId: string) => `mealflo-driver-progress:${routeId}`;
const fingerprintKey = "mealflo-device-fingerprint";
const phoneScrollScreenClass =
  "mf-enter flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain pr-1 pb-2";

function formatAvailabilityLabel(minutes: number) {
  if (minutes === 60) {
    return "1 hr";
  }

  if (minutes % 60 === 30) {
    return `${Math.floor(minutes / 60)}:30`;
  }

  if (minutes % 60 === 0) {
    return `${minutes / 60} hr`;
  }

  return `${minutes} min`;
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

function firstOpenStopIndex(route: DriverRouteOption) {
  const index = route.stops.findIndex((stop) => stop.status !== "delivered");

  return index >= 0 ? index : route.stops.length;
}

function initialCompletedStops(route: DriverRouteOption) {
  return Object.fromEntries(
    route.stops
      .filter((stop) => stop.status === "delivered")
      .map((stop) => [stop.id, "delivered" as StopOutcome])
  );
}

function readStoredProgress(route: DriverRouteOption): StoredProgress {
  const baseline = {
    completedStops: initialCompletedStops(route),
    currentStopIndex: firstOpenStopIndex(route),
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

function getStopWarnings(stop: DriverRouteStop) {
  return stop.warnings.length > 0
    ? stop.warnings.map(displayDriverLabel)
    : ["Standard handoff"];
}

function pickRoute(
  routes: DriverRouteOption[],
  minutesAvailable: number,
  personaId: string
) {
  const personaRoutes = routes.filter(
    (route) => route.volunteer.id === personaId
  );
  const pool = personaRoutes.length > 0 ? personaRoutes : routes;
  const fitting = pool
    .filter((route) => route.plannedTotalMinutes <= minutesAvailable)
    .sort(
      (left, right) =>
        right.plannedTotalMinutes - left.plannedTotalMinutes ||
        left.name.localeCompare(right.name)
    );

  return (
    fitting[0] ??
    pool
      .slice()
      .sort(
        (left, right) =>
          left.plannedTotalMinutes - right.plannedTotalMinutes ||
          left.name.localeCompare(right.name)
      )[0] ??
    routes[0]
  );
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
  stops,
}: {
  completedStops: Record<string, StopOutcome>;
  currentStopIndex: number;
  stops: DriverRouteStop[];
}) {
  return (
    <div className="flex items-center gap-2" aria-label="Route progress">
      {stops.map((stop, index) => {
        const outcome = completedStops[stop.id];
        const active = index === currentStopIndex && !outcome;

        return (
          <span
            key={stop.id}
            className={cn(
              "h-2.5 flex-1 rounded-full transition-[background-color,transform] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-out)]",
              outcome === "delivered"
                ? "bg-[var(--mf-color-green-300)]"
                : outcome === "could_not_deliver"
                  ? "bg-[var(--mf-color-red-300)]"
                  : active
                    ? "bg-action scale-y-125"
                    : "bg-[rgba(24,24,60,0.14)]"
            )}
          />
        );
      })}
    </div>
  );
}

function MetricStrip({
  route,
  remainingCount,
}: {
  remainingCount: number;
  route: DriverRouteOption;
}) {
  const items = [
    {
      label: "Stops",
      value: String(route.stopCount),
    },
    {
      label: "Drive",
      value: route.driveTime,
    },
    {
      label: "Total",
      value: route.totalPlannedTime,
    },
    {
      label: "Left",
      value: String(remainingCount),
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="border-line rounded-[14px] border-[1.5px] bg-white/82 px-2 py-3 text-center"
        >
          <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.02em]">
            {item.value}
          </p>
          <p className="text-muted text-[12px] font-medium">{item.label}</p>
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

function RouteMap({
  children,
  className,
  currentPosition,
  currentStop,
  route,
}: {
  children?: React.ReactNode;
  className?: string;
  currentPosition: { currentLat: number; currentLng: number };
  currentStop: DriverRouteStop | null;
  route: DriverRouteOption;
}) {
  const markers = useMemo<LiveMarker[]>(() => {
    const start = getRouteStart(route.routeLine);
    const stopMarkers = route.stops.map((stop, index) => ({
      id: stop.id,
      label: index === 0 ? "First stop" : `Stop ${index + 1}`,
      latitude: stop.latitude,
      longitude: stop.longitude,
      tone:
        currentStop?.id === stop.id ? ("warning" as const) : ("info" as const),
    }));

    return [
      {
        id: `${route.id}-depot`,
        label: "Depot",
        latitude: start.currentLat,
        longitude: start.currentLng,
        tone: "primary",
      },
      ...stopMarkers,
      {
        id: `${route.id}-driver`,
        label: route.volunteer.name.split(" ")[0] ?? "Driver",
        latitude: currentPosition.currentLat,
        longitude: currentPosition.currentLng,
        tone: "success",
      },
    ];
  }, [currentPosition, currentStop?.id, route]);

  return (
    <MapCanvas
      centerControlLabel="Center to me"
      className={className}
      markers={markers}
      path={route.routeLine}
      showCenterControl
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
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <MealfloIcon name="route-road" size={64} />
        <div className="min-w-0 space-y-1">
          <Badge tone="success">Recommended</Badge>
          <h1 className="font-display text-ink text-[34px] leading-[1.04] font-bold tracking-[-0.03em]">
            {route.name}
          </h1>
          <p className="text-muted text-sm leading-6">{route.area}</p>
        </div>
      </div>
      <MetricStrip remainingCount={remainingCount} route={route} />
    </div>
  );
}

export function DriverMobileFlow({
  data,
  initialRouteId,
  initialScreen = "welcome",
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
  initialScreen = "welcome",
}: DriverMobileFlowProps) {
  const initialRoute = useMemo(
    () =>
      data.routeOptions.find((route) => route.id === initialRouteId) ??
      data.routeOptions.find(
        (route) => route.id === data.suggestedRoute.routeId
      ) ??
      data.routeOptions[0]!,
    [data.routeOptions, data.suggestedRoute.routeId, initialRouteId]
  );
  const [selectedMinutes, setSelectedMinutes] = useState(60);
  const [selectedPersonaId, setSelectedPersonaId] = useState(
    initialRoute.volunteer.id
  );
  const [selectedRouteId, setSelectedRouteId] = useState(initialRoute.id);
  const selectedRoute = useMemo(
    () =>
      data.routeOptions.find((route) => route.id === selectedRouteId) ??
      initialRoute,
    [data.routeOptions, initialRoute, selectedRouteId]
  );
  const [screen, setScreen] = useState<DriverScreen>(initialScreen);
  const [showAlternates, setShowAlternates] = useState(false);
  const [completedStops, setCompletedStops] = useState<
    Record<string, StopOutcome>
  >(() => initialCompletedStops(initialRoute));
  const [currentStopIndex, setCurrentStopIndex] = useState(
    firstOpenStopIndex(initialRoute)
  );
  const [currentPosition, setCurrentPosition] = useState(() =>
    getRouteStart(initialRoute.routeLine)
  );
  const [isAnchor, setIsAnchor] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("idle");
  const [preferGps, setPreferGps] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState(
    "Choose your time window to see the best route."
  );
  const [isStopSheetOpen, setIsStopSheetOpen] = useState(false);
  const locationModeRef = useRef<LocationMode>("idle");
  const lastLocationRef = useRef(getRouteStart(initialRoute.routeLine));
  const currentStopIndexRef = useRef(currentStopIndex);
  const deliveredCountRef = useRef(countDelivered(completedStops));
  const routeRef = useRef(selectedRoute);
  const sessionIdRef = useRef<string | null>(null);
  const demoStepRef = useRef(0);
  const closedSessionIdsRef = useRef<Set<string>>(new Set());
  const liveSessionMountedRef = useRef(false);

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
  const locationLabel =
    locationMode === "gps"
      ? "GPS live"
      : locationMode === "blocked"
        ? "GPS blocked"
        : locationMode === "demo"
          ? "Demo location"
          : locationMode === "asking"
            ? "Asking"
            : "Location ready";

  useEffect(() => {
    const stored = readStoredProgress(selectedRoute);
    const start = getRouteStart(selectedRoute.routeLine);
    let cancelled = false;

    sessionIdRef.current = null;
    lastLocationRef.current = start;
    demoStepRef.current = 0;

    window.queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      setCompletedStops(stored.completedStops);
      setCurrentStopIndex(stored.currentStopIndex);
      setCurrentPosition(start);
      setSessionId(null);
      setIsAnchor(false);
      setIsStopSheetOpen(false);
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
      setStatusText("GPS is unavailable here. Demo location will keep moving.");
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
        setStatusText("GPS was not allowed. Demo location will keep moving.");
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

      setIsAnchor(payload.data.isAnchor);
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

      setIsAnchor(payload.data.isAnchor);
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
      if (locationModeRef.current !== "gps") {
        const line = routeRef.current.routeLine;

        if (line.length > 0) {
          demoStepRef.current = (demoStepRef.current + 1) % line.length;
          const [longitude, latitude] = line[demoStepRef.current]!;
          const nextLocation = {
            currentLat: latitude,
            currentLng: longitude,
          };
          lastLocationRef.current = nextLocation;
          setCurrentPosition(nextLocation);
          setLocationMode("demo");
        }
      }

      heartbeat().catch(() => {
        setStatusText("Location update missed. Retrying.");
      });
    };

    tick();
    const interval = window.setInterval(tick, 15_000);

    return () => {
      window.clearInterval(interval);

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [heartbeat, preferGps, sessionId]);

  const applyAvailability = (minutes: number) => {
    const route = pickRoute(data.routeOptions, minutes, selectedPersonaId);
    setSelectedMinutes(minutes);
    setSelectedRouteId(route.id);
  };

  const applyPersona = (personaId: string) => {
    const route = pickRoute(data.routeOptions, selectedMinutes, personaId);
    setSelectedPersonaId(personaId);
    setSelectedRouteId(route.id);
  };

  const chooseAlternateRoute = (route: DriverRouteOption) => {
    setSelectedPersonaId(route.volunteer.id);
    setSelectedRouteId(route.id);
    setShowAlternates(false);
  };

  const acceptRoute = async () => {
    setScreen("active");
    await startSession();
  };

  const completeStop = async (status: StopOutcome) => {
    if (!currentStop) {
      return;
    }

    const activeSessionId = sessionIdRef.current ?? (await startSession());

    if (!activeSessionId) {
      return;
    }

    setIsCompleting(true);

    try {
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

      const nextCompletedStops = {
        ...completedStops,
        [currentStop.id]: status,
      };
      const nextStopIndex = currentStopIndex + 1;
      const nextDeliveredCount = countDelivered(nextCompletedStops);
      currentStopIndexRef.current = nextStopIndex;
      deliveredCountRef.current = nextDeliveredCount;
      setCompletedStops(nextCompletedStops);
      setCurrentStopIndex(nextStopIndex);
      setStatusText(
        status === "delivered"
          ? "Delivery marked complete."
          : "Stop marked as could not deliver."
      );
      await heartbeat({
        currentStopIndex: nextStopIndex,
        deliveredCountLocal: nextDeliveredCount,
      });
      setScreen("active");
    } catch (error) {
      setStatusText(
        error instanceof Error ? error.message : "Stop update failed."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const resetLocalProgress = () => {
    const baseline = {
      completedStops: initialCompletedStops(selectedRoute),
      currentStopIndex: firstOpenStopIndex(selectedRoute),
    };
    setCompletedStops(baseline.completedStops);
    setCurrentStopIndex(baseline.currentStopIndex);
    window.localStorage.removeItem(progressKey(selectedRoute.id));
    setScreen("offer");
    setStatusText("This phone is reset for the route.");
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
      setIsAnchor(false);
      setCompletedStops({});
      setCurrentStopIndex(0);
      setCurrentPosition(getRouteStart(selectedRoute.routeLine));
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
    const currentIndex = data.personas.findIndex(
      (persona) => persona.id === selectedPersonaId
    );
    const nextPersona =
      data.personas[(currentIndex + 1) % data.personas.length] ??
      data.personas[0];

    if (!nextPersona) {
      setStatusText("No other driver is ready.");
      return;
    }

    endSession(sessionIdRef.current);
    sessionIdRef.current = null;
    setSessionId(null);
    applyPersona(nextPersona.id);
    setScreen("offer");
    setStatusText(`${nextPersona.label} is ready to accept a route.`);
  };

  const toggleLocationForDemo = () => {
    if (preferGps || locationMode === "gps" || locationMode === "asking") {
      setPreferGps(false);
      setLocationMode("demo");
      setStatusText("Fake movement is on for the stage demo.");
      return;
    }

    requestLocation();
  };

  useEffect(() => {
    const handleControl = (event: Event) => {
      const action = (event as CustomEvent<{ action?: DemoDriverControlAction }>)
        .detail?.action;

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

  if (screen === "welcome") {
    return (
      <section className="mf-enter flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex shrink-0 items-start justify-between gap-3 px-1">
          <h1 className="font-display text-ink text-[38px] leading-[0.98] font-bold tracking-[-0.035em]">
            Ready for today&apos;s route
          </h1>
          <MealfloIcon name="delivery-van" size={56} />
        </div>

        <div className="flex shrink-0 items-end justify-between gap-3 px-1">
          <div className="min-w-0">
            <p className="font-display text-ink text-[20px] leading-tight font-semibold tracking-[-0.02em]">
              {selectedRoute.area}
            </p>
          </div>
          <span className="text-muted text-sm font-medium">
            {selectedRoute.stopCount} stops
          </span>
        </div>

        <RouteMap
          className="min-h-0 flex-1"
          currentPosition={currentPosition}
          currentStop={currentStop}
          route={selectedRoute}
        />

        <div className="grid shrink-0 gap-2">
          <Button
            className="text-ink h-11 min-h-11"
            fullWidth
            leading={<MealfloIcon name="location-pin" size={24} />}
            onClick={requestLocation}
            size="md"
            variant="secondary"
          >
            Use phone location
          </Button>
          <Button
            className="h-11 min-h-11"
            fullWidth
            onClick={() => setScreen("availability")}
            size="md"
            variant="primary"
          >
            Continue
          </Button>
          <p role="status" className="text-muted text-center text-sm leading-6">
            {statusText}
          </p>
        </div>
      </section>
    );
  }

  if (screen === "availability") {
    return (
      <section className={phoneScrollScreenClass}>
        <div className="space-y-5">
          <div className="flex items-start gap-4 px-1">
            <MealfloIcon name="clock" size={66} />
            <h1 className="font-display text-ink text-[40px] leading-[1.02] font-bold tracking-[-0.03em]">
              How much time do you have?
            </h1>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {data.availabilityOptions.map((minutes) => (
              <button
                key={minutes}
                type="button"
                onClick={() => applyAvailability(minutes)}
                className="min-h-[64px] rounded-[18px] text-left"
              >
                <ChoiceChip
                  className="h-full w-full justify-center rounded-[18px] text-[18px]"
                  selected={selectedMinutes === minutes}
                >
                  {formatAvailabilityLabel(minutes)}
                </ChoiceChip>
              </button>
            ))}
          </div>
        </div>

        <section className="border-line space-y-4 border-t-[1.5px] pt-4">
          <div className="space-y-1">
            <h2 className="font-display text-ink text-[26px] font-semibold tracking-[-0.02em]">
              Driver
            </h2>
          </div>
          <div className="grid gap-2">
            {data.personas.map((persona) => (
              <button
                key={persona.id}
                type="button"
                onClick={() => applyPersona(persona.id)}
                className="rounded-[16px] text-left"
              >
                <span
                  className={cn(
                    "flex min-h-[58px] items-center gap-3 rounded-[16px] border-[1.5px] px-3 py-2 transition-[border-color,background-color,transform] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]",
                    selectedPersonaId === persona.id
                      ? "border-[rgba(120,144,250,0.35)] bg-[var(--mf-color-blue-50)]"
                      : "border-line bg-white"
                  )}
                >
                  <MealfloIcon name="user-profile" size={32} />
                  <span>
                    <span className="text-ink block font-medium">
                      {persona.label}
                    </span>
                    <span className="text-muted block text-sm leading-5">
                      {persona.note}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <Button
          className="mt-auto"
          fullWidth
          onClick={() => setScreen("offer")}
          size="lg"
          variant="primary"
        >
          Start route
        </Button>
      </section>
    );
  }

  if (screen === "offer") {
    return (
      <section className={phoneScrollScreenClass}>
        <div className="space-y-5 rounded-[18px] bg-[rgba(240,243,255,0.62)] p-4">
          <RouteOfferSummary
            remainingCount={remainingCount}
            route={selectedRoute}
          />
          <div className="border-line border-t-[1.5px] pt-4">
            <p className="text-muted text-sm font-medium">First stop</p>
            <p className="font-display text-ink mt-1 text-[24px] font-semibold tracking-[-0.02em]">
              {selectedRoute.firstStop}
            </p>
            <p className="text-muted mt-1 text-sm leading-6">
              {displayDriverLabel(selectedRoute.coldChainNote)}
            </p>
          </div>
        </div>

        <RouteMap
          className="h-[300px]"
          currentPosition={currentPosition}
          currentStop={currentStop}
          route={selectedRoute}
        />

        {showAlternates ? (
          <div className="grid gap-2">
            {data.routeOptions.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => chooseAlternateRoute(route)}
                className={cn(
                  "rounded-[16px] border-[1.5px] px-4 py-3 text-left transition-[border-color,background-color,transform] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]",
                  selectedRoute.id === route.id
                    ? "border-[rgba(120,144,250,0.35)] bg-[var(--mf-color-blue-50)]"
                    : "border-line bg-white"
                )}
              >
                <span className="text-ink block font-medium">{route.name}</span>
                <span className="text-muted block text-sm leading-6">
                  {route.stopCount} stops, {route.totalPlannedTime},{" "}
                  {route.volunteer.name}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-auto grid gap-3">
          <Button
            fullWidth
            leading={<MealfloIcon name="checkmark-circle" size={24} />}
            onClick={acceptRoute}
            size="lg"
            variant="primary"
            disabled={isStartingSession}
          >
            Accept route
          </Button>
          <Button
            fullWidth
            onClick={() => setShowAlternates((value) => !value)}
            size="lg"
            variant="secondary"
          >
            {showAlternates ? "Hide routes" : "Choose another route"}
          </Button>
        </div>
      </section>
    );
  }

  if (routeComplete) {
    return (
      <section className={phoneScrollScreenClass}>
        <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(237,250,243,0.9)_0%,rgba(255,255,255,1)_72%)]">
          <IconSwatch
            framed
            name="checkmark-circle"
            size={44}
            swatchSize={70}
            tone="surface"
          />
          <div className="space-y-3">
            <Badge tone={isAnchor ? "success" : "info"}>
              {isAnchor ? "Dashboard updated" : "Local route complete"}
            </Badge>
            <h1 className="font-display text-ink text-[44px] leading-[0.98] font-bold tracking-[-0.04em]">
              All stops handled
            </h1>
            <p className="text-muted text-[17px] leading-7">
              {deliveredCount} delivered on this phone. Dispatch can reopen the
              route if another pass is needed.
            </p>
          </div>
          <MetricStrip remainingCount={0} route={selectedRoute} />
        </Card>

        <RouteMap
          className="h-[280px]"
          currentPosition={currentPosition}
          currentStop={null}
          route={selectedRoute}
        />

        <div className="mt-auto grid gap-3">
          <Button
            fullWidth
            onClick={resetLocalProgress}
            size="lg"
            variant="warm"
          >
            Reset this phone
          </Button>
          <Button
            fullWidth
            onClick={() => setScreen("availability")}
            size="lg"
            variant="secondary"
          >
            Change time
          </Button>
        </div>
      </section>
    );
  }

  if (screen === "stop" && currentStop) {
    return (
      <section className={phoneScrollScreenClass}>
        <div className="flex items-center justify-between gap-3">
          <Button
            leading={<MealfloIcon name="route-road" size={22} />}
            onClick={() => setScreen("active")}
            size="md"
            variant="secondary"
          >
            Map
          </Button>
          <Badge tone={locationMode === "gps" ? "success" : "neutral"}>
            {locationLabel}
          </Badge>
        </div>

        <Card className="space-y-5">
          <div className="space-y-3">
            <Badge tone="warning">
              Stop {currentStopIndex + 1} of {selectedRoute.stops.length}
            </Badge>
            <div className="space-y-2">
              <h1 className="font-display text-ink text-[40px] leading-[1] font-bold tracking-[-0.035em]">
                {currentStop.name}
              </h1>
              <p className="text-muted text-[17px] leading-7">
                {currentStop.address}
              </p>
            </div>
          </div>

          <div className="border-line space-y-2 border-t-[1.5px] pt-4">
            <div className="flex items-start gap-3">
              <MealfloIcon name="door" size={32} />
              <div>
                <p className="text-ink font-medium">Access notes</p>
                <p className="text-muted mt-1 text-sm leading-6">
                  {currentStop.accessSummary}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
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
                  className="border-line rounded-[14px] border-[1.5px] bg-white px-3 py-3"
                >
                  <p className="text-ink font-medium">
                    {item.quantity} {item.name}
                  </p>
                  <p className="text-muted mt-1 text-sm leading-6">
                    {[...item.dietaryTags, ...item.allergenFlags]
                      .map((entry) => entry.replace(/_/g, " "))
                      .join(", ") || "No dietary tags"}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {getStopWarnings(currentStop).map((warning) => (
              <Badge
                key={warning}
                tone={
                  /allergy|do not|two-person|refrigeration/i.test(warning)
                    ? "warning"
                    : "neutral"
                }
              >
                {displayDriverLabel(warning)}
              </Badge>
            ))}
          </div>

          {currentStop.originalMessageExcerpt ? (
            <div className="border-line space-y-2 border-t-[1.5px] pt-4">
              <p className="text-ink text-sm font-medium">Original note</p>
              <p className="text-muted text-sm leading-6">
                {displayDriverLabel(currentStop.originalMessageExcerpt)}
              </p>
            </div>
          ) : null}
        </Card>

        <div className="border-line sticky bottom-3 grid gap-3 rounded-[20px] border-[1.5px] bg-[rgba(255,253,240,0.94)] p-3 backdrop-blur">
          <CallButton phone={currentStopPhone} variant="secondary" />
          <div className="grid grid-cols-2 gap-3">
            <Button
              fullWidth
              onClick={() => completeStop("delivered")}
              size="lg"
              variant="primary"
              disabled={isCompleting || isStartingSession}
            >
              Delivered
            </Button>
            <Button
              fullWidth
              onClick={() => completeStop("could_not_deliver")}
              size="lg"
              variant="danger"
              disabled={isCompleting || isStartingSession}
            >
              Couldn&apos;t
            </Button>
          </div>
          <p role="status" className="text-muted text-center text-sm leading-6">
            {statusText}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mf-enter -mx-3 flex min-h-0 flex-1 overflow-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <RouteMap
          className="h-full min-h-0 rounded-none border-0"
          currentPosition={currentPosition}
          currentStop={currentStop}
          route={selectedRoute}
        />

        <div className="border-line absolute inset-x-0 bottom-0 z-20 rounded-t-[24px] border-x-0 border-t-[1.5px] bg-white px-3 pt-2 pb-[calc(10px+env(safe-area-inset-bottom))] shadow-[0_-14px_34px_rgba(24,24,60,0.14)] transition-[padding,box-shadow] duration-[var(--mf-duration-slow)] ease-[var(--mf-ease-spring)]">
          <button
            type="button"
            aria-expanded={isStopSheetOpen}
            className="mx-auto mb-2 flex h-7 w-20 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.55)]"
            onClick={() => setIsStopSheetOpen((value) => !value)}
          >
            <span className="bg-line-strong h-1.5 w-12 rounded-full" />
            <span className="sr-only">
              {isStopSheetOpen ? "Collapse stop sheet" : "Expand stop sheet"}
            </span>
          </button>

          <div className="grid grid-cols-[1fr_auto] items-start gap-3">
            <div className="min-w-0 space-y-1">
              <Badge tone="warning">
                Stop {currentStopIndex + 1} of {selectedRoute.stops.length}
              </Badge>
              <h1 className="font-display text-ink truncate text-[27px] leading-[1.02] font-bold tracking-[-0.03em]">
                {currentStop?.name}
              </h1>
              {isStopSheetOpen ? (
                <p className="text-muted truncate text-sm leading-5">
                  {currentStop?.address}
                </p>
              ) : null}
            </div>
            <MealfloIcon name="location-pin" size={38} />
          </div>

          {isStopSheetOpen ? (
            <>
              <div className="mt-3">
                <ProgressDots
                  completedStops={completedStops}
                  currentStopIndex={currentStopIndex}
                  stops={selectedRoute.stops}
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <CallButton
                  className="h-11 min-h-11 text-sm"
                  phone={currentStopPhone}
                  variant="secondary"
                />
                <Button
                  className="h-11 min-h-11 text-sm"
                  fullWidth
                  onClick={() => setScreen("stop")}
                  size="md"
                  variant="primary"
                >
                  Stop details
                </Button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button
                  className="h-11 min-h-11 text-sm"
                  fullWidth
                  onClick={() => completeStop("delivered")}
                  size="md"
                  variant="warm"
                  disabled={isCompleting || isStartingSession}
                >
                  Delivered
                </Button>
                <Button
                  className="h-11 min-h-11 text-sm"
                  fullWidth
                  onClick={() => completeStop("could_not_deliver")}
                  size="md"
                  variant="danger"
                  disabled={isCompleting || isStartingSession}
                >
                  couldn&apos;t deliver
                </Button>
              </div>

              <p
                role="status"
                className="text-muted mt-2 truncate text-center text-xs leading-5"
              >
                {statusText}
              </p>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

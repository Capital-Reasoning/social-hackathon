"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";

type SessionResponse = {
  data?: {
    id: string;
    isAnchor: boolean;
  };
  error?: string;
  ok: boolean;
};

type DriverSessionClientProps = {
  currentStopId: string | null;
  initialDeliveredCount: number;
  initialStopIndex: number;
  routeId: string;
  routeLine: ReadonlyArray<readonly [number, number]>;
  volunteerId: string;
};

function getDeviceFingerprint() {
  const existing = window.localStorage.getItem("mealflo-device-fingerprint");

  if (existing) {
    return existing;
  }

  const fingerprint = `driver-${crypto.randomUUID()}`;
  window.localStorage.setItem("mealflo-device-fingerprint", fingerprint);

  return fingerprint;
}

function routePointToLatLng(
  routeLine: ReadonlyArray<readonly [number, number]>
) {
  const [longitude, latitude] = routeLine[0] ?? [-123.3748, 48.4291];

  return {
    currentLat: latitude,
    currentLng: longitude,
  };
}

export function DriverSessionClient({
  currentStopId,
  initialDeliveredCount,
  initialStopIndex,
  routeId,
  routeLine,
  volunteerId,
}: DriverSessionClientProps) {
  const router = useRouter();
  const [deliveredCount, setDeliveredCount] = useState(initialDeliveredCount);
  const [isAnchor, setIsAnchor] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [locationMode, setLocationMode] = useState<"demo" | "gps" | "starting">(
    "starting"
  );
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Starting route session.");
  const stopIndexRef = useRef(initialStopIndex);
  const deliveredCountRef = useRef(initialDeliveredCount);
  const lastLocationRef = useRef(routePointToLatLng(routeLine));
  const demoStepRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);
  const closedSessionIdsRef = useRef<Set<string>>(new Set());
  const liveSessionMountedRef = useRef(false);

  const canComplete = Boolean(sessionId && currentStopId && !isCompleting);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const heartbeat = useCallback(
    async (override?: { deliveredCountLocal?: number; stopIndex?: number }) => {
      if (!sessionId) {
        return;
      }

      const deliveredCountLocal =
        override?.deliveredCountLocal ?? deliveredCountRef.current;
      const currentStopIndex = override?.stopIndex ?? stopIndexRef.current;
      const response = await fetch("/api/driver/session/heartbeat", {
        body: JSON.stringify({
          ...lastLocationRef.current,
          currentStopIndex,
          deliveredCountLocal,
          sessionId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Heartbeat failed.");
      }

      setIsAnchor(payload.data.isAnchor);
    },
    [sessionId]
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

  useEffect(() => {
    let cancelled = false;

    async function startSession() {
      const response = await fetch("/api/driver/session/start", {
        body: JSON.stringify({
          ...lastLocationRef.current,
          deviceFingerprint: getDeviceFingerprint(),
          routeId,
          volunteerId,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as SessionResponse;

      if (cancelled) {
        return;
      }

      if (!response.ok || !payload.ok || !payload.data) {
        setStatusText(payload.error ?? "Route session could not start.");
        return;
      }

      setIsAnchor(payload.data.isAnchor);
      setSessionId(payload.data.id);
      setStatusText(
        payload.data.isAnchor
          ? "This phone is live on the dashboard."
          : "This phone is following locally."
      );
    }

    startSession().catch(() => {
      if (!cancelled) {
        setStatusText("Route session could not start.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [routeId, volunteerId]);

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

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          lastLocationRef.current = {
            currentLat: position.coords.latitude,
            currentLng: position.coords.longitude,
          };
          setLocationMode("gps");
        },
        () => {
          setLocationMode("demo");
        },
        {
          enableHighAccuracy: true,
          maximumAge: 10_000,
          timeout: 12_000,
        }
      );
    } else {
      window.setTimeout(() => setLocationMode("demo"), 0);
    }

    const interval = window.setInterval(() => {
      if (locationMode !== "gps" && routeLine.length > 0) {
        demoStepRef.current = (demoStepRef.current + 1) % routeLine.length;
        const [longitude, latitude] = routeLine[demoStepRef.current]!;
        lastLocationRef.current = {
          currentLat: latitude,
          currentLng: longitude,
        };
      }

      heartbeat().catch(() => {
        setStatusText("Location update missed. Retrying.");
      });
    }, 15_000);

    heartbeat().catch(() => {
      setStatusText("Location update missed. Retrying.");
    });

    return () => {
      window.clearInterval(interval);

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [heartbeat, locationMode, routeLine, sessionId]);

  const completeStop = async (status: "could_not_deliver" | "delivered") => {
    if (!sessionId || !currentStopId) {
      return;
    }

    setIsCompleting(true);

    try {
      const response = await fetch("/api/driver/session/stop-complete", {
        body: JSON.stringify({
          sessionId,
          status,
          stopId: currentStopId,
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

      const nextDeliveredCount =
        status === "delivered"
          ? deliveredCountRef.current + 1
          : deliveredCountRef.current;
      const nextStopIndex = stopIndexRef.current + 1;
      deliveredCountRef.current = nextDeliveredCount;
      stopIndexRef.current = nextStopIndex;
      setDeliveredCount(nextDeliveredCount);
      setStatusText(
        status === "delivered"
          ? "Delivery marked complete."
          : "Stop marked as could not deliver."
      );
      await heartbeat({
        deliveredCountLocal: nextDeliveredCount,
        stopIndex: nextStopIndex,
      });
      router.refresh();
    } catch (error) {
      setStatusText(
        error instanceof Error ? error.message : "Stop update failed."
      );
    } finally {
      setIsCompleting(false);
    }
  };

  const locationLabel = useMemo(() => {
    if (locationMode === "gps") {
      return "GPS live";
    }

    if (locationMode === "demo") {
      return "Demo location";
    }

    return "Starting";
  }, [locationMode]);

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={isAnchor ? "success" : "info"}>
          {isAnchor ? "Dashboard anchor" : "Local session"}
        </Badge>
        <Badge tone={locationMode === "gps" ? "success" : "neutral"}>
          {locationLabel}
        </Badge>
        <Badge tone="neutral">{deliveredCount} delivered</Badge>
      </div>
      <p role="status" className="text-muted text-sm leading-6">
        {statusText}
      </p>
      <Button
        fullWidth
        size="lg"
        variant="primary"
        disabled={!canComplete}
        onClick={() => completeStop("delivered")}
      >
        Mark delivered
      </Button>
      <Button
        fullWidth
        size="lg"
        variant="warm"
        disabled={!canComplete}
        onClick={() => completeStop("could_not_deliver")}
      >
        Couldn&apos;t deliver
      </Button>
    </div>
  );
}

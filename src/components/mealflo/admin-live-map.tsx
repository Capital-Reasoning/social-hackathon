"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { MealfloIcon } from "@/components/mealflo/icon";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import type { LiveMarker, TriageRequestCard } from "@/server/mealflo/backend";

const LIVE_DRIVER_POLL_INTERVAL_MS = 3_000;

type AdminLiveResponse = {
  data?: {
    liveMarkers: LiveMarker[];
  };
  error?: string;
  ok: boolean;
};

function urgencyValue(value: string) {
  const numeric = Number.parseInt(value, 10);

  if (!Number.isFinite(numeric)) {
    return 1;
  }

  return Math.max(1, Math.min(10, Math.round(numeric / 10)));
}

function requestMarkerTone(request: TriageRequestCard): LiveMarker["tone"] {
  if (request.status === "delivered") {
    return "success";
  }

  if (request.status === "held" || urgencyValue(request.urgency) >= 8) {
    return "warning";
  }

  return "info";
}

function todayDeliveryMarkers(
  requests: readonly TriageRequestCard[],
  driverMarkers: readonly LiveMarker[]
): LiveMarker[] {
  const requestMarkers = requests.map((request) => ({
    description: request.address,
    id: `today-${request.id}`,
    label: request.clientName,
    latitude: request.latitude,
    longitude: request.longitude,
    tone: requestMarkerTone(request),
  }));

  return [...requestMarkers, ...driverMarkers];
}

function MapActivityIndicator({ count }: { count: number }) {
  return (
    <div className="text-info-text inline-flex items-baseline gap-2 text-[17px] leading-none font-semibold">
      <MealfloIcon name="route-road" size={25} className="translate-y-[5px]" />
      <span>{count} active</span>
    </div>
  );
}

const mapLegendItems = [
  {
    className: "border-[rgba(32,56,192,0.34)] bg-[var(--mf-color-blue-300)]",
    label: "Ready stop",
  },
  {
    className: "border-[rgba(196,125,0,0.36)] bg-[var(--mf-color-amber-300)]",
    label: "High urgency",
  },
  {
    className: "border-[rgba(46,138,80,0.36)] bg-[var(--mf-color-green-300)]",
    label: "Delivered",
  },
] as const;

function MapLegend() {
  return (
    <ul
      aria-label="Map marker legend"
      className="text-muted flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium"
    >
      {mapLegendItems.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`block h-3.5 w-3.5 rounded-full border-[2px] shadow-[0_0_0_2px_rgba(255,255,255,0.92)] ${item.className}`}
          />
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function LiveMapHeader({ activeDriverCount }: { activeDriverCount: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline">
      <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
        Live map
      </h2>
      <div className="min-w-0 sm:justify-self-center">
        <MapLegend />
      </div>
      <div className="sm:justify-self-end">
        <MapActivityIndicator count={activeDriverCount} />
      </div>
    </div>
  );
}

export function AdminLiveMap({
  initialLiveMarkers,
  requests,
}: {
  initialLiveMarkers: readonly LiveMarker[];
  requests: readonly TriageRequestCard[];
}) {
  const [liveMarkers, setLiveMarkers] =
    useState<readonly LiveMarker[]>(initialLiveMarkers);
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    const pollLiveMarkers = async () => {
      if (controller) {
        return;
      }

      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      controller = new AbortController();

      try {
        const response = await fetch("/api/admin/live", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as AdminLiveResponse;

        if (
          !cancelled &&
          requestRef.current === requestId &&
          response.ok &&
          payload.ok &&
          payload.data
        ) {
          setLiveMarkers(payload.data.liveMarkers);
        }
      } catch (error) {
        if (
          !cancelled &&
          !(error instanceof DOMException && error.name === "AbortError")
        ) {
          console.warn("Live driver polling missed an update.", error);
        }
      } finally {
        controller = null;
      }
    };

    void pollLiveMarkers();
    const interval = window.setInterval(
      pollLiveMarkers,
      LIVE_DRIVER_POLL_INTERVAL_MS
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      controller?.abort();
    };
  }, []);

  const activeDriverMarkers = useMemo(
    () => liveMarkers.filter((marker) => marker.id.startsWith("driver-")),
    [liveMarkers]
  );
  const markers = useMemo(
    () => todayDeliveryMarkers(requests, activeDriverMarkers),
    [activeDriverMarkers, requests]
  );

  return (
    <section className="space-y-3">
      <LiveMapHeader activeDriverCount={activeDriverMarkers.length} />
      <MapCanvas
        className="h-[640px]"
        initialView="greater-victoria"
        markerScale="large"
        markerStyle="dot"
        markers={markers}
      />
    </section>
  );
}

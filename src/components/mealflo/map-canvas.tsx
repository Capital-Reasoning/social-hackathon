"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import maplibregl, { type StyleSpecification } from "maplibre-gl";

import { MealfloIcon } from "@/components/mealflo/icon";
import { publicEnv } from "@/lib/config/public-env";
import { cn } from "@/lib/utils";

type MarkerPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: "primary" | "success" | "warning" | "info";
};

type MapCanvasProps = {
  centerControlLabel?: string;
  className?: string;
  children?: ReactNode;
  initialView?: "markers" | "greater-victoria";
  markers: readonly MarkerPoint[];
  path?: readonly (readonly [number, number])[];
  showCenterControl?: boolean;
};

const GREATER_VICTORIA_BOUNDS = {
  east: -123.18,
  north: 48.72,
  south: 48.28,
  west: -123.75,
};

const OSM_RASTER_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "(c) OpenStreetMap contributors",
    },
  },
  layers: [
    {
      id: "osm",
      source: "osm",
      type: "raster",
    },
  ],
};

const toneColors: Record<MarkerPoint["tone"], string> = {
  primary: "#fae278",
  success: "#4ead6f",
  warning: "#f0a830",
  info: "#7890fa",
};

function getMarkerLabel(label: string) {
  const words = label
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function getMapStyle() {
  if (
    !publicEnv.mapStyleUrl ||
    publicEnv.mapStyleUrl.includes("demotiles.maplibre.org")
  ) {
    return OSM_RASTER_STYLE;
  }

  return publicEnv.mapStyleUrl;
}

export function MapCanvas({
  centerControlLabel = "Center to me",
  children,
  className,
  initialView = "markers",
  markers,
  path,
  showCenterControl = false,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || fallbackReason) {
      return;
    }

    let cleanedUp = false;
    let map: maplibregl.Map | null = null;
    let frame = 0;
    let resizeFrame = 0;

    const handleMapError = (event: unknown) => {
      if (cleanedUp) {
        return;
      }

      console.warn("MapCanvas encountered a runtime map error.", event);
      setFallbackReason("Map preview unavailable");

      if (map) {
        map.remove();
        map = null;
      }
    };

    frame = window.requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      const supportsWebGl =
        Boolean(canvas.getContext("webgl2")) ||
        Boolean(canvas.getContext("webgl")) ||
        Boolean(canvas.getContext("experimental-webgl"));

      if (!supportsWebGl) {
        setFallbackReason("WebGL unavailable");
        return;
      }

      try {
        map = new maplibregl.Map({
          attributionControl: false,
          container: containerRef.current!,
          style: getMapStyle(),
          center:
            initialView === "greater-victoria"
              ? [-123.48, 48.49]
              : [
                  markers[0]?.longitude ?? -123.3656,
                  markers[0]?.latitude ?? 48.4284,
                ],
          zoom: initialView === "greater-victoria" ? 9.45 : 11.5,
        });
        mapRef.current = map;
        resizeFrame = window.requestAnimationFrame(() => {
          map?.resize();
        });
      } catch (error) {
        console.warn("MapCanvas fell back to the static preview.", error);
        setFallbackReason("Map preview unavailable");
        return;
      }

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right"
      );
      map.on("error", handleMapError);

      map.on("load", () => {
        const liveMap = map;

        if (!liveMap) {
          return;
        }

        liveMap.resize();

        if (path && path.length > 1) {
          liveMap.addSource("mealflo-route", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: path.map(([longitude, latitude]) => [
                  longitude,
                  latitude,
                ]),
              },
              properties: {},
            },
          });

          liveMap.addLayer({
            id: "mealflo-route-line",
            source: "mealflo-route",
            type: "line",
            paint: {
              "line-color": "#3d5cf5",
              "line-width": 5,
              "line-opacity": 0.78,
            },
          });
        }

        const bounds = new maplibregl.LngLatBounds();

        markers.forEach((marker) => {
          const el = document.createElement("div");
          el.className =
            "flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-white/90 px-3";
          el.style.backgroundColor = toneColors[marker.tone];
          const label = document.createElement("span");
          label.textContent = getMarkerLabel(marker.label);
          label.style.fontFamily = "var(--mf-font-body)";
          label.style.fontSize = "11px";
          label.style.fontWeight = "700";
          label.style.letterSpacing = "0.02em";
          label.style.color = "#1c1c2e";
          el.append(label);

          new maplibregl.Marker({ element: el, anchor: "center" })
            .setLngLat([marker.longitude, marker.latitude])
            .addTo(liveMap);

          bounds.extend([marker.longitude, marker.latitude]);
        });

        if (initialView === "greater-victoria") {
          liveMap.fitBounds(
            [
              [GREATER_VICTORIA_BOUNDS.west, GREATER_VICTORIA_BOUNDS.south],
              [GREATER_VICTORIA_BOUNDS.east, GREATER_VICTORIA_BOUNDS.north],
            ],
            {
              maxZoom: 10.8,
              padding: 32,
            }
          );
        } else if (!bounds.isEmpty()) {
          liveMap.fitBounds(bounds, {
            padding: 64,
            maxZoom: 13,
          });
        }
      });
    });

    return () => {
      cleanedUp = true;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resizeFrame);

      if (map) {
        map.remove();
      }

      mapRef.current = null;
    };
  }, [fallbackReason, initialView, markers, path]);

  const centerMarker =
    markers.find((marker) => marker.id.includes("driver")) ?? markers[0];

  const centerMap = () => {
    const map = mapRef.current;

    if (!map || !centerMarker) {
      return;
    }

    map.easeTo({
      center: [centerMarker.longitude, centerMarker.latitude],
      duration: 520,
      zoom: Math.max(map.getZoom(), 12.5),
    });
  };

  const routePoints = path
    ? path.map(
        (coordinate) =>
          `${coordinate[1].toFixed(3)}, ${coordinate[0].toFixed(3)}`
      )
    : [];

  return (
    <div
      className={cn(
        "border-line bg-surface-tint relative h-[320px] min-h-[320px] overflow-hidden rounded-[18px] border-[1.5px]",
        className
      )}
    >
      {fallbackReason === null ? (
        <div
          ref={containerRef}
          aria-label="Map preview"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <div
          aria-label="Static route preview"
          className="absolute inset-0 flex h-full w-full flex-col justify-between bg-[linear-gradient(180deg,rgba(250,226,120,0.18),rgba(255,255,255,0.96))] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-ink text-[22px] font-semibold tracking-[-0.02em]">
                Route preview
              </p>
              <p className="text-muted text-sm leading-6">
                {fallbackReason ?? "Static preview in use."}
              </p>
            </div>
            <span className="border-line text-muted rounded-full border-[1.5px] bg-white px-3 py-1 text-xs font-medium">
              Static fallback
            </span>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <p className="text-muted text-xs font-medium tracking-[0.08em] uppercase">
                Stops
              </p>
              <div className="grid gap-2">
                {markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="border-line flex items-center gap-3 rounded-[14px] border-[1.5px] bg-white/85 px-3 py-2"
                  >
                    <span
                      className="text-ink flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-white/90 text-[11px] font-bold tracking-[0.02em]"
                      style={{ backgroundColor: toneColors[marker.tone] }}
                    >
                      {getMarkerLabel(marker.label)}
                    </span>
                    <div>
                      <p className="text-ink text-sm font-medium">
                        {marker.label}
                      </p>
                      <p className="text-muted text-xs">
                        {marker.latitude.toFixed(3)},{" "}
                        {marker.longitude.toFixed(3)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-muted text-xs font-medium tracking-[0.08em] uppercase">
                Route line
              </p>
              <div className="border-line rounded-[14px] border-[1.5px] border-dashed bg-white/75 p-3">
                {routePoints.length > 1 ? (
                  <ol className="text-ink grid gap-2 text-sm">
                    {routePoints.map((point, index) => (
                      <li key={`${point}-${index}`} className="leading-6">
                        {index + 1}. {point}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-muted text-sm leading-6">
                    Route geometry is available once a stop sequence is
                    assigned.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showCenterControl && fallbackReason === null ? (
        <button
          type="button"
          aria-label={centerControlLabel}
          title={centerControlLabel}
          className="text-ink hover:border-line-strong absolute top-[88px] right-3 z-10 flex h-10 w-10 items-center justify-center rounded-[12px] border-[1.5px] border-[rgba(24,24,60,0.16)] bg-white shadow-sm transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.92)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.55)]"
          onClick={centerMap}
        >
          <MealfloIcon name="location-pin" size={22} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

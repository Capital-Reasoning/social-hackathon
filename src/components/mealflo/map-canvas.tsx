"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import type { StaticImageData } from "next/image";
import maplibregl, { type StyleSpecification } from "maplibre-gl";

import { MealfloIcon } from "@/components/mealflo/icon";
import { publicEnv } from "@/lib/config/public-env";
import { cn } from "@/lib/utils";
import deliveryVan from "../../../design/assets/icons/delivery-van.png";
import groceryBag from "../../../design/assets/icons/grocery-bag.png";
import locationPin from "../../../design/assets/icons/location-pin.png";
import mealContainer from "../../../design/assets/icons/meal-container.png";

type MarkerPoint = {
  icon?: "delivery-van" | "grocery-bag" | "location-pin" | "meal-container";
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  tone: "primary" | "success" | "warning" | "info" | "neutral";
};

type MapCanvasProps = {
  centerControlLabel?: string;
  className?: string;
  children?: ReactNode;
  initialView?: "markers" | "greater-victoria";
  interactionLocked?: boolean;
  markerStyle?: "label" | "dot" | "icon";
  markers: readonly MarkerPoint[];
  activePath?: readonly (readonly [number, number])[];
  futurePath?: readonly (readonly [number, number])[];
  path?: readonly (readonly [number, number])[];
  camera?: {
    bearing?: number;
    center?: {
      latitude: number;
      longitude: number;
    };
    duration?: number;
    followMarkerId?: string;
    mode?: "fit" | "driver";
    pitch?: number;
    zoom?: number;
  };
  showNavigationControls?: boolean;
  showCenterControl?: boolean;
};

const GREATER_VICTORIA_BOUNDS = {
  east: -123.27,
  north: 48.69,
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
  neutral: "#ffffff",
  primary: "#fae278",
  success: "#4ead6f",
  warning: "#f0a830",
  info: "#7890fa",
};

const toneBorders: Record<MarkerPoint["tone"], string> = {
  neutral: "rgba(24, 24, 60, 0.3)",
  primary: "rgba(170, 120, 0, 0.34)",
  success: "rgba(46, 138, 80, 0.36)",
  warning: "rgba(196, 125, 0, 0.36)",
  info: "rgba(32, 56, 192, 0.34)",
};

const markerIcons = {
  "delivery-van": deliveryVan,
  "grocery-bag": groceryBag,
  "location-pin": locationPin,
  "meal-container": mealContainer,
} satisfies Record<NonNullable<MarkerPoint["icon"]>, StaticImageData>;

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

function createRouteData(path?: readonly (readonly [number, number])[]) {
  const routeCoordinates =
    path && path.length > 1
      ? path.map(([longitude, latitude]) => [longitude, latitude])
      : [];

  return routeCoordinates.length > 1
    ? {
        type: "Feature" as const,
        geometry: {
          type: "LineString" as const,
          coordinates: routeCoordinates,
        },
        properties: {},
      }
    : {
        type: "FeatureCollection" as const,
        features: [],
      };
}

function easeCamera(value: number) {
  return 1 - Math.pow(1 - value, 3);
}

function setRouteSourceData({
  data,
  layer,
  map,
  paint,
  source,
}: {
  data: ReturnType<typeof createRouteData>;
  layer: string;
  map: maplibregl.Map;
  paint: maplibregl.LineLayerSpecification["paint"];
  source: string;
}) {
  const existingSource = map.getSource(source) as
    | maplibregl.GeoJSONSource
    | undefined;

  if (existingSource) {
    existingSource.setData(data);
    return;
  }

  map.addSource(source, {
    type: "geojson",
    data,
  });

  map.addLayer({
    id: layer,
    source,
    type: "line",
    paint,
  });
}

export function MapCanvas({
  activePath,
  centerControlLabel = "Center to me",
  children,
  className,
  futurePath,
  initialView = "markers",
  interactionLocked = false,
  markerStyle = "label",
  markers,
  path,
  camera,
  showNavigationControls = true,
  showCenterControl = false,
}: MapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const mapMarkersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const lastFitKeyRef = useRef<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || fallbackReason) {
      return;
    }

    let cleanedUp = false;
    let map: maplibregl.Map | null = null;
    let frame = 0;
    let resizeFrame = 0;
    const markerStore = mapMarkersRef.current;

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
          interactive: !interactionLocked,
          style: getMapStyle(),
          center:
            initialView === "greater-victoria"
              ? [-123.48, 48.49]
              : [-123.3656, 48.4284],
          zoom: initialView === "greater-victoria" ? 9.8 : 11.5,
        });
        mapRef.current = map;
        setMapLoaded(false);
        resizeFrame = window.requestAnimationFrame(() => {
          map?.resize();
        });
      } catch (error) {
        console.warn("MapCanvas fell back to the static preview.", error);
        setFallbackReason("Map preview unavailable");
        return;
      }

      if (showNavigationControls && !interactionLocked) {
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right"
        );
      }
      map.on("error", handleMapError);

      map.on("load", () => {
        const liveMap = map;

        if (!liveMap) {
          return;
        }

        liveMap.resize();
        setMapLoaded(true);
      });
    });

    return () => {
      cleanedUp = true;
      window.cancelAnimationFrame(frame);
      window.cancelAnimationFrame(resizeFrame);

      if (map) {
        map.remove();
      }

      markerStore.clear();
      mapRef.current = null;
      lastFitKeyRef.current = null;
      setMapLoaded(false);
    };
  }, [fallbackReason, initialView, interactionLocked, showNavigationControls]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapLoaded) {
      return;
    }

    const routeActivePath = activePath ?? path;
    const routeFuturePath = activePath ? futurePath : undefined;

    setRouteSourceData({
      data: createRouteData(routeFuturePath),
      layer: "mealflo-route-future-line",
      map,
      paint: {
        "line-color": "#73819b",
        "line-width": camera?.mode === "driver" ? 5 : 4,
        "line-opacity": camera?.mode === "driver" ? 0.38 : 0.44,
      },
      source: "mealflo-route-future",
    });

    setRouteSourceData({
      data: createRouteData(routeActivePath),
      layer: "mealflo-route-active-line",
      map,
      paint: {
        "line-color": "#3d5cf5",
        "line-width": camera?.mode === "driver" ? 7 : 5,
        "line-opacity": 0.84,
      },
      source: "mealflo-route-active",
    });

    const liveMarkerIds = new Set(markers.map((marker) => marker.id));

    for (const [id, marker] of mapMarkersRef.current) {
      if (!liveMarkerIds.has(id)) {
        marker.remove();
        mapMarkersRef.current.delete(id);
      }
    }

    for (const marker of markers) {
      const existing = mapMarkersRef.current.get(marker.id);

      if (existing) {
        existing.setLngLat([marker.longitude, marker.latitude]);
        continue;
      }

      const el = document.createElement("div");
      el.title = marker.label;
      el.setAttribute("aria-label", marker.label);

      if (markerStyle === "dot") {
        el.className =
          "flex h-4 w-4 items-center justify-center rounded-full border-[2px] border-white/95 shadow-sm";
        el.style.backgroundColor = toneColors[marker.tone];
        el.style.boxShadow = "0 2px 7px rgba(24, 24, 60, 0.24)";

        const innerDot = document.createElement("span");
        innerDot.style.width = "6px";
        innerDot.style.height = "6px";
        innerDot.style.borderRadius = "999px";
        innerDot.style.backgroundColor = "#1c1c2e";
        innerDot.style.opacity = "0.72";
        el.append(innerDot);
      } else if (markerStyle === "icon") {
        el.className =
          "flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-white/95 bg-white/90 shadow-[0_6px_16px_rgba(24,24,60,0.14)]";
        el.style.borderColor = toneBorders[marker.tone];

        const image = document.createElement("img");
        image.alt = "";
        image.src = markerIcons[marker.icon ?? "location-pin"].src;
        image.style.width = marker.icon === "delivery-van" ? "32px" : "27px";
        image.style.height = marker.icon === "delivery-van" ? "32px" : "27px";
        image.style.objectFit = "contain";
        el.append(image);
      } else {
        el.className =
          "flex min-h-11 items-center justify-center rounded-full border-[1.5px] border-white/90 px-3";
        el.style.backgroundColor = toneColors[marker.tone];
        el.style.borderColor = toneBorders[marker.tone];

        const label = document.createElement("span");
        label.textContent = getMarkerLabel(marker.label);
        label.style.fontFamily = "var(--mf-font-body)";
        label.style.fontSize = "11px";
        label.style.fontWeight = "700";
        label.style.letterSpacing = "0.02em";
        label.style.color = "#1c1c2e";
        el.append(label);
      }

      const createdMarker = new maplibregl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([marker.longitude, marker.latitude])
        .addTo(map);

      mapMarkersRef.current.set(marker.id, createdMarker);
    }

    const followMarker = camera?.followMarkerId
      ? markers.find((marker) => marker.id === camera.followMarkerId)
      : null;

    const cameraCenter = camera?.center
      ? ([camera.center.longitude, camera.center.latitude] as [number, number])
      : followMarker
        ? ([followMarker.longitude, followMarker.latitude] as [number, number])
        : null;

    if (camera?.mode === "driver" && cameraCenter) {
      map.easeTo({
        bearing: camera.bearing ?? map.getBearing(),
        center: cameraCenter,
        duration: camera.duration ?? 120,
        easing: easeCamera,
        pitch: camera.pitch ?? 48,
        zoom: camera.zoom ?? 16.35,
      });
      return;
    }

    if (initialView === "greater-victoria") {
      const fitKey = "greater-victoria";

      if (lastFitKeyRef.current === fitKey) {
        return;
      }

      map.fitBounds(
        [
          [GREATER_VICTORIA_BOUNDS.west, GREATER_VICTORIA_BOUNDS.south],
          [GREATER_VICTORIA_BOUNDS.east, GREATER_VICTORIA_BOUNDS.north],
        ],
        {
          maxZoom: 11.15,
          padding: 18,
        }
      );
      lastFitKeyRef.current = fitKey;
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    const pathPoints = [...(routeFuturePath ?? []), ...(routeActivePath ?? [])];
    const fitKey = JSON.stringify({
      markers: markers.map((marker) => [
        marker.id,
        Number(marker.longitude.toFixed(5)),
        Number(marker.latitude.toFixed(5)),
      ]),
      path: pathPoints.map(([longitude, latitude]) => [
        Number(longitude.toFixed(5)),
        Number(latitude.toFixed(5)),
      ]),
    });

    if (lastFitKeyRef.current === fitKey) {
      return;
    }

    markers.forEach((marker) => {
      bounds.extend([marker.longitude, marker.latitude]);
    });

    pathPoints.forEach(([longitude, latitude]) => {
      bounds.extend([longitude, latitude]);
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        maxZoom: camera?.mode === "fit" ? 14.25 : 13.8,
        padding: camera?.mode === "fit" ? 20 : 48,
      });
      lastFitKeyRef.current = fitKey;
    }
  }, [
    camera?.bearing,
    camera?.center,
    camera?.duration,
    camera?.followMarkerId,
    camera?.mode,
    camera?.pitch,
    camera?.zoom,
    activePath,
    futurePath,
    initialView,
    mapLoaded,
    markerStyle,
    markers,
    path,
  ]);

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
          className={cn(
            "absolute inset-0 h-full w-full",
            interactionLocked ? "pointer-events-none" : null
          )}
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
          className="text-ink hover:border-line-strong absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-[12px] border-[1.5px] border-[rgba(24,24,60,0.16)] bg-white shadow-sm transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 hover:bg-[rgba(255,255,255,0.92)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.55)]"
          onClick={centerMap}
        >
          <MealfloIcon name="location-pin" size={22} />
        </button>
      ) : null}
      {children}
    </div>
  );
}

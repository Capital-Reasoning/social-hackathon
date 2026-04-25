"use client";

import { useState } from "react";

import { AdminRouteActions } from "@/components/mealflo/admin-route-actions";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import type { DriverRouteOption } from "@/server/mealflo/backend";

const routeIdsShownUnassigned = new Set([
  "route-oak-bay-support",
  "route-peninsula-run",
]);

const routeDriverOptions = [
  "Unassigned",
  "Rosa Martinez",
  "Calvin Leung",
  "Amira Patel",
  "Owen Mercier",
  "Talia Brooks",
  "Leah Nordin",
] as const;

type RouteState = {
  activeStopIds: string[];
  driver: string;
};

type RouteStateById = Record<string, RouteState>;

function displayKitchenLabel(value: string) {
  return value
    .replace(/cold-chain/gi, "needs refrigeration")
    .replace(/Cold chain/g, "Needs refrigeration")
    .replace(/Fridge/g, "Needs refrigeration");
}

function formatAdminMinutes(value: number) {
  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

function initialRouteDriver(route: DriverRouteOption) {
  return routeIdsShownUnassigned.has(route.id)
    ? "Unassigned"
    : route.volunteer.name;
}

function initialRouteState(
  routes: readonly DriverRouteOption[]
): RouteStateById {
  return Object.fromEntries(
    routes.map((route) => [
      route.id,
      {
        activeStopIds: route.stops.map((stop) => stop.id),
        driver: initialRouteDriver(route),
      },
    ])
  );
}

function MiniRouteMap({
  activeStopIds,
  route,
}: {
  activeStopIds: readonly string[];
  route: DriverRouteOption;
}) {
  const activeStops = route.stops.filter((stop) =>
    activeStopIds.includes(stop.id)
  );
  const stopsForMap = activeStops.length > 0 ? activeStops : route.stops;
  const markers = [
    route.depot
      ? {
          id: `${route.id}-depot`,
          label: route.depot.name,
          latitude: route.depot.latitude,
          longitude: route.depot.longitude,
          tone: "primary" as const,
        }
      : null,
    ...stopsForMap.map((stop) => ({
      id: `${route.id}-${stop.id}`,
      label: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      tone: "info" as const,
    })),
  ].filter((marker) => marker !== null);
  const fallbackPath = [
    route.depot
      ? ([route.depot.longitude, route.depot.latitude] as const)
      : null,
    ...stopsForMap.map((stop) => [stop.longitude, stop.latitude] as const),
  ].filter((coordinate) => coordinate !== null);
  const path = route.routeLine.length > 1 ? route.routeLine : fallbackPath;

  return (
    <MapCanvas
      className="h-[132px] min-h-[132px] w-full min-w-[220px] rounded-[12px] sm:w-[280px] xl:w-[300px]"
      camera={{ mode: "fit" }}
      interactionLocked
      markerStyle="dot"
      markers={markers}
      path={path}
      showNavigationControls={false}
    />
  );
}

function routeRequirements(
  route: DriverRouteOption,
  activeStops: DriverRouteOption["stops"]
) {
  const stopWarnings = Array.from(
    new Set(activeStops.flatMap((stop) => stop.warnings))
  );
  const requirements = [
    route.vehicle.name,
    route.vehicle.refrigerated ? "Cooler vehicle" : null,
    route.vehicle.wheelchairLift ? "Lift vehicle" : null,
    stopWarnings.some((warning) => /two-person/i.test(warning))
      ? "Two-person stop"
      : null,
    stopWarnings.some((warning) => /door assist/i.test(warning))
      ? "Door assist"
      : null,
    stopWarnings.some((warning) => /fridge|refrigeration/i.test(warning))
      ? "Refrigerated meals"
      : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set(requirements)).slice(0, 5);
}

export function TodayRouteList({
  routes,
}: {
  routes: readonly DriverRouteOption[];
}) {
  const [routeStateById, setRouteStateById] = useState<RouteStateById>(() =>
    initialRouteState(routes)
  );
  const [openRouteIds, setOpenRouteIds] = useState<Set<string>>(
    () => new Set()
  );

  return (
    <div className="border-line overflow-hidden rounded-[16px] border-[1.5px] bg-white">
      {routes.map((route) => {
        const routeState =
          routeStateById[route.id] ?? initialRouteState([route])[route.id];
        const activeStops = route.stops.filter((stop) =>
          routeState.activeStopIds.includes(stop.id)
        );
        const stopMinutes = activeStops.length * 2;
        const totalMinutes = route.plannedDriveMinutes + stopMinutes;
        const requirements = routeRequirements(route, activeStops);
        const metaItems = [
          routeState.driver,
          route.area,
          `${activeStops.length} dropoffs`,
        ];
        const isOpen = openRouteIds.has(route.id);
        const detailsId = `${route.id}-details`;
        const toggleRoute = () => {
          setOpenRouteIds((current) => {
            const next = new Set(current);

            if (next.has(route.id)) {
              next.delete(route.id);
            } else {
              next.add(route.id);
            }

            return next;
          });
        };

        return (
          <div
            key={route.id}
            className="group/route border-line/70 border-b last:border-b-0"
          >
            <div className="grid gap-4 px-4 py-3 transition-[background-color] duration-[var(--mf-duration-micro)] ease-out group-hover/route:bg-[rgba(253,248,228,0.35)] sm:grid-cols-[300px_minmax(0,1fr)_auto] sm:items-center">
              <MiniRouteMap
                activeStopIds={routeState.activeStopIds}
                route={route}
              />
              <button
                type="button"
                aria-controls={detailsId}
                aria-expanded={isOpen}
                className="grid cursor-pointer gap-4 rounded-[12px] text-left transition-[background-color] duration-[var(--mf-duration-micro)] ease-out outline-none hover:bg-[rgba(253,248,228,0.55)] focus-visible:bg-[rgba(240,243,255,0.7)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgba(120,144,250,0.5)] sm:col-span-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                onClick={toggleRoute}
              >
                <div className="min-w-0 space-y-2">
                  <h3 className="font-display text-ink text-[23px] leading-tight font-semibold">
                    {route.name}
                  </h3>
                  <div className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-5">
                    {metaItems.map((item, itemIndex) => (
                      <span
                        key={`${route.id}-${item}`}
                        className="inline-flex items-center gap-2"
                      >
                        {itemIndex > 0 ? (
                          <span
                            aria-hidden="true"
                            className="bg-line-strong h-1.5 w-1.5 rounded-full"
                          />
                        ) : null}
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-1 text-left sm:min-w-[150px] sm:text-right">
                  <p className="font-display text-ink text-[28px] leading-none font-bold">
                    {formatAdminMinutes(totalMinutes)}
                  </p>
                  <p className="text-muted text-sm leading-5">
                    {route.driveTime} drive + {stopMinutes} min stops
                  </p>
                  <span className="text-info-text text-sm font-semibold">
                    View details
                  </span>
                </div>
              </button>
            </div>
            <div
              id={detailsId}
              aria-hidden={!isOpen}
              className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-[var(--mf-duration-base)] ease-out motion-reduce:transition-none ${
                isOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-line/70 grid gap-5 border-t bg-[rgba(253,248,228,0.42)] px-4 py-5 sm:grid-cols-[minmax(0,1fr)_260px] sm:px-5">
                  <div className="space-y-3">
                    <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
                      Food to load
                    </p>
                    <div className="border-line/70 overflow-hidden rounded-[12px] border-[1.5px] bg-white">
                      {activeStops.map((stop) => (
                        <div
                          key={stop.id}
                          className="border-line/70 grid gap-2 border-b px-3 py-2.5 last:border-b-0 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] sm:px-4"
                        >
                          <div className="min-w-0">
                            <p className="text-ink truncate text-sm font-semibold">
                              {stop.name}
                            </p>
                            <p className="text-muted truncate text-xs leading-5">
                              {stop.address}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-ink text-sm leading-5">
                              {displayKitchenLabel(stop.mealSummary)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <AdminRouteActions
                    activeStopIds={routeState.activeStopIds}
                    currentDriver={routeState.driver}
                    driverOptions={routeDriverOptions}
                    requirements={requirements}
                    routeName={route.name}
                    stops={route.stops.map((stop) => ({
                      id: stop.id,
                      label: stop.name,
                    }))}
                    warnings={route.warnings.map(displayKitchenLabel)}
                    onActiveStopIdsChange={(activeStopIds) =>
                      setRouteStateById((current) => ({
                        ...current,
                        [route.id]: {
                          ...(current[route.id] ?? routeState),
                          activeStopIds,
                        },
                      }))
                    }
                    onDriverChange={(driver) =>
                      setRouteStateById((current) => ({
                        ...current,
                        [route.id]: {
                          ...(current[route.id] ?? routeState),
                          driver,
                        },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

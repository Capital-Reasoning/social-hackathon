"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import { Button } from "@/components/mealflo/button";
import { Field, Select } from "@/components/mealflo/field";
import { MealfloIcon } from "@/components/mealflo/icon";
import { MapCanvas } from "@/components/mealflo/map-canvas";
import { ModalLayer } from "@/components/mealflo/modal-layer";
import { cn } from "@/lib/utils";
import type {
  PublicRoutePreview,
  PublicRoutePreviewPlan,
  UnroutedPublicTodaySummary,
} from "@/server/mealflo/backend";

type RouteGeneratorProps = {
  initialUnrouted: UnroutedPublicTodaySummary;
};

type RequestPayload = {
  data?: PublicRoutePreview;
  error?: string;
  ok?: boolean;
};

type CommitPayload = {
  data?: {
    routeCount: number;
    routeIds?: string[];
    routeNames: string[];
    stopCount: number;
    unroutedPublicToday?: UnroutedPublicTodaySummary;
  };
  error?: string;
  ok?: boolean;
};

type CommitSuccess = {
  assigned: boolean;
  routeCount: number;
  routeNames: string[];
  stopCount: number;
};

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatRouteMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${minutes} min`;
  }

  return remainder === 0 ? `${hours} hr` : `${hours} hr ${remainder} min`;
}

async function postJson<T>(path: string, payload: Record<string, unknown>) {
  const response = await fetch(path, {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const json = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    ok?: boolean;
  };

  if (!response.ok || json.ok === false) {
    throw new Error(json.error ?? "Route action failed.");
  }

  return json;
}

function stopMarkers(plan: PublicRoutePreviewPlan) {
  return [
    plan.depot
      ? {
          id: `${plan.id}-depot`,
          label: plan.depot.name,
          latitude: plan.depot.latitude,
          longitude: plan.depot.longitude,
          tone: "primary" as const,
        }
      : null,
    ...plan.stops.map((stop) => ({
      id: `${plan.id}-${stop.id}`,
      label: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      tone: "info" as const,
    })),
  ].filter((entry) => entry !== null);
}

function emptyUnroutedSummary(): UnroutedPublicTodaySummary {
  return {
    count: 0,
    mealCount: 0,
    stops: [],
  };
}

function compactDriverNote(note: string) {
  const parts = note.split(" · ");

  return parts[parts.length - 1] ?? note;
}

function PreviewMap({
  className,
  plan,
}: {
  className?: string;
  plan: PublicRoutePreviewPlan;
}) {
  const fallbackPath = [
    plan.depot ? ([plan.depot.longitude, plan.depot.latitude] as const) : null,
    ...plan.stops.map((stop) => [stop.longitude, stop.latitude] as const),
  ].filter((entry) => entry !== null);

  return (
    <MapCanvas
      className={cn(
        "h-[300px] min-h-[300px] w-full rounded-[14px] sm:h-[420px]",
        className
      )}
      camera={{ mode: "fit" }}
      interactionLocked
      markerStyle="dot"
      markers={stopMarkers(plan)}
      path={plan.routeLine.length > 1 ? plan.routeLine : fallbackPath}
      showNavigationControls={false}
    />
  );
}

function EmptyState() {
  return (
    <section className="border-line bg-surface-tint rounded-[16px] border-[1.5px] px-4 py-4 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <MealfloIcon name="checkmark-circle" size={42} />
          <div className="min-w-0">
            <h2 className="font-display text-ink text-[24px] leading-tight font-semibold">
              All new stops routed
            </h2>
            <p className="text-muted mt-1 text-sm leading-6">
              Public-form approvals for today are already assigned.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AdminUnroutedRouteGenerator({
  initialUnrouted,
}: RouteGeneratorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [isRefreshPending, startRouteRefresh] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [optimisticUnrouted, setOptimisticUnrouted] =
    useState<UnroutedPublicTodaySummary | null>(null);
  const [preview, setPreview] = useState<PublicRoutePreview | null>(null);
  const [commitSuccess, setCommitSuccess] = useState<CommitSuccess | null>(
    null
  );
  const [refreshState, setRefreshState] = useState<"idle" | "refreshing">(
    "idle"
  );
  const [activeRouteIndex, setActiveRouteIndex] = useState(0);
  const [assignments, setAssignments] = useState<Record<number, string>>({});
  const unrouted = optimisticUnrouted ?? initialUnrouted;
  const activePlan = preview?.plans[activeRouteIndex] ?? preview?.plans[0];
  const isRouteListUpdating = refreshState === "refreshing" && isRefreshPending;
  const driverPath = pathname.startsWith("/demo") ? "/demo/driver" : "/driver";
  const allRoutesAssigned = preview
    ? preview.plans.length > 0 &&
      preview.plans.every((plan) => Boolean(assignments[plan.index]))
    : false;
  const successTitle = commitSuccess?.assigned
    ? "Routes saved and assigned"
    : "Routes saved";

  const routeCountLabel = useMemo(() => {
    if (!preview) {
      return "";
    }

    if (preview.splitCount <= 1) {
      return "One route";
    }

    return `Split into ${preview.splitCount} routes to stay under 3 hours`;
  }, [preview]);

  const closeModal = useCallback(() => {
    if (isSaving || isLoadingPreview) {
      return;
    }

    setIsOpen(false);
    setError(null);

    if (commitSuccess) {
      setPreview(null);
      setCommitSuccess(null);
      setRefreshState("idle");
    }
  }, [commitSuccess, isLoadingPreview, isSaving]);

  const openDriverView = useCallback(() => {
    if (isSaving || isLoadingPreview) {
      return;
    }

    setIsOpen(false);
    setError(null);
    setPreview(null);
    setCommitSuccess(null);
    setRefreshState("idle");
    router.push(driverPath);
  }, [driverPath, isLoadingPreview, isSaving, router]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeModal, isOpen]);

  async function loadPreview() {
    setIsOpen(true);
    setIsLoadingPreview(true);
    setError(null);
    setOptimisticUnrouted(null);
    setCommitSuccess(null);
    setRefreshState("idle");

    try {
      const json = await postJson<RequestPayload>(
        "/api/routes/public-today/preview",
        {}
      );

      if (!json.data) {
        throw new Error("No route preview was returned.");
      }

      setPreview(json.data);
      setActiveRouteIndex(0);
      setAssignments(
        Object.fromEntries(json.data.plans.map((plan) => [plan.index, ""]))
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Route preview failed."
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }

  async function saveRoutes() {
    if (!preview || preview.plans.length === 0) {
      return;
    }

    if (!allRoutesAssigned) {
      setError("Choose a driver before assigning these routes.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const json = await postJson<CommitPayload>(
        "/api/routes/public-today/commit",
        {
          assignments: preview.plans.map((plan) => ({
            routeIndex: plan.index,
            volunteerId: assignments[plan.index],
          })),
          batchId: preview.batchId,
        }
      );

      if (!json.data) {
        throw new Error("Routes were not saved.");
      }

      setCommitSuccess({
        assigned: allRoutesAssigned,
        routeCount: json.data.routeCount,
        routeNames: json.data.routeNames,
        stopCount: json.data.stopCount,
      });
      setOptimisticUnrouted(
        json.data.unroutedPublicToday ?? emptyUnroutedSummary()
      );
      setIsOpen(true);
      setRefreshState("refreshing");
      startRouteRefresh(() => {
        router.refresh();
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Routes could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (unrouted.count === 0 && !isOpen) {
    return <EmptyState />;
  }

  return (
    <>
      <section className="border-line overflow-hidden rounded-[16px] border-[1.5px] bg-white">
        <div className="grid gap-5 bg-[var(--mf-color-yellow-100)] px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="flex min-w-0 items-start gap-4">
            <span className="border-line grid size-[64px] shrink-0 place-items-center rounded-[14px] border-[1.5px] bg-white">
              <MealfloIcon name="route-stops" size={44} />
            </span>
            <div className="min-w-0 space-y-1">
              <p className="text-muted text-sm font-semibold">
                Public-form dispatch queue
              </p>
              <p className="font-display text-ink text-[30px] leading-none font-bold">
                {`${countLabel(unrouted.count, "stop")} today haven't been routed.`}
              </p>
            </div>
          </div>
          <Button
            className="h-[58px] px-6 text-lg font-black [&>span]:font-black"
            disabled={isLoadingPreview}
            leading={<MealfloIcon name="route-road" size={30} />}
            size="lg"
            variant="primary"
            onClick={() => void loadPreview()}
          >
            {isLoadingPreview ? "Preparing" : "Generate route"}
          </Button>
        </div>
        {unrouted.stops.length > 0 ? (
          <div className="border-line/70 grid gap-2 border-t px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
            {unrouted.stops.map((stop) => (
              <div key={stop.id} className="min-w-0 py-1">
                <p className="text-ink truncate text-sm font-semibold">
                  {stop.clientName}
                </p>
                <p className="text-muted truncate text-xs leading-5">
                  {stop.mealCount} meals · {stop.address}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {isOpen ? (
        <ModalLayer
          aria-labelledby={
            commitSuccess
              ? "public-route-success-title"
              : "public-route-generator-title"
          }
          aria-modal="true"
          className="text-ink grid place-items-center bg-black/44 px-3 py-4 sm:px-5"
          role="dialog"
        >
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="border-line bg-bg max-h-[min(880px,94vh)] w-full max-w-[1180px] overflow-hidden rounded-[18px] border-[1.5px] shadow-[var(--mf-shadow-elevated)] outline-none"
          >
            <div className="border-line flex items-start justify-between gap-4 border-b bg-white px-4 py-4 sm:px-5">
              {commitSuccess ? (
                <span aria-hidden="true" />
              ) : (
                <div className="min-w-0">
                  <p className="text-muted text-sm font-semibold">
                    Public-form dispatch
                  </p>
                  <h2
                    id="public-route-generator-title"
                    className="font-display text-ink mt-1 text-[30px] leading-tight font-semibold"
                  >
                    Generate today&apos;s public routes
                  </h2>
                </div>
              )}
              <button
                type="button"
                aria-label="Close route generator"
                disabled={isSaving || isLoadingPreview}
                className="grid size-12 shrink-0 place-items-center rounded-[8px] border border-transparent bg-transparent transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 hover:bg-[rgba(253,248,228,0.82)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]"
                onClick={closeModal}
              >
                <MealfloIcon name="close-x" size={22} />
              </button>
            </div>

            <div className="max-h-[calc(min(880px,94vh)-86px)] overflow-y-auto">
              {commitSuccess ? (
                <div className="grid min-h-[460px] bg-[var(--mf-color-green-50)] lg:grid-cols-[minmax(0,1fr)_390px]">
                  <div className="flex min-w-0 items-center px-5 py-8 sm:px-8">
                    <div
                      role="status"
                      aria-live="polite"
                      className="max-w-[680px] space-y-5"
                    >
                      <span className="border-line grid size-[92px] place-items-center rounded-[22px] border-[1.5px] bg-white">
                        <MealfloIcon name="checkmark-circle" size={64} />
                      </span>
                      <div className="space-y-3">
                        <p
                          id="public-route-success-title"
                          className="font-display text-success-text text-[42px] leading-none font-bold"
                        >
                          {successTitle}
                        </p>
                        <p className="text-ink text-lg leading-7">
                          {countLabel(commitSuccess.stopCount, "stop")}{" "}
                          {commitSuccess.assigned ? "assigned" : "saved"} to{" "}
                          {countLabel(commitSuccess.routeCount, "route")}.
                          {isRouteListUpdating
                            ? " Today's routes are refreshing now."
                            : " Today's routes are updated."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-line bg-white px-4 py-5 sm:px-5 lg:border-l">
                    <div className="flex h-full flex-col gap-5">
                      {commitSuccess.routeNames.length > 0 ? (
                        <div className="border-line/70 border-y">
                          {commitSuccess.routeNames.map((routeName) => (
                            <div
                              key={routeName}
                              className="flex items-center gap-3 py-3"
                            >
                              <span className="border-line grid size-11 shrink-0 place-items-center rounded-[12px] border-[1.5px] bg-[var(--mf-color-yellow-100)]">
                                <MealfloIcon name="route-road" size={28} />
                              </span>
                              <p className="text-ink text-sm font-semibold">
                                {routeName}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="mt-auto">
                        <div className="grid gap-2">
                          <Button
                            fullWidth
                            type="button"
                            variant="primary"
                            leading={
                              <MealfloIcon name="route-stops" size={26} />
                            }
                            disabled={isRouteListUpdating}
                            onClick={closeModal}
                          >
                            {isRouteListUpdating
                              ? "Updating routes"
                              : "View updated routes"}
                          </Button>
                          <Button
                            fullWidth
                            type="button"
                            variant="secondary"
                            leading={
                              <MealfloIcon name="phone-handset" size={24} />
                            }
                            disabled={isRouteListUpdating}
                            onClick={openDriverView}
                          >
                            Open driver view
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isLoadingPreview ? (
                <div className="grid min-h-[440px] place-items-center px-5 py-10 text-center">
                  <div className="space-y-4">
                    <span className="border-line mx-auto grid size-[88px] place-items-center rounded-[18px] border-[1.5px] bg-white">
                      <span
                        aria-hidden="true"
                        className="grid size-12 animate-spin place-items-center rounded-full border-[3px] border-[rgba(32,56,192,0.18)] border-t-[var(--mf-color-info-text)] motion-reduce:animate-none"
                      >
                        <span className="grid size-8 place-items-center rounded-full bg-[var(--mf-color-blue-50)]">
                          <MealfloIcon name="route-road" size={24} />
                        </span>
                      </span>
                    </span>
                    <div className="space-y-1">
                      <p className="font-display text-ink text-[28px] font-semibold">
                        Generating route preview
                      </p>
                      <p className="text-muted text-sm leading-6">
                        Routing the map, stops, and timing.
                      </p>
                    </div>
                  </div>
                </div>
              ) : preview && activePlan ? (
                <div className="grid max-h-[calc(min(880px,94vh)-86px)] min-h-[620px] gap-0 overflow-hidden lg:grid-cols-[minmax(0,1.08fr)_390px]">
                  <div className="min-h-[360px] min-w-0 bg-white lg:min-h-0">
                    <PreviewMap
                      plan={activePlan}
                      className="h-[360px] min-h-[360px] rounded-none lg:h-full lg:min-h-full"
                    />
                  </div>
                  <div className="border-line bg-bg min-w-0 overflow-y-auto border-t lg:border-t-0 lg:border-l">
                    <div className="space-y-4 p-4 sm:p-5">
                      <div className="space-y-2">
                        <p className="text-info-text text-sm font-semibold">
                          {routeCountLabel}
                        </p>
                        <h3 className="font-display text-ink text-[26px] leading-tight font-semibold">
                          {activePlan.name}
                        </h3>
                        <p className="text-muted text-sm leading-6">
                          {activePlan.stopCount} stops ·{" "}
                          {activePlan.totalPlannedTime} total ·{" "}
                          {activePlan.driveTime} drive
                        </p>
                      </div>

                      {preview.plans.length > 1 ? (
                        <div
                          className="grid grid-cols-2 gap-2"
                          role="tablist"
                          aria-label="Generated routes"
                        >
                          {preview.plans.map((plan) => (
                            <button
                              key={plan.id}
                              type="button"
                              role="tab"
                              aria-selected={plan.index === activeRouteIndex}
                              className={`min-h-[50px] rounded-[10px] border-[1.5px] px-3 text-left text-sm font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)] ${
                                plan.index === activeRouteIndex
                                  ? "text-info-text border-[rgba(120,144,250,0.42)] bg-[var(--mf-color-blue-50)]"
                                  : "border-line text-ink bg-white"
                              }`}
                              onClick={() => setActiveRouteIndex(plan.index)}
                            >
                              <span className="block">
                                Route {plan.index + 1}
                              </span>
                              <span className="text-muted mt-1 block text-xs">
                                {countLabel(plan.stopCount, "stop")} ·{" "}
                                {formatRouteMinutes(plan.plannedTotalMinutes)}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <Field
                        label="Driver assignment"
                        htmlFor="public-route-driver"
                      >
                        <Select
                          id="public-route-driver"
                          value={assignments[activePlan.index] ?? ""}
                          onChange={(event) =>
                            setAssignments((current) => ({
                              ...current,
                              [activePlan.index]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Not assigned</option>
                          {preview.driverOptions.map((driver) => (
                            <option key={driver.id} value={driver.id}>
                              {driver.label} · {compactDriverNote(driver.note)}
                            </option>
                          ))}
                        </Select>
                      </Field>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          ["Stops", String(activePlan.stopCount)],
                          ["Total", activePlan.totalPlannedTime],
                          ["Drive", activePlan.driveTime],
                        ].map(([label, value]) => (
                          <div
                            key={label}
                            className="border-line rounded-[12px] border-[1.5px] bg-white px-3 py-3"
                          >
                            <p className="text-muted text-xs font-semibold">
                              {label}
                            </p>
                            <p className="font-display text-ink mt-1 text-[22px] leading-none font-bold">
                              {value}
                            </p>
                          </div>
                        ))}
                      </div>

                      {activePlan.warnings.length > 0 ? (
                        <div className="border-line rounded-[12px] border-[1.5px] bg-[var(--mf-color-amber-50)] p-3">
                          {activePlan.warnings.map((warning) => (
                            <p
                              key={warning}
                              className="text-warning-text text-sm leading-6"
                            >
                              {warning}
                            </p>
                          ))}
                        </div>
                      ) : null}

                      <div className="border-line max-h-[250px] overflow-y-auto rounded-[12px] border-[1.5px] bg-white">
                        {activePlan.stops.map((stop, index) => (
                          <div
                            key={stop.id}
                            className="border-line/70 grid gap-1 border-b px-3 py-2 last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-ink text-sm font-semibold leading-5">
                                {index + 1}. {stop.name}
                              </p>
                              <span className="text-muted shrink-0 text-xs font-semibold">
                                {stop.etaLabel}
                              </span>
                            </div>
                            <p className="text-muted truncate text-xs leading-5">
                              {stop.address}
                            </p>
                            <p className="text-ink truncate text-xs leading-5">
                              {stop.mealSummary}
                            </p>
                          </div>
                        ))}
                      </div>

                      {error ? (
                        <p className="text-error-text text-sm leading-6">
                          {error}
                        </p>
                      ) : null}

                      <div className="border-line/70 bg-bg/95 sticky bottom-0 -mx-4 -mb-4 flex flex-col gap-2 border-t p-4 backdrop-blur-sm sm:-mx-5 sm:-mb-5 sm:flex-row sm:p-5">
                        <Button
                          fullWidth
                          type="button"
                          variant="secondary"
                          onClick={() => void loadPreview()}
                          disabled={isSaving || isLoadingPreview}
                        >
                          Regenerate preview
                        </Button>
                        <Button
                          fullWidth
                          type="button"
                          variant="primary"
                          leading={
                            <MealfloIcon name="person-check" size={24} />
                          }
                          disabled={isSaving || !allRoutesAssigned}
                          onClick={() => void saveRoutes()}
                        >
                          {isSaving
                            ? "Saving"
                            : allRoutesAssigned
                              ? "Save and assign"
                              : "Choose driver"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-[360px] place-items-center px-5 py-10 text-center">
                  <div className="space-y-4">
                    <MealfloIcon name="checkmark-circle" size={64} />
                    <div className="space-y-1">
                      <p className="font-display text-ink text-[28px] font-semibold">
                        No new route needed
                      </p>
                      <p className="text-muted text-sm leading-6">
                        Today&apos;s public-form approvals are already assigned.
                      </p>
                    </div>
                    {error ? (
                      <p className="text-error-text text-sm leading-6">
                        {error}
                      </p>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ModalLayer>
      ) : null}
    </>
  );
}

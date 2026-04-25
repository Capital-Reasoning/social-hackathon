"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";
import { MealfloIcon } from "@/components/mealflo/icon";
import { ModalLayer } from "@/components/mealflo/modal-layer";
import { cn } from "@/lib/utils";

type RouteStopAction = {
  id: string;
  label: string;
};

type AdminRouteActionsProps = {
  activeStopIds: readonly string[];
  currentDriver: string;
  driverOptions: readonly string[];
  onActiveStopIdsChange: (activeStopIds: string[]) => void;
  onDriverChange: (driver: string) => void;
  requirements: readonly string[];
  routeName: string;
  stops: readonly RouteStopAction[];
  warnings: readonly string[];
};

type ActiveDialog = "assign" | "stops" | null;

const detailSectionHeadingClass =
  "font-display text-ink pb-1 text-[24px] leading-tight font-semibold tracking-[-0.01em]";

export function AdminRouteActions({
  activeStopIds,
  currentDriver,
  driverOptions,
  onActiveStopIdsChange,
  onDriverChange,
  requirements,
  routeName,
  stops,
  warnings,
}: AdminRouteActionsProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [pendingDriver, setPendingDriver] = useState(currentDriver);
  const [pendingStopIds, setPendingStopIds] = useState(() =>
    activeStopIds.map((stopId) => stopId)
  );
  const assignLabel = currentDriver === "Unassigned" ? "Assign" : "Reassign";
  const selectedStops = useMemo(
    () => stops.filter((stop) => activeStopIds.includes(stop.id)),
    [activeStopIds, stops]
  );

  useEffect(() => {
    if (!activeDialog) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDialog(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDialog]);

  const openAssignDialog = () => {
    setPendingDriver(currentDriver);
    setActiveDialog("assign");
  };

  const openStopsDialog = () => {
    setPendingStopIds(activeStopIds.map((stopId) => stopId));
    setActiveDialog("stops");
  };

  const togglePendingStop = (stopId: string) => {
    setPendingStopIds((current) => {
      if (current.includes(stopId)) {
        return current.length === 1
          ? current
          : current.filter((id) => id !== stopId);
      }

      return [...current, stopId];
    });
  };

  return (
    <div className="grid content-start gap-4">
      <div className="grid gap-2">
        <h4 className={detailSectionHeadingClass}>Actions</h4>
        <div className="grid gap-2">
          <Button
            fullWidth
            size="sm"
            variant="primary"
            leading={<MealfloIcon name="person-check" size={24} />}
            onClick={openAssignDialog}
          >
            {assignLabel}
          </Button>
          <Button
            fullWidth
            size="sm"
            variant="secondary"
            leading={<MealfloIcon name="route-stops" size={22} />}
            onClick={openStopsDialog}
          >
            Adjust stops
          </Button>
        </div>
      </div>

      <div className="grid gap-2">
        <h4 className={detailSectionHeadingClass}>Route details</h4>
        <div className="flex flex-wrap gap-1.5">
          {requirements.map((requirement) => (
            <Badge
              key={requirement}
              size="sm"
              tone={
                /cooler|lift|two-person|refrigerated/i.test(requirement)
                  ? "warning"
                  : "neutral"
              }
            >
              {requirement}
            </Badge>
          ))}
        </div>
      </div>

      <div className="text-muted grid gap-1 text-sm leading-5">
        <p>
          Driver:{" "}
          <span className="text-ink font-semibold">
            {currentDriver === "Unassigned"
              ? "Needs assignment"
              : currentDriver}
          </span>
        </p>
        <p>
          Stops:{" "}
          <span className="text-ink font-semibold">
            {selectedStops.length} active
          </span>
        </p>
        {warnings.length > 0 ? (
          <div className="border-line/70 mt-2 rounded-[12px] border-[1.5px] bg-white/70 px-3 py-2">
            <p className="text-muted text-xs font-semibold">Notes</p>
            <div className="mt-1 grid gap-1">
              {warnings.map((warning) => (
                <p key={warning} className="text-ink text-sm leading-5">
                  {warning}
                </p>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {activeDialog ? (
        <ModalLayer
          className="grid place-items-center bg-[rgba(24,24,46,0.44)] px-4 py-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveDialog(null);
            }
          }}
        >
          <div
            aria-modal="true"
            className="border-line bg-bg grid max-h-[calc(100vh-64px)] w-full max-w-[620px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[18px] border-[1.5px] shadow-[0_24px_80px_rgba(24,24,60,0.24)]"
            role="dialog"
          >
            <div className="border-line/70 flex items-start justify-between gap-3 border-b bg-white px-5 py-4">
              <div>
                <p className="font-display text-ink text-[24px] leading-tight font-semibold">
                  {activeDialog === "assign"
                    ? `Assign ${routeName}`
                    : `Adjust ${routeName}`}
                </p>
                <p className="text-muted mt-1 text-sm leading-5">
                  {activeDialog === "assign"
                    ? "Choose the driver shown on the route row."
                    : "Pick the stops included in this route preview."}
                </p>
              </div>
              <button
                aria-label="Close"
                className="border-line inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-white transition-[transform,background-color] duration-[var(--mf-duration-micro)] ease-out hover:-translate-y-0.5 hover:bg-[rgba(253,248,228,0.72)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]"
                type="button"
                onClick={() => setActiveDialog(null)}
              >
                <MealfloIcon name="close-x" size={22} />
              </button>
            </div>

            <div className="min-h-0 overflow-y-auto px-5 py-4">
              {activeDialog === "assign" ? (
                <div className="grid gap-2" role="radiogroup">
                  {driverOptions.map((option) => {
                    const selected = pendingDriver === option;

                    return (
                      <button
                        key={option}
                        aria-checked={selected}
                        role="radio"
                        className={cn(
                          "border-line hover:border-line-strong flex min-h-[58px] items-center gap-3 rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-left transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                          selected &&
                            "border-[rgba(120,144,250,0.5)] bg-[var(--mf-color-blue-50)]"
                        )}
                        type="button"
                        onClick={() => setPendingDriver(option)}
                      >
                        <span
                          aria-hidden="true"
                          className={cn(
                            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-[border-color,background-color] duration-[var(--mf-duration-base)] ease-out",
                            selected
                              ? "border-[var(--mf-color-blue-300)] bg-[var(--mf-color-blue-300)]"
                              : "border-[rgba(24,24,60,0.24)] bg-white"
                          )}
                        >
                          {selected ? (
                            <span className="block h-2 w-2 rounded-full bg-white" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-ink block font-semibold">
                            {option}
                          </span>
                          {option === "Unassigned" ? (
                            <span className="text-muted text-sm">
                              Leave this route open for a volunteer.
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="grid gap-2">
                  {stops.map((stop, index) => {
                    const selected = pendingStopIds.includes(stop.id);

                    return (
                      <button
                        key={stop.id}
                        aria-pressed={selected}
                        className={cn(
                          "border-line hover:border-line-strong flex min-h-[58px] items-center gap-3 rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-left transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                          selected
                            ? "border-[rgba(120,144,250,0.45)] bg-[var(--mf-color-blue-50)]"
                            : "opacity-90"
                        )}
                        type="button"
                        onClick={() => togglePendingStop(stop.id)}
                      >
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-[background-color,color] duration-[var(--mf-duration-base)] ease-out",
                            selected
                              ? "bg-primary text-ink"
                              : "border-line border-[1.5px] bg-white text-muted"
                          )}
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-ink block truncate font-semibold">
                            {stop.label}
                          </span>
                          <span className="text-muted text-sm">
                            {selected ? "Included in route" : "Skipped"}
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={cn(
                            "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-[1.5px] transition-[background-color,border-color] duration-[var(--mf-duration-base)] ease-out",
                            selected
                              ? "border-[var(--mf-color-blue-300)] bg-[var(--mf-color-blue-300)]"
                              : "border-line bg-white"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white shadow-[0_2px_4px_rgba(24,24,60,0.18)] transition-transform duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]",
                              selected ? "translate-x-[22px]" : "translate-x-0.5"
                            )}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-line/70 flex flex-wrap justify-end gap-2 border-t bg-white px-5 py-4">
              <Button variant="quiet" onClick={() => setActiveDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                leading={
                  <MealfloIcon
                    name={
                      activeDialog === "assign" ? "person-check" : "route-stops"
                    }
                    size={22}
                  />
                }
                onClick={() => {
                  if (activeDialog === "assign") {
                    onDriverChange(pendingDriver);
                  } else {
                    onActiveStopIdsChange(pendingStopIds);
                  }
                  setActiveDialog(null);
                }}
              >
                {activeDialog === "assign"
                  ? "Update assignment"
                  : "Update stops"}
              </Button>
            </div>
          </div>
        </ModalLayer>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";
import { ChoiceChip } from "@/components/mealflo/field";
import { MealfloIcon } from "@/components/mealflo/icon";
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
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="primary"
          leading={<MealfloIcon name="person-check" size={24} />}
          onClick={openAssignDialog}
        >
          {assignLabel}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          leading={<MealfloIcon name="route-stops" size={22} />}
          onClick={openStopsDialog}
        >
          Adjust stops
        </Button>
      </div>

      <div className="grid gap-2">
        <p className="text-muted text-xs font-semibold tracking-[0.08em] uppercase">
          Route details
        </p>
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
          {warnings.map((warning) => (
            <Badge key={warning} size="sm" tone="warning">
              {warning}
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
      </div>

      {activeDialog ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-[rgba(24,24,46,0.44)] px-4 py-6"
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
                <div className="grid gap-3">
                  {driverOptions.map((option) => (
                    <button
                      key={option}
                      className={cn(
                        "border-line hover:border-line-strong flex min-h-[58px] items-center justify-between gap-3 rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-left transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                        pendingDriver === option &&
                          "border-[rgba(120,144,250,0.5)] bg-[var(--mf-color-blue-50)]"
                      )}
                      type="button"
                      onClick={() => setPendingDriver(option)}
                    >
                      <span>
                        <span className="text-ink block font-semibold">
                          {option}
                        </span>
                        <span className="text-muted text-sm">
                          {option === "Unassigned"
                            ? "Leave this route open for a volunteer."
                            : "Show this driver on the route."}
                        </span>
                      </span>
                      <ChoiceChip selected={pendingDriver === option}>
                        {pendingDriver === option ? "Selected" : "Choose"}
                      </ChoiceChip>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="grid gap-2">
                  {stops.map((stop, index) => {
                    const selected = pendingStopIds.includes(stop.id);

                    return (
                      <button
                        key={stop.id}
                        className={cn(
                          "border-line hover:border-line-strong flex min-h-[58px] items-center gap-3 rounded-[14px] border-[1.5px] bg-white px-4 py-3 text-left transition-[transform,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                          selected &&
                            "border-[rgba(120,144,250,0.45)] bg-[var(--mf-color-blue-50)]"
                        )}
                        type="button"
                        onClick={() => togglePendingStop(stop.id)}
                      >
                        <span className="bg-primary text-ink inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="text-ink block truncate font-semibold">
                            {stop.label}
                          </span>
                          <span className="text-muted text-sm">
                            {selected ? "Included" : "Removed from preview"}
                          </span>
                        </span>
                        <ChoiceChip selected={selected}>
                          {selected ? "Included" : "Add back"}
                        </ChoiceChip>
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
        </div>
      ) : null}
    </div>
  );
}

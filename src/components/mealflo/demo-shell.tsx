"use client";

import { Suspense, type ComponentProps } from "react";
import { useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { MealfloIcon, type IconName } from "@/components/mealflo/icon";
import { PersonaLabel } from "@/components/mealflo/persona-label";
import {
  demoDriverControlEvent,
  demoInboundPayloads,
  roleDefinitions,
  type DemoDriverControlAction,
  type DemoRole,
} from "@/lib/demo";
import { cn } from "@/lib/utils";

type DemoShellProps = {
  activeRole: DemoRole;
  children: React.ReactNode;
  phoneViewport?: boolean;
};

const controlButtons = [
  {
    id: "new-request",
    action: "request",
    icon: "grocery-bag",
    label: "Add request",
    message: "Mina's request is waiting in inbox review.",
    roles: ["admin"] as DemoRole[],
  },
  {
    id: "new-volunteer",
    action: "volunteer",
    icon: "person-plus",
    label: "Add volunteer",
    message: "Theo's volunteer offer is waiting in inbox review.",
    roles: ["admin"] as DemoRole[],
  },
  {
    id: "stop",
    action: "advance-stop",
    icon: "route-stops",
    label: "Simulate next stop",
    message: "The phone advanced to the next stop.",
    roles: ["driver"] as DemoRole[],
  },
  {
    id: "driver",
    action: "switch-driver",
    icon: "delivery-van",
    label: "Switch driver",
    message: "Driver persona rotated.",
    roles: ["driver"] as DemoRole[],
  },
  {
    id: "gps",
    action: "toggle-location",
    icon: "location-pin",
    label: "Toggle GPS",
    message: "Location mode changed.",
    roles: ["driver"] as DemoRole[],
  },
  {
    id: "route-reset",
    action: "reset-route",
    icon: "repeat-arrows",
    label: "Reset route",
    message: "The active route is reset for another pass.",
    roles: ["driver"] as DemoRole[],
  },
  {
    id: "demo-reset",
    action: "reset-demo",
    icon: "settings-gear",
    label: "Reset demo",
    message: "Seed data restored.",
    roles: ["admin", "public", "driver"] as DemoRole[],
  },
] as const;

type DemoControl = (typeof controlButtons)[number];

type DemoControlResponse = {
  error?: string;
  ok?: boolean;
};

const driverControlHints: Record<string, string> = {
  driver: "Rotate the phone to another driver",
  "demo-reset": "Restore seed data across the app",
  gps: "Switch between phone GPS and fake movement",
  "route-reset": "Clear this route for another run",
  stop: "Mark the current stop handled",
};

function DriverControlPanel({
  activeControlId,
  controls,
  pendingControlId,
  message,
  onControl,
}: {
  activeControlId: string | null;
  controls: readonly DemoControl[];
  pendingControlId: string | null;
  message: string;
  onControl: (control: DemoControl) => void;
}) {
  return (
    <div className="grid w-full max-w-[460px] gap-3">
      {controls.map((control) => {
        const active = activeControlId === control.id;

        return (
          <button
            key={control.id}
            type="button"
            disabled={pendingControlId === control.id}
            className={cn(
              "grid min-h-[76px] grid-cols-[54px_1fr] items-center gap-4 rounded-[10px] border px-4 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60",
              active
                ? "border-[#ffe47a]/70 bg-[#ffe47a]/18 shadow-[0_0_0_1px_rgba(255,228,122,0.18),0_18px_36px_rgba(0,0,0,0.24)]"
                : "border-white/14 bg-white/10 shadow-[0_14px_28px_rgba(0,0,0,0.18)] hover:-translate-y-0.5 hover:border-white/24 hover:bg-white/15",
              pendingControlId === control.id && "cursor-wait opacity-70"
            )}
            onClick={() => onControl(control)}
          >
            <span className="grid size-[54px] place-items-center rounded-[9px] border border-white/14 bg-white/12">
              <MealfloIcon name={control.icon as IconName} size={32} />
            </span>
            <span className="min-w-0">
              <span className="block text-[1.18rem] leading-tight font-semibold text-white">
                {control.label}
              </span>
              <span className="mt-1 block text-sm leading-snug text-white/64">
                {driverControlHints[control.id]}
              </span>
            </span>
          </button>
        );
      })}
      <div
        aria-live="polite"
        className={cn(
          "min-h-[76px] rounded-[10px] border px-4 py-3 text-sm leading-snug font-medium transition-[opacity,background-color,border-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-standard)]",
          message === "Shell ready."
            ? "border-white/8 bg-white/5 text-white/45"
            : "border-[#88d5bd]/35 bg-[#88d5bd]/12 text-white/82"
        )}
      >
        {message === "Shell ready." ? "Choose a driver action." : message}
      </div>
    </div>
  );
}

async function postDemoControl(path: string, body?: unknown) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(path, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers:
        body === undefined ? undefined : { "Content-Type": "application/json" },
      method: "POST",
      signal: controller.signal,
    });
    const payload = (await response
      .json()
      .catch(() => ({}))) as DemoControlResponse;

    if (!response.ok || payload.ok === false) {
      throw new Error(payload.error ?? "Demo control failed.");
    }

    return payload;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Demo control timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function DemoShell({
  activeRole,
  children,
  phoneViewport = false,
}: DemoShellProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Shell ready.");
  const [activeControlId, setActiveControlId] = useState<string | null>(null);
  const [pendingControlId, setPendingControlId] = useState<string | null>(null);
  const visibleControls = controlButtons.filter((control) =>
    control.roles.includes(activeRole)
  );

  const clearDriverProgress = () => {
    for (const key of Object.keys(window.localStorage)) {
      if (
        key.startsWith("mealflo-driver-progress:") ||
        key === "mealflo-device-fingerprint"
      ) {
        window.localStorage.removeItem(key);
      }
    }
  };

  const dispatchDriverControl = (action: DemoDriverControlAction) => {
    window.dispatchEvent(
      new CustomEvent(demoDriverControlEvent, {
        detail: { action },
      })
    );
  };

  const runControl = async (control: DemoControl) => {
    setActiveControlId(control.id);
    setPendingControlId(control.id);
    setMessage("Working.");

    try {
      if (control.action === "request") {
        await postDemoControl("/api/intake/request", demoInboundPayloads.request);
        setMessage(control.message);
        router.push("/demo/admin?view=inbox");
        router.refresh();
        return;
      }

      if (control.action === "volunteer") {
        await postDemoControl(
          "/api/intake/volunteer",
          demoInboundPayloads.volunteer
        );
        setMessage(control.message);
        router.push("/demo/admin?view=inbox");
        router.refresh();
        return;
      }

      if (control.action === "reset-demo") {
        await postDemoControl("/api/demo/reset");
        clearDriverProgress();
        setMessage(control.message);
        router.refresh();
        return;
      }

      dispatchDriverControl(control.action);
      setMessage(control.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Control failed.");
    } finally {
      setPendingControlId(null);
    }
  };

  const controls = visibleControls.length > 0 && (
    <div
      className={cn(
        "flex gap-2",
        phoneViewport ? "flex-col items-stretch" : "flex-wrap items-center"
      )}
    >
      {visibleControls.map((control) => (
        <button
          key={control.id}
          type="button"
          disabled={pendingControlId === control.id}
          className={cn(
            "inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/12 bg-white/10 px-3 py-1 text-[0.84rem] font-medium text-white transition-[transform,background-color,border-color,opacity] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 hover:bg-white/16 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
            pendingControlId === control.id && "cursor-wait opacity-70"
          )}
          onClick={() => void runControl(control)}
        >
          <MealfloIcon name={control.icon as IconName} size={16} />
          {control.label}
        </button>
      ))}
      {message !== "Shell ready." ? (
        <span
          aria-live="polite"
          className="max-w-[24rem] truncate rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-xs font-medium text-white/72"
        >
          {message}
        </span>
      ) : null}
    </div>
  );

  const driverControls = visibleControls.length > 0 && (
    <DriverControlPanel
      activeControlId={activeControlId}
      controls={visibleControls}
      pendingControlId={pendingControlId}
      message={message}
      onControl={(control) => {
        void runControl(control);
      }}
    />
  );

  return (
    <div className="h-screen overflow-hidden bg-[#121724] text-white">
      <div className="mx-auto flex h-screen w-full max-w-[1900px] flex-col gap-2 px-2 py-2">
        <header className="px-1 py-1">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <nav className="flex flex-wrap gap-2.5" aria-label="Demo role">
                {(Object.keys(roleDefinitions) as DemoRole[]).map((role) => {
                  const definition = roleDefinitions[role];

                  return (
                    <Link
                      key={role}
                      href={
                        definition.demoPath as ComponentProps<
                          typeof Link
                        >["href"]
                      }
                      style={{
                        color:
                          role === activeRole
                            ? "var(--mf-color-ink)"
                            : "rgba(255,255,255,0.92)",
                      }}
                      className={cn(
                        "inline-flex min-h-[42px] items-center rounded-[8px] border px-4 py-2 text-base font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5",
                        role === activeRole
                          ? "border-white bg-white shadow-sm"
                          : "border-white/12 bg-white/8 hover:bg-white/14"
                      )}
                    >
                      {definition.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="inline-flex min-h-[42px] items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 text-sm font-medium text-white/82">
                <MealfloIcon name="user-profile" size={22} />
                <Suspense fallback="Persona">
                  <PersonaLabel role={activeRole} />
                </Suspense>
              </div>
            </div>
            {!phoneViewport ? controls : null}
          </div>
        </header>

        <div className="grid min-h-0 flex-1">
          <section
            className={cn(
              "min-h-0 overflow-hidden border border-white/10",
              phoneViewport
                ? "grid rounded-[14px] bg-[#121724] p-0 sm:p-3 lg:grid-cols-[minmax(260px,1fr)_minmax(360px,1fr)] lg:p-6"
                : "rounded-[14px] bg-[#121724] p-1"
            )}
          >
            {phoneViewport ? (
              <>
                <aside
                  aria-label="Driver demo controls"
                  className="hidden min-h-0 flex-col justify-center pr-8 lg:flex"
                >
                  {driverControls}
                </aside>
                <div className="flex min-h-0 items-center justify-center lg:justify-center">
                  <div className="relative h-full w-full max-w-[430px] lg:aspect-[2752/4195] lg:w-auto lg:max-w-[min(45vw,590px)] lg:max-h-[calc(100vh-104px)]">
                    <Image
                      src="/iphone-frame-modern.png"
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="(min-width: 1024px) 45vw, 88vw"
                      priority
                      className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full object-contain select-none lg:block"
                    />
                    <div className="bg-bg relative z-10 h-full overflow-hidden rounded-[12px] lg:absolute lg:top-[6.15%] lg:right-[17.8%] lg:bottom-[4.9%] lg:left-[17.8%] lg:h-auto lg:rounded-[46px]">
                      {children}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-bg h-full overflow-y-auto rounded-[10px]">
                {children}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

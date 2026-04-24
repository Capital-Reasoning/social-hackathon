import type { ComponentProps } from "react";

import { IconSwatch, type IconName } from "@/components/mealflo/icon";
import { PageFrame } from "@/components/mealflo/layout";
import {
  PublicRequestForm,
  PublicVolunteerForm,
} from "@/components/mealflo/public-intake-forms";
import { cn } from "@/lib/utils";

import Link from "next/link";

type PublicNavKey = "home" | "request" | "volunteer";

function ActionPanel({
  ctaHref,
  ctaLabel,
  icon,
  note,
  title,
  tone = "primary",
}: {
  ctaHref: string;
  ctaLabel: string;
  icon: IconName;
  note: string;
  title: string;
  tone?: "primary" | "warm";
}) {
  return (
    <Link
      href={ctaHref as ComponentProps<typeof Link>["href"]}
      className="mf-enter mf-sheen border-line hover:border-line-strong flex min-h-[380px] flex-col gap-8 rounded-[18px] border-[1.5px] bg-white p-6 transition-[transform,border-color,background-color] duration-[var(--mf-duration-slow)] ease-[var(--mf-ease-spring)] hover:-translate-y-1 md:p-8"
    >
      <IconSwatch name={icon} size={118} swatchSize={132} tone="warm" />
      <div className="space-y-2">
        <h2 className="font-display text-ink text-[clamp(2.3rem,4vw,3.8rem)] leading-[0.96] font-semibold tracking-[-0.03em]">
          {title}
        </h2>
        <p className="text-muted max-w-[28rem] text-lg leading-8">{note}</p>
      </div>
      <div className="mt-auto">
        <span
          className={cn(
            "inline-flex min-h-[52px] w-full items-center justify-center rounded-full border-[1.5px] px-4 py-2 text-base font-medium transition-[background-color,border-color,color,opacity] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)]",
            tone === "primary"
              ? "border-action bg-action text-[var(--mf-color-on-action)]"
              : "bg-primary text-ink border-[rgba(170,120,0,0.35)]"
          )}
          style={
            tone === "primary"
              ? { color: "var(--mf-color-on-action)" }
              : undefined
          }
        >
          {ctaLabel}
        </span>
      </div>
    </Link>
  );
}

export function PublicFrame({
  active,
  children,
  demoMode,
}: {
  active: PublicNavKey;
  children: React.ReactNode;
  demoMode?: boolean;
}) {
  const isFormView = active !== "home";

  return (
    <div
      className={cn(
        "bg-bg flex",
        demoMode ? "h-full min-h-0 overflow-y-auto" : "min-h-screen"
      )}
    >
      <PageFrame
        className={cn(
          "flex flex-1",
          demoMode && "min-h-0",
          isFormView && "py-3 sm:py-4"
        )}
      >
        {children}
      </PageFrame>
    </div>
  );
}

export function PublicLandingView() {
  return (
    <div className="w-full space-y-6">
      <section className="mf-enter rounded-[24px] bg-[linear-gradient(180deg,rgba(250,226,120,0.24)_0%,rgba(255,255,255,0)_86%)] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.72fr)_minmax(720px,1.28fr)] xl:items-center">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <h1 className="font-display text-ink max-w-[12ch] text-[clamp(2.7rem,6vw,5rem)] font-bold tracking-[-0.04em]">
                  Welcome to mealflo.
                </h1>
                <p className="text-muted max-w-[42rem] text-lg leading-8">
                  Ask for food delivery for yourself or someone nearby, or sign
                  up to help bring meals to neighbors who need them.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ActionPanel
              ctaHref="/demo/public?view=request"
              ctaLabel="Request food"
              icon="meal-container"
              note="Tell us where support is needed and what kind of meals would help."
              title="Get food support"
            />
            <ActionPanel
              ctaHref="/demo/public?view=volunteer"
              ctaLabel="Volunteer"
              icon="heart"
              note="Share when you are available and where you can start. We will match you with a route that fits."
              title="Help deliver"
              tone="warm"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

export function PublicRequestView() {
  return (
    <section className="mf-enter space-y-6 rounded-[20px] bg-[linear-gradient(180deg,rgba(250,226,120,0.18)_0%,rgba(255,255,255,0)_80%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-[760px] space-y-3">
        <h1 className="font-display text-ink text-[clamp(2.8rem,6vw,5rem)] leading-[0.96] font-bold tracking-[-0.04em]">
          Request food
        </h1>
        <p className="text-muted text-lg leading-8">
          Tell us where to bring food and how many meals would help. We will
          follow up if anything is unclear.
        </p>
      </div>
      <div className="max-w-[980px]">
        <PublicRequestForm />
      </div>
    </section>
  );
}

export function PublicVolunteerView() {
  return (
    <section className="mf-enter space-y-6 rounded-[20px] bg-[linear-gradient(180deg,rgba(250,226,120,0.18)_0%,rgba(255,255,255,0)_80%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-[760px] space-y-3">
        <h1 className="font-display text-ink text-[clamp(2.8rem,6vw,5rem)] leading-[0.96] font-bold tracking-[-0.04em]">
          Offer delivery time
        </h1>
        <p className="text-muted text-lg leading-8">
          Tell the team when you are free, where you start, and what kind of
          route would fit.
        </p>
      </div>
      <div className="max-w-[980px]">
        <PublicVolunteerForm />
      </div>
    </section>
  );
}

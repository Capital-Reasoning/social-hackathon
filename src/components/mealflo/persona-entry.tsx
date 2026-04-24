"use client";

import type { ComponentProps } from "react";

import Link from "next/link";

import { MealfloIcon, type IconName } from "@/components/mealflo/icon";
import { MealfloLogo } from "@/components/mealflo/logo";
import { roleDefinitions, type DemoRole } from "@/lib/demo";
import { cn } from "@/lib/utils";

type IntegrationStatus = {
  id: string;
  label: string;
  ready: boolean;
};

type PersonaEntryProps = {
  integrations: readonly IntegrationStatus[];
};

function RoleLink({
  icon,
  label,
  note,
  href,
  className,
}: {
  className?: string;
  href: string;
  icon: IconName;
  label: string;
  note: string;
}) {
  return (
    <Link
      href={href as ComponentProps<typeof Link>["href"]}
      className={cn(
        "mf-sheen border-line hover:border-line-strong grid min-h-[210px] gap-5 rounded-[20px] border-[1.5px] bg-white p-5 text-left transition-[transform,border-color,background-color] duration-[var(--mf-duration-slow)] ease-[var(--mf-ease-spring)] hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[rgba(120,144,250,0.55)]",
        className
      )}
    >
      <MealfloIcon name={icon} size={70} />
      <div className="space-y-2">
        <h2 className="font-display text-ink text-[34px] font-semibold tracking-[-0.03em]">
          {label}
        </h2>
        <p className="text-muted max-w-[18rem] text-base leading-7">{note}</p>
      </div>
    </Link>
  );
}

export function PersonaEntry({ integrations }: PersonaEntryProps) {
  return (
    <main
      id="main-content"
      className="bg-bg min-h-screen px-3 py-4 sm:px-4 lg:px-5"
    >
      <div className="border-line relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-[1760px] flex-col gap-8 rounded-[24px] border-[1.5px] bg-[linear-gradient(180deg,rgba(250,226,120,0.24)_0%,rgba(255,255,255,0)_74%)] p-5 sm:p-7 lg:p-9">
        <span className="border-line text-muted absolute top-5 left-5 rounded-full border-[1.5px] bg-white/70 px-3 py-1 text-sm font-semibold sm:top-7 sm:left-7 lg:top-9 lg:left-9">
          demo
        </span>
        <section className="grid flex-1 content-center items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(480px,0.82fr)]">
          <div className="flex h-full items-center justify-start pt-10 sm:pt-12 lg:pt-0">
            <MealfloLogo
              iconSize={136}
              iconClassName="!size-[92px] sm:!size-[136px]"
              className="max-w-full flex-col items-start gap-0 text-left sm:gap-1"
              showSubtitle={false}
              swatchClassName="!size-[92px] sm:!size-[136px]"
              swatchSize={136}
              textClassName="text-[2.35rem] leading-[0.86] sm:text-[clamp(3.9rem,7.7vw,7.85rem)]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {(Object.keys(roleDefinitions) as DemoRole[]).map((role) => {
              const roleDefinition = roleDefinitions[role];

              return (
                <RoleLink
                  key={role}
                  href={roleDefinition.demoPath}
                  icon={roleDefinition.icon as IconName}
                  label={roleDefinition.label}
                  note={roleDefinition.note}
                  className={
                    role === "admin" ? "bg-[rgba(240,243,255,0.84)]" : undefined
                  }
                />
              );
            })}
          </div>
        </section>

        <section
          aria-labelledby="environment-status"
          className="border-line border-t-[1.5px] pt-2"
        >
          <div className="flex flex-col gap-2 text-xs lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <h2
                id="environment-status"
                className="text-muted text-sm font-medium"
              >
                Environment
              </h2>
              <p className="text-muted/80 text-xs leading-5">
                Live demo connections
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {integrations.map((integration) => (
                <span
                  key={integration.id}
                  className="border-line inline-flex min-h-7 items-center gap-1.5 rounded-full border-[1.5px] bg-white/55 px-2 py-1"
                >
                  <span className="text-muted text-xs font-medium">
                    {integration.label}
                  </span>
                  <MealfloIcon
                    name={
                      integration.ready ? "checkmark-circle" : "warning-alert"
                    }
                    label={`${integration.label} ${
                      integration.ready ? "ready" : "needs attention"
                    }`}
                    decorative={false}
                    size={16}
                  />
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

import type { ComponentProps, ReactNode } from "react";

import Link from "next/link";

import { Badge } from "@/components/mealflo/badge";
import { MealfloIcon, type IconName } from "@/components/mealflo/icon";
import { MealfloLogo } from "@/components/mealflo/logo";
import { cn } from "@/lib/utils";

type NavItem = {
  href: ComponentProps<typeof Link>["href"] | string;
  icon: IconName;
  key: string;
  label: string;
};

type TopBarProps = {
  actions?: ReactNode;
  activeKey: string;
  maxWidthClassName?: string;
  nav: readonly NavItem[];
};

function NavLink({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: ComponentProps<typeof Link>["href"] | string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      href={href as ComponentProps<typeof Link>["href"]}
      aria-current={active ? "page" : undefined}
      style={{ color: "var(--mf-color-ink)" }}
      className={cn(
        "inline-flex min-h-[52px] items-center gap-2.5 rounded-full border-[1.5px] px-5 py-2 text-lg font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5",
        active
          ? "border-[rgba(170,120,0,0.4)] bg-white"
          : "border-transparent bg-transparent hover:border-[rgba(170,120,0,0.2)] hover:bg-[rgba(255,255,255,0.56)]"
      )}
    >
      <MealfloIcon name={icon} size={32} />
      <span className="text-[var(--mf-color-ink)]">{label}</span>
    </Link>
  );
}

export function TopBar({
  actions,
  activeKey,
  maxWidthClassName = "max-w-[1760px]",
  nav,
}: TopBarProps) {
  return (
    <header className="bg-primary sticky top-0 z-30 border-b-[1.5px] border-[rgba(170,120,0,0.35)]">
      <div
        className={cn(
          "mx-auto grid min-h-[76px] gap-3 px-4 py-0 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center lg:px-7",
          maxWidthClassName
        )}
      >
        <MealfloLogo
          className="shrink-0 gap-1.5"
          iconSize={58}
          showSubtitle={false}
          swatchSize={76}
          textClassName="text-[2rem] leading-none"
        />
        <nav
          aria-label="Primary"
          className="flex flex-wrap items-center justify-start gap-2 lg:justify-start"
        >
          {nav.map((item) => (
            <NavLink
              key={item.key}
              active={item.key === activeKey}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))}
        </nav>
        {actions ? (
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

type PageFrameProps = {
  children: ReactNode;
  className?: string;
  maxWidthClassName?: string;
};

export function PageFrame({
  children,
  className,
  maxWidthClassName = "max-w-[1760px]",
}: PageFrameProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "mx-auto flex w-full flex-col gap-5 px-3 py-5 sm:px-4 lg:px-5",
        maxWidthClassName,
        className
      )}
    >
      {children}
    </main>
  );
}

type PageHeaderProps = {
  actions?: ReactNode;
  className?: string;
  note?: string;
  title: ReactNode;
};

export function PageHeader({
  actions,
  className,
  note,
  title,
}: PageHeaderProps) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <div className="space-y-2">
          <h1 className="font-display text-ink text-[clamp(2.4rem,4vw,4.6rem)] font-bold tracking-[-0.03em]">
            {title}
          </h1>
          {note ? (
            <p className="text-muted max-w-3xl text-base leading-7">{note}</p>
          ) : null}
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </section>
  );
}

type MetricTileProps = {
  className?: string;
  icon: IconName;
  label: string;
  note?: string;
  tone?: "neutral" | "info" | "success" | "warning" | "warm";
  value: ReactNode;
};

const metricToneClasses: Record<
  NonNullable<MetricTileProps["tone"]>,
  string
> = {
  info: "bg-[rgba(240,243,255,0.72)]",
  neutral: "bg-white",
  success: "bg-[rgba(237,250,243,0.72)]",
  warning: "bg-[rgba(255,248,235,0.8)]",
  warm: "bg-[rgba(250,226,120,0.18)]",
};

export function MetricTile({
  className,
  icon,
  label,
  note,
  tone = "neutral",
  value,
}: MetricTileProps) {
  return (
    <div
      className={cn(
        "border-line rounded-[16px] border-[1.5px] p-4",
        metricToneClasses[tone],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center">
          <MealfloIcon name={icon} size={34} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-muted text-sm font-medium">{label}</p>
          <p className="font-display text-ink text-[34px] font-bold tracking-[-0.02em]">
            {value}
          </p>
        </div>
      </div>
      {note ? (
        <p className="text-muted mt-3 text-sm leading-6">{note}</p>
      ) : null}
    </div>
  );
}

type InfoPairProps = {
  className?: string;
  label: ReactNode;
  value: ReactNode;
};

export function InfoPair({ className, label, value }: InfoPairProps) {
  return (
    <div
      className={cn(
        "grid gap-1 border-b border-[rgba(24,24,60,0.08)] pb-3 last:border-b-0 last:pb-0",
        className
      )}
    >
      <dt className="text-muted text-sm font-medium">{label}</dt>
      <dd className="text-ink text-sm leading-6">{value}</dd>
    </div>
  );
}

type StatusPillProps = {
  icon?: IconName;
  label: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
};

export function StatusPill({ icon, label, tone = "neutral" }: StatusPillProps) {
  return (
    <Badge
      tone={tone}
      leading={icon ? <MealfloIcon name={icon} size={18} /> : undefined}
      size="sm"
    >
      {label}
    </Badge>
  );
}

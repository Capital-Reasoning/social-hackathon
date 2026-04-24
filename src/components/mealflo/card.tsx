import type { ComponentPropsWithoutRef } from "react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type CardProps = ComponentPropsWithoutRef<"div"> & {
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
  tinted?: boolean;
};

const paddingClasses = {
  lg: "p-6 sm:p-7",
  md: "p-5 sm:p-6",
  sm: "p-4 sm:p-5",
} as const;

export function Card({
  className,
  interactive = false,
  padding = "md",
  tinted = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border-[1.5px] bg-white",
        interactive &&
          "mf-sheen hover:border-line-strong transition-[transform,border-color,background-color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5",
        paddingClasses[padding],
        tinted ? "border-line bg-surface-tint" : "border-line bg-white",
        className
      )}
      {...props}
    />
  );
}

type CardHeaderProps = {
  action?: ReactNode;
  className?: string;
  note?: string;
  title: ReactNode;
};

export function CardHeader({
  action,
  className,
  note,
  title,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="space-y-1.5">
        <div className="space-y-1">
          <h2 className="font-display text-ink text-[26px] font-semibold tracking-[-0.02em]">
            {title}
          </h2>
          {note ? (
            <p className="text-muted max-w-[44rem] text-sm leading-6">{note}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type InsetCardProps = ComponentPropsWithoutRef<"div">;

export function InsetCard({ className, ...props }: InsetCardProps) {
  return (
    <div
      className={cn(
        "border-line bg-surface-tint rounded-[14px] border-[1.5px] p-4",
        className
      )}
      {...props}
    />
  );
}

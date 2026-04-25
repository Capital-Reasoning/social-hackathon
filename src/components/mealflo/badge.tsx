import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BadgeTone =
  | "success"
  | "warning"
  | "info"
  | "neutral"
  | "primary"
  | "error";

const toneClasses: Record<BadgeTone, string> = {
  success:
    "border-[rgba(78,173,111,0.42)] bg-[var(--mf-color-green-50)] text-success-text",
  warning:
    "border-[rgba(240,168,48,0.44)] bg-[var(--mf-color-amber-50)] text-warning-text",
  info: "border-[rgba(120,144,250,0.44)] bg-[var(--mf-color-blue-50)] text-info-text",
  neutral: "border-[rgba(24,24,60,0.18)] bg-white text-muted",
  primary: "border-[rgba(170,120,0,0.4)] bg-[rgba(250,226,120,0.28)] text-ink",
  error:
    "border-[rgba(224,80,80,0.4)] bg-[var(--mf-color-red-50)] text-error-text",
};

type BadgeProps = {
  children: ReactNode;
  className?: string;
  leading?: ReactNode;
  size?: "sm" | "md";
  tone?: BadgeTone;
};

const sizeClasses = {
  md: "gap-2 px-3 py-1 text-sm",
  sm: "gap-1.5 px-2.5 py-1 text-[13px]",
} as const;

export function Badge({
  children,
  className,
  leading,
  size = "md",
  tone = "neutral",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border-[1.5px] font-medium whitespace-nowrap",
        sizeClasses[size],
        toneClasses[tone],
        className
      )}
    >
      {leading}
      {children}
    </span>
  );
}

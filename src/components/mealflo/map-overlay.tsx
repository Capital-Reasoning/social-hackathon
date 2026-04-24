import type { ReactNode } from "react";

import { Badge } from "@/components/mealflo/badge";
import { MealfloIcon, type IconName } from "@/components/mealflo/icon";
import { cn } from "@/lib/utils";

type MapOverlayStackProps = {
  align?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  children: ReactNode;
  className?: string;
};

const alignClasses: Record<
  NonNullable<MapOverlayStackProps["align"]>,
  string
> = {
  "bottom-left": "bottom-3 left-3 items-start",
  "bottom-right": "right-3 bottom-3 items-end",
  "top-left": "top-3 left-3 items-start",
  "top-right": "top-3 right-3 items-end",
};

export function MapOverlayStack({
  align = "top-left",
  children,
  className,
}: MapOverlayStackProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 flex max-w-[calc(100%-24px)] flex-col gap-2",
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}

type MapOverlayCardProps = {
  children: ReactNode;
  className?: string;
};

export function MapOverlayCard({ children, className }: MapOverlayCardProps) {
  return (
    <div
      className={cn(
        "border-line pointer-events-auto rounded-[16px] border-[1.5px] bg-[rgba(255,255,255,0.94)] p-3 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

type MapOverlayStatProps = {
  icon: IconName;
  label: string;
  tone?: "neutral" | "info" | "success" | "warning";
  value: ReactNode;
};

export function MapOverlayStat({
  icon,
  label,
  tone = "neutral",
  value,
}: MapOverlayStatProps) {
  return (
    <MapOverlayCard className="min-w-[170px]">
      <div className="flex items-start gap-3">
        <MealfloIcon name={icon} size={24} />
        <div className="space-y-1">
          <Badge tone={tone} size="sm">
            {label}
          </Badge>
          <p className="font-display text-ink text-xl font-semibold tracking-[-0.02em]">
            {value}
          </p>
        </div>
      </div>
    </MapOverlayCard>
  );
}

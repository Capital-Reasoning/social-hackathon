import type { ComponentProps } from "react";

import Link from "next/link";

import { IconSwatch } from "@/components/mealflo/icon";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  contextLabel?: string;
  contextLabelClassName?: string;
  href?: ComponentProps<typeof Link>["href"];
  iconClassName?: string;
  iconSize?: number;
  light?: boolean;
  showIcon?: boolean;
  showSubtitle?: boolean;
  swatchClassName?: string;
  swatchSize?: number;
  textClassName?: string;
};

export function MealfloLogo({
  className,
  contextLabel,
  contextLabelClassName,
  href = "/",
  iconClassName,
  iconSize = 34,
  light = false,
  showIcon = true,
  showSubtitle = true,
  swatchClassName,
  swatchSize = 50,
  textClassName,
}: LogoProps) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-3", className)}
    >
      {showIcon ? (
        <IconSwatch
          name="meal-container"
          decorative={false}
          framed={light}
          label="mealflo"
          size={iconSize}
          swatchSize={swatchSize}
          tone={light ? "warm" : "surface"}
          iconClassName={iconClassName}
          className={cn(
            light ? "border-white/18 bg-white/14" : undefined,
            swatchClassName
          )}
        />
      ) : null}
      <div className="min-w-0">
        <p
          className={cn(
            "font-display text-xl font-bold",
            light ? "text-white" : "text-ink",
            textClassName
          )}
        >
          mealflo
          {contextLabel ? (
            <>
              {" "}
              <span
                className={cn(
                  "ml-2 font-normal text-current opacity-68",
                  contextLabelClassName
                )}
              >
                {contextLabel}
              </span>
            </>
          ) : null}
        </p>
        {showSubtitle ? (
          <p className={cn("text-sm", light ? "text-white/70" : "text-muted")}>
            Food delivery operations
          </p>
        ) : null}
      </div>
    </Link>
  );
}

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

export function Table({
  className,
  scrollerClassName,
  wrapperClassName,
  ...props
}: ComponentPropsWithoutRef<"table"> & {
  scrollerClassName?: string;
  wrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        "border-line overflow-hidden rounded-[16px] border-[1.5px] bg-white",
        wrapperClassName
      )}
    >
      <div className={cn("overflow-x-auto", scrollerClassName)}>
        <table
          className={cn("w-full min-w-full border-collapse", className)}
          {...props}
        />
      </div>
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn(
        "bg-[rgba(253,248,228,0.9)] text-left text-sm text-[rgba(28,28,46,0.76)]",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn("bg-white", className)} {...props} />;
}

export function TableRow({
  className,
  ...props
}: ComponentPropsWithoutRef<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-[rgba(24,24,60,0.08)] transition-[background-color] duration-[var(--mf-duration-base)] ease-out last:border-b-0 hover:bg-[rgba(253,248,228,0.42)]",
        className
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"th">) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-sm font-semibold whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: ComponentPropsWithoutRef<"td">) {
  return (
    <td
      className={cn("text-ink px-4 py-3 text-sm leading-6", className)}
      {...props}
    />
  );
}

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ModalPreviewProps = {
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  note?: string;
  title: string;
};

export function ModalPreview({
  actions,
  children,
  className,
  note,
  title,
}: ModalPreviewProps) {
  return (
    <div
      className={cn(
        "border-line rounded-[22px] border-[1.5px] bg-white p-5 shadow-[var(--mf-shadow-elevated)] sm:p-6",
        className
      )}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-display text-ink text-[28px] font-semibold tracking-[-0.03em]">
            {title}
          </h3>
          {note ? <p className="text-muted text-sm leading-6">{note}</p> : null}
        </div>
        {children}
        {actions ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

type SheetPreviewProps = {
  children: ReactNode;
  className?: string;
  edge?: "bottom" | "right";
  title?: string;
};

export function SheetPreview({
  children,
  className,
  edge = "right",
  title,
}: SheetPreviewProps) {
  return (
    <div
      className={cn(
        "border-line overflow-hidden rounded-[20px] border-[1.5px] bg-white",
        edge === "bottom" ? "p-5 pt-3" : "p-5",
        className
      )}
    >
      {edge === "bottom" ? (
        <div className="mb-4 flex justify-center">
          <span className="h-1.5 w-14 rounded-full bg-[rgba(24,24,60,0.14)]" />
        </div>
      ) : null}
      {title ? (
        <h3 className="font-display text-ink mb-3 text-[24px] font-semibold tracking-[-0.03em]">
          {title}
        </h3>
      ) : null}
      {children}
    </div>
  );
}

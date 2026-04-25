"use client";

import {
  type ComponentPropsWithoutRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

type ModalLayerProps = ComponentPropsWithoutRef<"div"> & {
  lockBodyScroll?: boolean;
};

export function ModalLayer({
  children,
  className,
  lockBodyScroll = true,
  ...props
}: ModalLayerProps) {
  useEffect(() => {
    if (!lockBodyScroll || typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [lockBodyScroll]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      {...props}
      className={cn(
        "fixed inset-0 z-[1000] isolate overscroll-contain",
        className
      )}
    >
      {children}
    </div>,
    document.body
  );
}

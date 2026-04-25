"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

type DeliveryTab = "today" | "later";

type AdminDeliveriesToggleProps = {
  laterCount: number;
  laterTable: ReactNode;
  todayCount: number;
  todayTable: ReactNode;
};

const deliveryTabs = [
  { key: "today", label: "Today" },
  { key: "later", label: "Later" },
] as const satisfies readonly { key: DeliveryTab; label: string }[];

export function AdminDeliveriesToggle({
  laterCount,
  laterTable,
  todayCount,
  todayTable,
}: AdminDeliveriesToggleProps) {
  const [activeTab, setActiveTab] = useState<DeliveryTab>("today");
  const counts = {
    later: laterCount,
    today: todayCount,
  } satisfies Record<DeliveryTab, number>;

  return (
    <div className="space-y-3">
      <div
        className="border-line inline-grid w-full max-w-[360px] grid-cols-2 rounded-full border-[1.5px] bg-white p-1"
        aria-label="Delivery date"
      >
        {deliveryTabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={active}
              className={cn(
                "min-h-[44px] rounded-full px-4 text-sm font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                active
                  ? "bg-[var(--mf-color-yellow-300)]"
                  : "hover:bg-[var(--mf-color-yellow-50)]"
              )}
              style={{
                color: active ? "var(--mf-color-ink)" : "var(--mf-color-muted)",
              }}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          );
        })}
      </div>

      {activeTab === "today" ? todayTable : laterTable}
    </div>
  );
}

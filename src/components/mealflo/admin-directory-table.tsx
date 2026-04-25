"use client";

import { useMemo, useState } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/mealflo/table";
import type { AdminDirectoryRow } from "@/server/mealflo/backend";
import { cn } from "@/lib/utils";

type DirectoryFilter = "clients" | "drivers";

const filters: Array<{ key: DirectoryFilter; label: string }> = [
  { key: "clients", label: "Clients" },
  { key: "drivers", label: "Drivers" },
];

function DriverAvailability({ row }: { row: AdminDirectoryRow }) {
  if (!row.availabilityDays || !row.availabilityWindow) {
    return <span className="text-muted">{row.measure}</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="border-line text-ink inline-flex min-h-[30px] items-center rounded-full border-[1.5px] bg-white px-3 text-xs font-semibold">
        {row.availabilityDays}
      </span>
      <span className="text-info-text inline-flex min-h-[30px] items-center rounded-full border-[1.5px] border-[rgba(120,144,250,0.28)] bg-[var(--mf-color-blue-50)] px-3 text-xs font-semibold">
        {row.availabilityWindow}
      </span>
      {row.availabilityDuration ? (
        <span className="text-muted basis-full text-sm leading-5">
          {row.availabilityDuration}
        </span>
      ) : null}
    </div>
  );
}

export function AdminDirectoryTable({ rows }: { rows: AdminDirectoryRow[] }) {
  const [filter, setFilter] = useState<DirectoryFilter>("clients");
  const visibleRows = useMemo(
    () =>
      rows.filter(
        (row) => row.role === (filter === "clients" ? "client" : "driver")
      ),
    [filter, rows]
  );
  const visibleNoun = filter === "clients" ? "clients" : "drivers";

  return (
    <div className="space-y-4">
      <div
        className="border-line/70 inline-flex items-center gap-6 border-b-[1.5px] pb-0"
        aria-label="Directory type"
        role="tablist"
      >
        {filters.map((item) => {
          const active = item.key === filter;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              className={cn(
                "relative -mb-[1.5px] min-h-[40px] px-1 pb-2 text-sm font-semibold transition-[color,border-color] duration-[var(--mf-duration-base)] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                active
                  ? "text-ink border-b-[2.5px] border-[var(--mf-color-ink)]"
                  : "text-muted hover:text-ink border-b-[2.5px] border-transparent"
              )}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Table className="w-full min-w-[820px] table-fixed">
        <colgroup>
          <col className="w-[20%]" />
          <col className={filter === "clients" ? "w-[32%]" : "w-[27%]"} />
          <col className={filter === "clients" ? "w-[17%]" : "w-[25%]"} />
          <col className={filter === "clients" ? "w-[31%]" : "w-[28%]"} />
        </colgroup>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="py-2.5">Name</TableHeaderCell>
            <TableHeaderCell className="py-2.5">
              {filter === "clients" ? "Address" : "Start area"}
            </TableHeaderCell>
            <TableHeaderCell className="py-2.5">
              {filter === "clients" ? "Meal count" : "Availability"}
            </TableHeaderCell>
            <TableHeaderCell className="py-2.5">Notes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-3">
                <p className="text-ink truncate font-semibold">{row.name}</p>
              </TableCell>
              <TableCell className="text-muted py-3">
                <span className="line-clamp-2">{row.location}</span>
              </TableCell>
              <TableCell className="py-3">
                {filter === "drivers" ? (
                  <DriverAvailability row={row} />
                ) : (
                  <span className="text-muted">{row.measure}</span>
                )}
              </TableCell>
              <TableCell className="text-muted py-3">
                <span className="line-clamp-2">
                  {row.notes || "No special notes"}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted text-sm leading-6" aria-live="polite">
        Showing {visibleRows.length} {visibleNoun}.
      </p>
    </div>
  );
}

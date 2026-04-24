"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/mealflo/badge";
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

type DirectoryFilter = "all" | "clients" | "drivers" | "active" | "attention";

const filters: Array<{ key: DirectoryFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "clients", label: "Clients" },
  { key: "drivers", label: "Drivers" },
  { key: "active", label: "Active" },
  { key: "attention", label: "Needs attention" },
];

function rowMatchesFilter(row: AdminDirectoryRow, filter: DirectoryFilter) {
  if (filter === "clients") {
    return row.role === "client";
  }

  if (filter === "drivers") {
    return row.role === "driver";
  }

  if (filter === "active") {
    return /active|available|assigned|delivered/i.test(row.status);
  }

  if (filter === "attention") {
    return /held|todo|low|inactive|review/i.test(row.status);
  }

  return true;
}

export function AdminDirectoryTable({ rows }: { rows: AdminDirectoryRow[] }) {
  const [filter, setFilter] = useState<DirectoryFilter>("all");
  const visibleRows = useMemo(
    () => rows.filter((row) => rowMatchesFilter(row, filter)),
    [filter, rows]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" aria-label="Directory filters">
        {filters.map((item) => {
          const active = item.key === filter;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              className={cn(
                "min-h-[38px] rounded-full border-[1.5px] px-3 text-sm font-medium transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                active
                  ? "border-[rgba(170,120,0,0.4)] bg-[rgba(250,226,120,0.28)]"
                  : "border-line hover:border-line-strong bg-white"
              )}
              style={{
                color: active ? "var(--mf-color-ink)" : "var(--mf-color-muted)",
              }}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Table className="min-w-[760px]">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="py-2.5">Type</TableHeaderCell>
            <TableHeaderCell className="py-2.5">Name</TableHeaderCell>
            <TableHeaderCell className="py-2.5">Location</TableHeaderCell>
            <TableHeaderCell className="py-2.5">Status</TableHeaderCell>
            <TableHeaderCell className="py-2.5">Notes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-2.5">
                <Badge
                  size="sm"
                  tone={row.role === "driver" ? "info" : "neutral"}
                >
                  {row.role === "driver" ? "Driver" : "Client"}
                </Badge>
              </TableCell>
              <TableCell className="text-ink py-2.5 font-medium">
                {row.name}
              </TableCell>
              <TableCell className="text-muted py-2.5">
                {row.location}
              </TableCell>
              <TableCell className="py-2.5">{row.status}</TableCell>
              <TableCell className="text-muted py-2.5">{row.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-muted text-sm leading-6" aria-live="polite">
        Showing {visibleRows.length} of {rows.length}.
      </p>
    </div>
  );
}

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

type DirectoryFilter = "clients" | "drivers";
type DirectorySubfilter = "all" | "active" | "attention";

const filters: Array<{ key: DirectoryFilter; label: string }> = [
  { key: "clients", label: "Clients" },
  { key: "drivers", label: "Drivers" },
];

const subfilters: Array<{ key: DirectorySubfilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "attention", label: "Needs attention" },
];

function rowMatchesSubfilter(
  row: AdminDirectoryRow,
  filter: DirectorySubfilter
) {
  if (filter === "all") {
    return true;
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
  const [filter, setFilter] = useState<DirectoryFilter>("clients");
  const [subfilter, setSubfilter] = useState<DirectorySubfilter>("all");
  const visibleRows = useMemo(
    () =>
      rows
        .filter(
          (row) => row.role === (filter === "clients" ? "client" : "driver")
        )
        .filter((row) => rowMatchesSubfilter(row, subfilter)),
    [filter, rows, subfilter]
  );
  const visibleNoun = filter === "clients" ? "clients" : "drivers";

  return (
    <div className="space-y-4">
      <div
        className="border-line inline-grid w-full max-w-[360px] grid-cols-2 rounded-full border-[1.5px] bg-white p-1"
        aria-label="Directory type"
      >
        {filters.map((item) => {
          const active = item.key === filter;

          return (
            <button
              key={item.key}
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
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        className="flex flex-wrap gap-2"
        aria-label={`${visibleNoun} filters`}
      >
        {subfilters.map((item) => {
          const active = item.key === subfilter;

          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              className={cn(
                "min-h-[38px] rounded-full border-[1.5px] px-3 text-sm font-medium transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)]",
                active
                  ? "border-[rgba(120,144,250,0.38)] bg-[var(--mf-color-blue-50)]"
                  : "border-line hover:border-line-strong bg-white"
              )}
              style={{
                color: active
                  ? "var(--mf-color-info-text)"
                  : "var(--mf-color-muted)",
              }}
              onClick={() => setSubfilter(item.key)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Table className="w-full min-w-[820px]">
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-[20%] py-2.5">Name</TableHeaderCell>
            <TableHeaderCell className="w-[14%] py-2.5">Status</TableHeaderCell>
            <TableHeaderCell className="w-[27%] py-2.5">
              {filter === "clients" ? "Address" : "Start area"}
            </TableHeaderCell>
            <TableHeaderCell className="w-[17%] py-2.5">
              {filter === "clients" ? "Meal count" : "Availability"}
            </TableHeaderCell>
            <TableHeaderCell className="w-[22%] py-2.5">Notes</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="py-3">
                <p className="text-ink font-semibold">{row.name}</p>
              </TableCell>
              <TableCell className="py-3">
                <Badge
                  size="sm"
                  tone={
                    /held|todo|inactive|review/i.test(row.status)
                      ? "warning"
                      : "info"
                  }
                >
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted py-3">{row.location}</TableCell>
              <TableCell className="text-muted py-3">{row.measure}</TableCell>
              <TableCell className="text-muted py-3">
                {row.notes || "No special notes"}
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

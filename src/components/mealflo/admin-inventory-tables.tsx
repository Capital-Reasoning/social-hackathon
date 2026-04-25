"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/mealflo/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/mealflo/table";
import type { ParsedInventoryDraftItem } from "@/lib/inventory";

type MealRow = {
  allergenFlags: string[];
  category: string;
  dietaryTags: string[];
  id: string;
  name: string;
  quantity: string;
  quantityAvailable: number;
  refrigerated: boolean;
  sourceNote: string | null;
  status: "low" | "ready";
  tags: string[];
};

type IngredientRow = {
  id: string;
  name: string;
  notes: string | null;
  perishability: string;
  perishabilityScore: number;
  quantity: string;
  refrigerated: boolean;
  source: string;
  suggestionConfidence: string;
};

type InventoryAcceptedDetail = {
  id: string;
  item: ParsedInventoryDraftItem;
  sourceNote: string;
};

type AdminInventoryTablesProps = {
  ingredients: IngredientRow[];
  meals: MealRow[];
};

export const inventoryAcceptedEventName = "mealflo:inventory-item-accepted";

function displayKitchenLabel(value: string) {
  return value
    .replace(/cold-chain/gi, "needs refrigeration")
    .replace(/Cold chain/g, "Needs refrigeration")
    .replace(/Fridge/g, "Needs refrigeration");
}

function DashboardSectionHeader({
  note,
  title,
}: {
  note: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
      <div className="space-y-1">
        <h2 className="font-display text-ink text-[28px] font-semibold tracking-[-0.02em]">
          {title}
        </h2>
        <p className="text-muted max-w-[44rem] text-sm leading-6">{note}</p>
      </div>
    </div>
  );
}

function upsertById<T extends { id: string }>(rows: T[], row: T) {
  const withoutExisting = rows.filter((item) => item.id !== row.id);

  return [row, ...withoutExisting];
}

function mealRowFromAccepted({
  id,
  item,
}: InventoryAcceptedDetail): MealRow {
  const quantityAvailable = item.quantity;

  return {
    allergenFlags: item.allergenFlags,
    category: (item.category ?? "hot_meal").replace(/_/g, " "),
    dietaryTags: item.dietaryTags,
    id,
    name: item.name,
    quantity: String(quantityAvailable),
    quantityAvailable,
    refrigerated: item.refrigerated,
    sourceNote: item.notes,
    status: quantityAvailable <= 3 ? "low" : "ready",
    tags: [
      item.refrigerated ? "Fridge" : "Shelf stable",
      ...item.dietaryTags.slice(0, 2).map((entry) => entry.replace(/_/g, " ")),
    ],
  };
}

function ingredientRowFromAccepted({
  id,
  item,
  sourceNote,
}: InventoryAcceptedDetail): IngredientRow {
  return {
    id,
    name: item.name,
    notes: item.notes,
    perishability: item.perishability.label,
    perishabilityScore: item.perishability.score,
    quantity: `${item.quantity} ${item.unit}`,
    refrigerated: item.refrigerated,
    source: sourceNote || "Manual entry",
    suggestionConfidence: `${item.perishability.confidence}%`,
  };
}

function sortIngredients(rows: IngredientRow[]) {
  return rows
    .slice()
    .sort(
      (left, right) =>
        right.perishabilityScore - left.perishabilityScore ||
        left.name.localeCompare(right.name)
    );
}

function sortMeals(rows: MealRow[]) {
  return rows
    .slice()
    .sort(
      (left, right) =>
        Number(left.quantityAvailable > 3) -
          Number(right.quantityAvailable > 3) ||
        left.quantityAvailable - right.quantityAvailable ||
        left.name.localeCompare(right.name)
    );
}

export function AdminInventoryTables({
  ingredients: initialIngredients,
  meals: initialMeals,
}: AdminInventoryTablesProps) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [meals, setMeals] = useState(initialMeals);

  useEffect(() => {
    setIngredients(initialIngredients);
  }, [initialIngredients]);

  useEffect(() => {
    setMeals(initialMeals);
  }, [initialMeals]);

  useEffect(() => {
    const handleAccepted = (event: Event) => {
      const detail = (event as CustomEvent<InventoryAcceptedDetail>).detail;

      if (!detail?.id || !detail.item) {
        return;
      }

      if (detail.item.entryType === "meal") {
        setMeals((current) =>
          sortMeals(upsertById(current, mealRowFromAccepted(detail)))
        );
        return;
      }

      setIngredients((current) =>
        sortIngredients(upsertById(current, ingredientRowFromAccepted(detail)))
      );
    };

    window.addEventListener(inventoryAcceptedEventName, handleAccepted);

    return () => {
      window.removeEventListener(inventoryAcceptedEventName, handleAccepted);
    };
  }, []);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(520px,0.95fr)]">
      <section className="space-y-3">
        <DashboardSectionHeader
          title="Deliverable meals"
          note="Named meal items are the only food layer used by route allocation and drivers."
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Meal</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Quantity</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meals.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="min-w-[220px]">
                    <p className="text-ink text-[17px] font-semibold">
                      {item.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="text-muted">{item.category}</TableCell>
                <TableCell className="font-display text-lg font-semibold">
                  {item.quantity}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.status === "low" ? (
                      <Badge size="sm" tone="warning">
                        Low
                      </Badge>
                    ) : null}
                    {item.tags.map((tag) => (
                      <Badge
                        key={tag}
                        size="sm"
                        tone={
                          /fridge|refrigeration/i.test(tag)
                            ? "info"
                            : "neutral"
                        }
                      >
                        {displayKitchenLabel(tag)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="space-y-3">
        <DashboardSectionHeader
          title="Ingredients"
          note="Ingredient stock stays out of driver loadouts and sorts by confirmed perishability."
        />
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Ingredient</TableHeaderCell>
              <TableHeaderCell>Quantity</TableHeaderCell>
              <TableHeaderCell>Storage</TableHeaderCell>
              <TableHeaderCell>Source</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ingredients.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="min-w-[220px]">
                    <p className="text-ink text-[17px] font-semibold">
                      {item.name}
                    </p>
                  </div>
                </TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>
                  {item.perishability === "Use today" || item.refrigerated ? (
                    <Badge size="sm" tone="warning">
                      {displayKitchenLabel(item.perishability)}
                    </Badge>
                  ) : (
                    <span className="border-line text-muted inline-flex h-7 items-center rounded-full border-[1.5px] bg-white px-2.5 text-xs font-semibold">
                      {displayKitchenLabel(item.perishability)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-muted">{item.source}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}

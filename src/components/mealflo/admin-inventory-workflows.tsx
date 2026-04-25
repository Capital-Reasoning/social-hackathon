"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";
import { CardHeader } from "@/components/mealflo/card";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { MealfloIcon } from "@/components/mealflo/icon";
import {
  formatInventoryLabel,
  ingredientSourceTypes,
  mealCategories,
  suggestPerishability,
  type IngredientSourceType,
  type InventoryEntryType,
  type MealCategory,
  type ParsedInventoryDraft,
  type ParsedInventoryDraftItem,
} from "@/lib/inventory";

type AdminInventoryWorkflowsProps = {
  defaultReceiptText: string;
  defaultSourceNote: string;
};

type ApiResponse<T> = {
  data?: T;
  error?: string;
  ok: boolean;
};

const perishabilityOptions = [
  { label: "Use today", score: 5 },
  { label: "Needs refrigeration", score: 5 },
  { label: "Use soon", score: 4 },
  { label: "Use this week", score: 3 },
  { label: "Stable", score: 1 },
] as const;

function splitTags(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function labelForOption(value: string) {
  return formatInventoryLabel(value);
}

function parsePerishabilityValue(value: string) {
  const [score, label] = value.split("|");

  return {
    label: label ?? "Use this week",
    score: Number.parseInt(score ?? "3", 10),
  };
}

function itemPayload(
  item: ParsedInventoryDraftItem,
  sourceNote: string,
  overrides?: {
    perishabilityLabel?: string;
    perishabilityScore?: number;
  }
) {
  return {
    allergenFlags: item.allergenFlags,
    category: item.category,
    dietaryTags: item.dietaryTags,
    entryType: item.entryType,
    lowStockThreshold: item.entryType === "meal" ? 3 : undefined,
    name: item.name,
    notes: item.notes,
    perishabilityLabel:
      overrides?.perishabilityLabel ?? item.perishability.label,
    perishabilityScore:
      overrides?.perishabilityScore ?? item.perishability.score,
    quantity: item.quantity,
    refrigerated: item.refrigerated,
    sourceReference: sourceNote,
    sourceType: item.sourceType,
    unit: item.unit,
  };
}

export function AdminInventoryWorkflows({
  defaultReceiptText,
  defaultSourceNote,
}: AdminInventoryWorkflowsProps) {
  const router = useRouter();
  const [entryType, setEntryType] = useState<InventoryEntryType>("meal");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("12");
  const [unit, setUnit] = useState("tray");
  const [category, setCategory] = useState<MealCategory>("hot_meal");
  const [sourceType, setSourceType] =
    useState<IngredientSourceType>("purchase");
  const [sourceNote, setSourceNote] = useState(defaultSourceNote);
  const [dietaryTags, setDietaryTags] = useState("");
  const [allergenFlags, setAllergenFlags] = useState("");
  const [notes, setNotes] = useState("");
  const [refrigerated, setRefrigerated] = useState(false);
  const [manualStatus, setManualStatus] = useState("Ready to save.");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [receiptText, setReceiptText] = useState(defaultReceiptText);
  const [documentName, setDocumentName] = useState("Community pantry receipt");
  const [draft, setDraft] = useState<ParsedInventoryDraft | null>(null);
  const [parseStatus, setParseStatus] = useState(
    "Paste a receipt or use the sample below."
  );
  const [isParsing, setIsParsing] = useState(false);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [confirmedKeys, setConfirmedKeys] = useState<Set<string>>(
    () => new Set()
  );

  const suggestion = useMemo(
    () => suggestPerishability({ name, refrigerated }),
    [name, refrigerated]
  );
  const [perishabilityValue, setPerishabilityValue] = useState(
    `${suggestion.score}|${suggestion.label}`
  );

  const saveManualEntry = async () => {
    const selectedPerishability = parsePerishabilityValue(perishabilityValue);

    setIsSavingManual(true);
    setManualStatus("Saving inventory entry.");

    try {
      const response = await fetch("/api/inventory/manual", {
        body: JSON.stringify({
          allergenFlags: splitTags(allergenFlags),
          category: entryType === "meal" ? category : undefined,
          dietaryTags: splitTags(dietaryTags),
          entryType,
          name,
          notes: notes || undefined,
          perishabilityLabel:
            entryType === "ingredient"
              ? selectedPerishability.label
              : undefined,
          perishabilityScore:
            entryType === "ingredient"
              ? selectedPerishability.score
              : undefined,
          quantity: Number.parseInt(quantity, 10),
          refrigerated,
          sourceReference: sourceNote,
          sourceType: entryType === "ingredient" ? sourceType : undefined,
          unit,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<{ id: string }>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Inventory entry could not be saved.");
      }

      setManualStatus(`${name || "Inventory item"} saved.`);
      setName("");
      setNotes("");
      router.refresh();
    } catch (error) {
      setManualStatus(
        error instanceof Error ? error.message : "Inventory entry failed."
      );
    } finally {
      setIsSavingManual(false);
    }
  };

  const parseReceipt = async () => {
    setIsParsing(true);
    setParseStatus("Reading receipt text and staging draft items.");
    setConfirmedKeys(new Set());

    try {
      const response = await fetch("/api/inventory/parse", {
        body: JSON.stringify({
          documentName,
          rawText: receiptText,
          sourceNote,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload =
        (await response.json()) as ApiResponse<ParsedInventoryDraft>;

      if (!response.ok || !payload.ok || !payload.data) {
        throw new Error(payload.error ?? "Receipt could not be parsed.");
      }

      setDraft(payload.data);
      setParseStatus(`${payload.data.items.length} draft items ready.`);
    } catch (error) {
      setParseStatus(
        error instanceof Error ? error.message : "Receipt parsing failed."
      );
    } finally {
      setIsParsing(false);
    }
  };

  const confirmItem = async (item: ParsedInventoryDraftItem, key: string) => {
    setConfirmingKey(key);
    setParseStatus(`Confirming ${item.name}.`);

    try {
      const response = await fetch("/api/inventory/manual", {
        body: JSON.stringify(itemPayload(item, sourceNote)),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiResponse<{ id: string }>;

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Draft item could not be confirmed.");
      }

      setConfirmedKeys((current) => new Set(current).add(key));
      setParseStatus(`${item.name} confirmed and saved.`);
      router.refresh();
    } catch (error) {
      setParseStatus(
        error instanceof Error ? error.message : "Draft item failed."
      );
    } finally {
      setConfirmingKey(null);
    }
  };

  const confirmAll = async () => {
    if (!draft) {
      return;
    }

    for (const [index, item] of draft.items.entries()) {
      const key = `${item.line}-${index}`;

      if (!confirmedKeys.has(key)) {
        await confirmItem(item, key);
      }
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="space-y-3">
        <CardHeader
          title="Manual entry"
          note="Add route-ready meals or ingredient stock without mixing the two layers."
          action={
            <Badge
              tone={entryType === "meal" ? "success" : "info"}
              leading={
                <MealfloIcon
                  name={entryType === "meal" ? "meal-container" : "fridge"}
                  size={18}
                />
              }
            >
              {entryType === "meal" ? "Deliverable meal" : "Ingredient"}
            </Badge>
          }
        />

        <div className="border-line space-y-5 rounded-[16px] border-[1.5px] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap gap-2" aria-label="Inventory type">
            {(["meal", "ingredient"] as const).map((type) => (
              <Button
                key={type}
                variant={entryType === type ? "primary" : "secondary"}
                leading={
                  <MealfloIcon
                    name={type === "meal" ? "meal-container" : "fridge"}
                    size={20}
                  />
                }
                onClick={() => {
                  setEntryType(type);
                  setUnit(type === "meal" ? "tray" : "bag");
                }}
              >
                {type === "meal" ? "Meal item" : "Ingredient"}
              </Button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Item name" htmlFor="inventory-name" required>
              <Input
                id="inventory-name"
                value={name}
                placeholder={
                  entryType === "meal"
                    ? "Roast chicken tray"
                    : "Morning spinach"
                }
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
              <Field label="Quantity" htmlFor="inventory-quantity" required>
                <Input
                  id="inventory-quantity"
                  inputMode="numeric"
                  min={1}
                  type="number"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Field label="Unit" htmlFor="inventory-unit" required>
                <Input
                  id="inventory-unit"
                  value={unit}
                  onChange={(event) => setUnit(event.target.value)}
                />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {entryType === "meal" ? (
              <Field label="Meal category" htmlFor="inventory-category">
                <Select
                  id="inventory-category"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as MealCategory)
                  }
                >
                  {mealCategories.map((option) => (
                    <option key={option} value={option}>
                      {labelForOption(option)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <Field label="Source type" htmlFor="inventory-source-type">
                <Select
                  id="inventory-source-type"
                  value={sourceType}
                  onChange={(event) =>
                    setSourceType(event.target.value as IngredientSourceType)
                  }
                >
                  {ingredientSourceTypes.map((option) => (
                    <option key={option} value={option}>
                      {labelForOption(option)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            <Field label="Source note" htmlFor="inventory-source-note">
              <Input
                id="inventory-source-note"
                value={sourceNote}
                onChange={(event) => setSourceNote(event.target.value)}
              />
            </Field>
          </div>

          <label className="border-line bg-surface-tint flex min-h-[52px] items-center gap-3 rounded-[12px] border-[1.5px] px-4">
            <input
              checked={refrigerated}
              className="border-line checked:border-action checked:bg-action h-5 w-5 rounded-[6px] border-[1.5px] bg-white"
              type="checkbox"
              onChange={(event) => setRefrigerated(event.target.checked)}
            />
            <span className="text-ink text-sm font-medium">
              Needs refrigerated handling
            </span>
          </label>

          {entryType === "ingredient" ? (
            <div className="border-line bg-surface-tint space-y-3 rounded-[12px] border-[1.5px] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="text-ink font-medium">Suggested sort</p>
                  <p className="text-muted text-sm leading-6">
                    {suggestion.label}. {suggestion.reason}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setPerishabilityValue(
                      `${suggestion.score}|${suggestion.label}`
                    )
                  }
                >
                  Apply suggestion
                </Button>
              </div>
              <Field label="Confirmed perishability" htmlFor="perishability">
                <Select
                  id="perishability"
                  value={perishabilityValue}
                  onChange={(event) =>
                    setPerishabilityValue(event.target.value)
                  }
                >
                  {perishabilityOptions.map((option) => (
                    <option
                      key={`${option.score}-${option.label}`}
                      value={`${option.score}|${option.label}`}
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}

          {entryType === "meal" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                hint="Comma-separated tags, for example low sodium, vegetarian."
                label="Dietary tags"
                htmlFor="dietary-tags"
              >
                <Input
                  id="dietary-tags"
                  value={dietaryTags}
                  onChange={(event) => setDietaryTags(event.target.value)}
                />
              </Field>
              <Field
                hint="Comma-separated blockers, for example peanut, dairy."
                label="Allergen flags"
                htmlFor="allergen-flags"
              >
                <Input
                  id="allergen-flags"
                  value={allergenFlags}
                  onChange={(event) => setAllergenFlags(event.target.value)}
                />
              </Field>
            </div>
          ) : null}

          <Field label="Coordinator notes" htmlFor="inventory-notes">
            <Textarea
              id="inventory-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className="text-muted text-sm leading-6">
              {manualStatus}
            </p>
            <Button
              disabled={isSavingManual || name.trim().length < 2}
              variant="primary"
              leading={<MealfloIcon name="plus" size={20} />}
              onClick={saveManualEntry}
            >
              {isSavingManual ? "Saving" : "Save item"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <CardHeader
          title="Receipt draft"
          note="Review meal and ingredient lines before they change inventory."
          action={<Badge tone="info">Manual approval</Badge>}
        />

        <div className="border-line space-y-5 rounded-[16px] border-[1.5px] bg-white p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Document name" htmlFor="receipt-document-name">
              <Input
                id="receipt-document-name"
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
              />
            </Field>
            <Field label="Receipt source" htmlFor="receipt-source-note">
              <Input
                id="receipt-source-note"
                value={sourceNote}
                onChange={(event) => setSourceNote(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Receipt text" htmlFor="receipt-text">
            <Textarea
              id="receipt-text"
              value={receiptText}
              onChange={(event) => setReceiptText(event.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p role="status" className="text-muted text-sm leading-6">
              {parseStatus}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setReceiptText(defaultReceiptText)}
              >
                Use sample receipt
              </Button>
              <Button
                disabled={isParsing}
                variant="primary"
                leading={<MealfloIcon name="magnifying-glass" size={20} />}
                onClick={parseReceipt}
              >
                {isParsing ? "Parsing" : "Parse receipt"}
              </Button>
            </div>
          </div>

          {draft ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="neutral">{draft.items.length} items</Badge>
                </div>
                <Button
                  disabled={
                    draft.items.length === 0 ||
                    confirmedKeys.size === draft.items.length
                  }
                  size="sm"
                  variant="secondary"
                  onClick={confirmAll}
                >
                  Confirm all
                </Button>
              </div>

              <div className="grid gap-3">
                {draft.items.map((item, index) => {
                  const key = `${item.line}-${index}`;
                  const confirmed = confirmedKeys.has(key);

                  return (
                    <div
                      key={key}
                      className="border-line grid gap-4 border-t-[1.5px] py-4 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-start gap-2">
                          <Badge
                            tone={
                              item.entryType === "meal" ? "success" : "info"
                            }
                            leading={
                              <MealfloIcon
                                name={
                                  item.entryType === "meal"
                                    ? "meal-container"
                                    : "fridge"
                                }
                                size={18}
                              />
                            }
                          >
                            {item.entryType === "meal" ? "Meal" : "Ingredient"}
                          </Badge>
                          <Badge tone={item.refrigerated ? "info" : "neutral"}>
                            {item.refrigerated
                              ? "Needs refrigeration"
                              : "Shelf stable"}
                          </Badge>
                          {item.entryType === "ingredient" ? (
                            <Badge tone="warning">
                              {item.perishability.label}
                            </Badge>
                          ) : null}
                        </div>
                        <div className="space-y-1">
                          <p className="text-ink font-medium">{item.name}</p>
                          <p className="text-muted text-sm leading-6">
                            {item.quantity} {item.unit}
                            {item.category
                              ? `, ${labelForOption(item.category)}`
                              : ""}
                          </p>
                          <p className="text-muted text-sm leading-6">
                            Source line: {item.line}
                          </p>
                        </div>
                      </div>
                      <Button
                        disabled={confirmed || confirmingKey === key}
                        size="sm"
                        variant={confirmed ? "secondary" : "primary"}
                        leading={
                          <MealfloIcon
                            name={confirmed ? "checkmark-circle" : "plus"}
                            size={18}
                          />
                        }
                        onClick={() => confirmItem(item, key)}
                      >
                        {confirmed
                          ? "Confirmed"
                          : confirmingKey === key
                            ? "Saving"
                            : "Confirm"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

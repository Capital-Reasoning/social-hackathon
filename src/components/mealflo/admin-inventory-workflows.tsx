"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/mealflo/badge";
import { Button } from "@/components/mealflo/button";
import { CardHeader } from "@/components/mealflo/card";
import { Field, Input, Select, Textarea } from "@/components/mealflo/field";
import { MealfloIcon } from "@/components/mealflo/icon";
import { ModalLayer } from "@/components/mealflo/modal-layer";
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
import { cn } from "@/lib/utils";

type AdminInventoryWorkflowsProps = {
  allergenFlagOptions: string[];
  defaultReceiptText: string;
  defaultSourceNote: string;
  dietaryTagOptions: string[];
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

function appendTagValue(currentValue: string, option: string) {
  const currentTags = splitTags(currentValue);

  if (currentTags.includes(option)) {
    return currentTags.map(labelForOption).join(", ");
  }

  return [...currentTags, option].map(labelForOption).join(", ");
}

type TagSuggestionFieldProps = {
  hint: string;
  id: string;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  value: string;
};

function TagSuggestionField({
  hint,
  id,
  label,
  onChange,
  options,
  placeholder,
  value,
}: TagSuggestionFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTags = splitTags(value);
  const activeTerm = value.split(",").at(-1)?.trim().toLowerCase() ?? "";
  const suggestions = options
    .filter((option) => !selectedTags.includes(option))
    .filter((option) => {
      if (!activeTerm) {
        return true;
      }

      const displayLabel = labelForOption(option).toLowerCase();

      return displayLabel.includes(activeTerm) || option.includes(activeTerm);
    })
    .slice(0, 6);

  return (
    <Field hint={hint} label={label} htmlFor={id}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          autoComplete="off"
          placeholder={placeholder}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 120);
          }}
          onChange={(event) => {
            onChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
        />
        {isOpen && suggestions.length > 0 ? (
          <div className="border-line absolute right-0 left-0 z-20 mt-2 grid gap-1 rounded-[12px] border-[1.5px] bg-white p-2">
            {suggestions.map((option) => (
              <button
                key={option}
                className="hover:bg-surface-tint focus-visible:outline-action rounded-[8px] px-3 py-2 text-left text-sm font-medium transition-[background-color] duration-[var(--mf-duration-base)]"
                style={{
                  WebkitTextFillColor: "var(--mf-color-ink)",
                  color: "var(--mf-color-ink)",
                }}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(appendTagValue(value, option));
                  setIsOpen(false);
                }}
              >
                {labelForOption(option)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  );
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
  allergenFlagOptions,
  defaultReceiptText,
  defaultSourceNote,
  dietaryTagOptions,
}: AdminInventoryWorkflowsProps) {
  const router = useRouter();
  const [entryType, setEntryType] = useState<InventoryEntryType>("meal");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState<MealCategory | "">("");
  const [sourceType, setSourceType] = useState<IngredientSourceType | "">("");
  const [manualSourceNote, setManualSourceNote] = useState("");
  const [dietaryTags, setDietaryTags] = useState("");
  const [allergenFlags, setAllergenFlags] = useState("");
  const [notes, setNotes] = useState("");
  const [refrigerated, setRefrigerated] = useState(false);
  const [manualStatus, setManualStatus] = useState("");
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [receiptText, setReceiptText] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [receiptSourceNote, setReceiptSourceNote] = useState("");
  const [receiptImageName, setReceiptImageName] = useState("");
  const [draft, setDraft] = useState<ParsedInventoryDraft | null>(null);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [parseStatus, setParseStatus] = useState(
    "Upload, paste, or use the sample receipt."
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
  const [perishabilityValue, setPerishabilityValue] = useState("");
  const canSaveManual =
    name.trim().length >= 2 &&
    Number.parseInt(quantity, 10) > 0 &&
    unit.trim().length > 0;
  const canParseReceipt = receiptText.trim().length >= 4;

  useEffect(() => {
    if (!draftModalOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDraftModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [draftModalOpen]);

  const saveManualEntry = async () => {
    const selectedPerishability = perishabilityValue
      ? parsePerishabilityValue(perishabilityValue)
      : null;

    setIsSavingManual(true);
    setManualStatus("Saving inventory entry.");

    try {
      const response = await fetch("/api/inventory/manual", {
        body: JSON.stringify({
          allergenFlags: splitTags(allergenFlags),
          category: entryType === "meal" && category ? category : undefined,
          dietaryTags: splitTags(dietaryTags),
          entryType,
          name,
          notes: notes || undefined,
          perishabilityLabel:
            entryType === "ingredient" && selectedPerishability
              ? selectedPerishability.label
              : undefined,
          perishabilityScore:
            entryType === "ingredient" && selectedPerishability
              ? selectedPerishability.score
              : undefined,
          quantity: Number.parseInt(quantity, 10),
          refrigerated,
          sourceReference: manualSourceNote || undefined,
          sourceType:
            entryType === "ingredient" && sourceType ? sourceType : undefined,
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
          documentName: documentName || undefined,
          rawText: receiptText,
          sourceNote: receiptSourceNote || undefined,
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
      setDraftModalOpen(true);
      setParseStatus(`${payload.data.items.length} draft items ready.`);
    } catch (error) {
      setDraftModalOpen(false);
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
        body: JSON.stringify(itemPayload(item, receiptSourceNote)),
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
    <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
      <section className="flex min-h-0 flex-col gap-3">
        <CardHeader
          title="Manual entry"
          note="Add route-ready meals or ingredient stock without mixing the two layers."
        />

        <div className="border-line flex flex-1 flex-col gap-5 rounded-[16px] border-[1.5px] bg-white p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2" aria-label="Inventory type">
            {(["meal", "ingredient"] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={entryType === type}
                className={cn(
                  "border-line text-ink hover:border-line-strong inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[12px] border-[1.5px] bg-white px-4 text-base font-semibold transition-[transform,background-color,border-color,color] duration-[var(--mf-duration-base)] ease-[var(--mf-ease-spring)] hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(120,144,250,0.5)] active:scale-[0.97]",
                  entryType === type &&
                    "text-info-text border-[rgba(120,144,250,0.5)] bg-[var(--mf-color-blue-50)]"
                )}
                style={{
                  color:
                    entryType === type
                      ? "var(--mf-color-info-text)"
                      : "var(--mf-color-ink)",
                }}
                onClick={() => setEntryType(type)}
              >
                <MealfloIcon
                  name={type === "meal" ? "meal-container" : "fridge"}
                  size={20}
                />
                <span>{type === "meal" ? "Meal item" : "Ingredient"}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Item name" htmlFor="inventory-name" required>
              <Input
                id="inventory-name"
                value={name}
                leadingIcon={entryType === "meal" ? "meal-container" : "grocery-bag"}
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
                  placeholder="12"
                  type="number"
                  value={quantity}
                  leadingIcon="checklist"
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </Field>
              <Field label="Unit" htmlFor="inventory-unit" required>
                <Input
                  id="inventory-unit"
                  placeholder={entryType === "meal" ? "tray" : "bag"}
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
                  leadingIcon="fork-knife"
                  onChange={(event) =>
                    setCategory(event.target.value as MealCategory | "")
                  }
                >
                  <option value="">Choose category</option>
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
                  leadingIcon="grocery-bag"
                  onChange={(event) =>
                    setSourceType(
                      event.target.value as IngredientSourceType | ""
                    )
                  }
                >
                  <option value="">Choose source</option>
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
                placeholder="Thursday produce order"
                value={manualSourceNote}
                leadingIcon="pencil-edit"
                onChange={(event) => setManualSourceNote(event.target.value)}
              />
            </Field>
          </div>

          <label
            className={cn(
              "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[12px] border-[1.5px] px-4 transition-[background-color,border-color] duration-[var(--mf-duration-base)] ease-out",
              refrigerated
                ? "border-[rgba(120,144,250,0.45)] bg-[var(--mf-color-blue-50)]"
                : "border-line bg-surface-tint hover:border-line-strong"
            )}
          >
            <input
              checked={refrigerated}
              className="border-line checked:border-action checked:bg-action h-5 w-5 rounded-[6px] border-[1.5px] bg-white"
              type="checkbox"
              onChange={(event) => setRefrigerated(event.target.checked)}
            />
            <MealfloIcon name="snowflake" size={20} />
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
                  <option value="">Choose perishability</option>
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
              <TagSuggestionField
                hint="Comma-separated tags, for example low sodium, vegetarian."
                id="dietary-tags"
                label="Dietary tags"
                options={dietaryTagOptions}
                placeholder="low sodium, vegetarian"
                value={dietaryTags}
                onChange={setDietaryTags}
              />
              <TagSuggestionField
                hint="Comma-separated blockers, for example peanut, dairy."
                id="allergen-flags"
                label="Allergen flags"
                options={allergenFlagOptions}
                placeholder="peanut, dairy"
                value={allergenFlags}
                onChange={setAllergenFlags}
              />
            </div>
          ) : null}

          <Field label="Coordinator notes" htmlFor="inventory-notes">
            <Textarea
              id="inventory-notes"
              placeholder="Add handling notes for coordinators."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {manualStatus ? (
              <p role="status" className="text-muted text-sm leading-6">
                {manualStatus}
              </p>
            ) : null}
            <Button
              disabled={isSavingManual || !canSaveManual}
              variant="primary"
              onClick={saveManualEntry}
            >
              {isSavingManual ? "Saving" : "Save item"}
            </Button>
          </div>
        </div>
      </section>

      <section className="flex min-h-0 flex-col gap-3">
        <CardHeader
          title="Receipt draft"
          note="Review meal and ingredient lines before they change inventory."
        />

        <div className="border-line flex flex-1 flex-col gap-5 rounded-[16px] border-[1.5px] bg-white p-5 sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Document name" htmlFor="receipt-document-name">
              <Input
                id="receipt-document-name"
                placeholder="Community pantry receipt"
                value={documentName}
                leadingIcon="pencil-edit"
                onChange={(event) => setDocumentName(event.target.value)}
              />
            </Field>
            <Field label="Receipt source" htmlFor="receipt-source-note">
              <Input
                id="receipt-source-note"
                placeholder="Thursday produce order"
                value={receiptSourceNote}
                leadingIcon="grocery-bag"
                onChange={(event) => setReceiptSourceNote(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Receipt image" htmlFor="receipt-image">
            <label
              htmlFor="receipt-image"
              className={cn(
                "group/upload flex min-h-[88px] cursor-pointer items-center gap-4 rounded-[14px] border-[1.5px] border-dashed px-4 py-3 transition-[background-color,border-color] duration-[var(--mf-duration-base)] ease-out",
                receiptImageName
                  ? "border-[rgba(120,144,250,0.45)] bg-[var(--mf-color-blue-50)]"
                  : "border-line bg-surface-tint hover:border-line-strong hover:bg-[rgba(253,248,228,0.55)]"
              )}
            >
              <span className="border-line bg-white inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-[1.5px]">
                <MealfloIcon
                  name={receiptImageName ? "checkmark-circle" : "export"}
                  size={24}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-ink block text-[15px] font-semibold">
                  {receiptImageName || "Upload receipt photo"}
                </span>
                <span className="text-muted block text-sm leading-5">
                  {receiptImageName
                    ? "Tap to replace the image."
                    : "Drop a JPG or PNG, or browse from your device."}
                </span>
              </span>
              <input
                id="receipt-image"
                accept="image/*"
                className="sr-only"
                type="file"
                onChange={(event) => {
                  const fileName = event.target.files?.[0]?.name ?? "";
                  setReceiptImageName(fileName);
                  setParseStatus(
                    fileName
                      ? `${fileName} attached. Add receipt text or use the sample receipt to parse.`
                      : "Upload, paste, or use the sample receipt."
                  );
                }}
              />
            </label>
          </Field>

          <Field
            className="flex min-h-[260px] flex-1 flex-col"
            label="Receipt text"
            htmlFor="receipt-text"
          >
            <Textarea
              id="receipt-text"
              className="min-h-[220px] flex-1 resize-none"
              placeholder="Paste receipt lines, for example 24 yogurt cups, 18 spinach bags."
              value={receiptText}
              onChange={(event) => setReceiptText(event.target.value)}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDocumentName("Community pantry receipt");
                  setReceiptSourceNote(defaultSourceNote);
                  setReceiptText(defaultReceiptText);
                  setParseStatus("Sample receipt ready to parse.");
                }}
              >
                Use sample receipt
              </Button>
              <Button
                disabled={isParsing || !canParseReceipt}
                variant="primary"
                onClick={parseReceipt}
              >
                {isParsing ? "Parsing" : "Parse receipt"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {draft && draftModalOpen ? (
        <ModalLayer
          className="flex animate-[mfModalBackdropIn_180ms_var(--mf-ease-out)] items-center justify-center bg-[rgba(28,28,46,0.34)] px-3 py-4 backdrop-blur-[2px] sm:px-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inventory-draft-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setDraftModalOpen(false);
            }
          }}
        >
          <div className="border-line max-h-[calc(100vh-2rem)] w-full max-w-[920px] animate-[mfModalPanelIn_260ms_var(--mf-ease-spring)] overflow-hidden rounded-[22px] border-[1.5px] bg-white shadow-[var(--mf-shadow-elevated)]">
            <div className="border-line flex items-start justify-between gap-4 border-b bg-[var(--mf-color-neutral-50)] px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-muted text-sm font-medium">
                  {documentName || "Receipt draft"}
                </p>
                <h3
                  id="inventory-draft-title"
                  className="font-display text-ink mt-1 text-[30px] font-semibold tracking-[-0.02em]"
                >
                  Review {draft.items.length} parsed items
                </h3>
              </div>
              <Button
                type="button"
                iconOnly
                aria-label="Close receipt draft"
                className="min-h-[48px] border-transparent bg-transparent p-0 text-[var(--mf-color-muted)] hover:-translate-y-0.5 hover:border-transparent hover:bg-transparent hover:text-[var(--mf-color-ink)]"
                onClick={() => setDraftModalOpen(false)}
              >
                <MealfloIcon name="close-x" size={28} />
              </Button>
            </div>

            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto px-5 py-2 sm:px-6">
              {draft.items.map((item, index) => {
                const key = `${item.line}-${index}`;
                const confirmed = confirmedKeys.has(key);

                return (
                  <div
                    key={key}
                    className="border-line grid gap-4 border-t-[1.5px] py-4 first:border-t-0 md:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-start gap-2">
                        <Badge
                          tone={item.entryType === "meal" ? "success" : "info"}
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
                        <p className="text-ink text-[17px] font-semibold">
                          {item.name}
                        </p>
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

            <div className="border-line flex flex-col gap-3 border-t bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p role="status" className="text-muted text-sm leading-6">
                {parseStatus}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="quiet"
                  onClick={() => setDraftModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  disabled={
                    draft.items.length === 0 ||
                    confirmedKeys.size === draft.items.length
                  }
                  variant="primary"
                  onClick={confirmAll}
                >
                  Confirm all
                </Button>
              </div>
            </div>
          </div>
        </ModalLayer>
      ) : null}
    </div>
  );
}

export const mealCategories = [
  "hot_meal",
  "frozen_meal",
  "soup",
  "breakfast",
  "hamper",
  "snack",
] as const;

export const ingredientSourceTypes = [
  "donation",
  "purchase",
  "pantry",
  "farm",
  "hub_transfer",
] as const;

export type InventoryEntryType = "ingredient" | "meal";
export type MealCategory = (typeof mealCategories)[number];
export type IngredientSourceType = (typeof ingredientSourceTypes)[number];

export type PerishabilitySuggestion = {
  confidence: number;
  label: string;
  reason: string;
  score: number;
};

export type ParsedInventoryDraftItem = {
  allergenFlags: string[];
  category: MealCategory | undefined;
  confidence: number;
  dietaryTags: string[];
  entryType: InventoryEntryType;
  line: string;
  name: string;
  notes: string;
  perishability: PerishabilitySuggestion;
  quantity: number;
  refrigerated: boolean;
  sourceType: IngredientSourceType | undefined;
  unit: string;
};

export type ParsedInventoryDraft = {
  confidence: number;
  documentName: string;
  items: ParsedInventoryDraftItem[];
  sourceNote: string;
};

export const fixtureReceiptText = [
  "Community pantry receipt",
  "24 yogurt cups",
  "18 spinach bags",
  "12 garden vegetable soup containers",
  "8 produce hampers",
  "6 roast chicken trays",
  "10 apple bags",
].join("\n");

const coldWords = [
  "chicken",
  "dairy",
  "fish",
  "meat",
  "milk",
  "salmon",
  "seafood",
  "turkey",
  "yogurt",
];

const useTodayWords = [
  "greens",
  "herbs",
  "lettuce",
  "spinach",
  "sprouts",
  "strawberries",
];

const useSoonWords = [
  "berries",
  "broccoli",
  "carrot",
  "celery",
  "pepper",
  "tomato",
];

const weekWords = ["apple", "banana", "cabbage", "orange", "pear", "produce"];
const stableWords = [
  "bean",
  "canned",
  "case",
  "lentil",
  "oat",
  "pasta",
  "potato",
  "rice",
];

function includesAny(value: string, words: readonly string[]) {
  return words.some((word) => value.includes(word));
}

export function suggestPerishability({
  name,
  refrigerated,
}: {
  name: string;
  refrigerated?: boolean;
}): PerishabilitySuggestion {
  const normalized = name.toLowerCase();

  if (includesAny(normalized, useTodayWords)) {
    return {
      confidence: 88,
      label: "Use today",
      reason: "Leafy or delicate produce should be checked first.",
      score: 5,
    };
  }

  if (refrigerated || includesAny(normalized, coldWords)) {
    return {
      confidence: 84,
      label: "Needs refrigeration",
      reason: "This item should stay cool and near the top.",
      score: 5,
    };
  }

  if (includesAny(normalized, useSoonWords)) {
    return {
      confidence: 78,
      label: "Use soon",
      reason: "Fresh produce has a shorter handling window.",
      score: 4,
    };
  }

  if (includesAny(normalized, weekWords)) {
    return {
      confidence: 72,
      label: "Use this week",
      reason: "Durable produce can wait behind same-day items.",
      score: 3,
    };
  }

  if (includesAny(normalized, stableWords)) {
    return {
      confidence: 80,
      label: "Stable",
      reason: "Dry or canned goods can sit below perishable items.",
      score: 1,
    };
  }

  return {
    confidence: 62,
    label: "Use this week",
    reason: "No strong signal was found, so a coordinator should confirm.",
    score: 3,
  };
}

function titleCase(value: string) {
  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatInventoryLabel(value: string) {
  return titleCase(value).replace(/\bAnd\b/g, "and");
}

function singularizeUnit(value: string) {
  return value.toLowerCase().replace(/s$/, "");
}

function guessUnit(rawName: string) {
  const normalized = rawName.toLowerCase();

  if (normalized.includes("hamper")) {
    return "hamper";
  }

  if (normalized.includes("tray")) {
    return "tray";
  }

  if (normalized.includes("container")) {
    return "container";
  }

  if (normalized.includes("cup")) {
    return "cup";
  }

  if (normalized.includes("bag")) {
    return "bag";
  }

  if (normalized.includes("crate")) {
    return "crate";
  }

  if (normalized.includes("box")) {
    return "box";
  }

  if (normalized.includes("case")) {
    return "case";
  }

  return "unit";
}

function cleanItemName(rawName: string, unit: string) {
  const unitPattern = new RegExp(`\\b${unit}s?\\b`, "gi");
  const cleaned = rawName.replace(unitPattern, "").replace(/\s+/g, " ").trim();
  const label = formatInventoryLabel(cleaned || rawName);

  if (unit === "hamper" && !label.toLowerCase().includes("hamper")) {
    return `${label} Hamper`;
  }

  return label;
}

function guessMealCategory(name: string): MealCategory | undefined {
  const normalized = name.toLowerCase();

  if (normalized.includes("hamper") || normalized.includes("produce")) {
    return "hamper";
  }

  if (normalized.includes("soup")) {
    return "soup";
  }

  if (normalized.includes("breakfast") || normalized.includes("yogurt pack")) {
    return "breakfast";
  }

  if (normalized.includes("snack") || normalized.includes("cup")) {
    return "snack";
  }

  if (normalized.includes("frozen")) {
    return "frozen_meal";
  }

  if (
    normalized.includes("meal") ||
    normalized.includes("tray") ||
    normalized.includes("chicken") ||
    normalized.includes("dinner")
  ) {
    return "hot_meal";
  }

  return undefined;
}

function guessDietaryTags(name: string) {
  const normalized = name.toLowerCase();
  const tags: string[] = [];

  if (normalized.includes("vegetable") || normalized.includes("lentil")) {
    tags.push("vegetarian");
  }

  if (normalized.includes("fruit") || normalized.includes("produce")) {
    tags.push("fresh");
  }

  if (normalized.includes("chicken") || normalized.includes("yogurt")) {
    tags.push("high_protein");
  }

  return tags;
}

function guessAllergenFlags(name: string) {
  const normalized = name.toLowerCase();
  const flags: string[] = [];

  if (normalized.includes("yogurt") || normalized.includes("dairy")) {
    flags.push("dairy");
  }

  if (normalized.includes("salmon") || normalized.includes("fish")) {
    flags.push("fish");
  }

  if (normalized.includes("pasta") || normalized.includes("wheat")) {
    flags.push("wheat");
  }

  return flags;
}

function guessSourceType(sourceNote: string): IngredientSourceType {
  const normalized = sourceNote.toLowerCase();

  if (normalized.includes("farm")) {
    return "farm";
  }

  if (normalized.includes("hub")) {
    return "hub_transfer";
  }

  if (normalized.includes("donation") || normalized.includes("rescue")) {
    return "donation";
  }

  if (normalized.includes("pantry")) {
    return "pantry";
  }

  return "purchase";
}

function guessEntryType(rawName: string): InventoryEntryType {
  const normalized = rawName.toLowerCase();

  if (
    normalized.includes("meal") ||
    normalized.includes("tray") ||
    normalized.includes("soup container") ||
    normalized.includes("hamper") ||
    normalized.includes("breakfast pack")
  ) {
    return "meal";
  }

  return "ingredient";
}

function parseReceiptLine(line: string, sourceNote: string) {
  const match = line.match(/(?:^|\s)(\d{1,4})\s+(.+)$/);

  if (!match) {
    return null;
  }

  const quantity = Number.parseInt(match[1]!, 10);
  const rawName = match[2]!
    .replace(/\s+-\s+.*$/, "")
    .replace(/\([^)]*\)/g, "")
    .trim();

  if (!Number.isFinite(quantity) || quantity <= 0 || rawName.length < 3) {
    return null;
  }

  const unit = guessUnit(rawName);
  const name = cleanItemName(rawName, unit);
  const entryType = guessEntryType(rawName);
  const refrigerated =
    includesAny(rawName.toLowerCase(), coldWords) ||
    includesAny(rawName.toLowerCase(), useTodayWords);
  const perishability = suggestPerishability({ name, refrigerated });

  return {
    allergenFlags: guessAllergenFlags(name),
    category: entryType === "meal" ? guessMealCategory(rawName) : undefined,
    confidence: Math.min(92, perishability.confidence + 4),
    dietaryTags: guessDietaryTags(name),
    entryType,
    line,
    name,
    notes:
      entryType === "meal"
        ? "Parsed as route-ready food. Confirm before staging."
        : perishability.reason,
    perishability,
    quantity,
    refrigerated,
    sourceType:
      entryType === "ingredient" ? guessSourceType(sourceNote) : undefined,
    unit: singularizeUnit(unit),
  } satisfies ParsedInventoryDraftItem;
}

export function parseReceiptInventoryDraft({
  documentName = "Fixture receipt",
  rawText,
  sourceNote,
}: {
  documentName?: string;
  rawText: string;
  sourceNote: string;
}): ParsedInventoryDraft {
  const text = rawText.trim() ? rawText : fixtureReceiptText;
  const lines = text
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);
  const items = lines
    .map((line) => parseReceiptLine(line, sourceNote))
    .filter((item): item is ParsedInventoryDraftItem => Boolean(item));
  const confidence =
    items.length === 0
      ? 0
      : Math.round(
          items.reduce((sum, item) => sum + item.confidence, 0) / items.length
        );

  return {
    confidence,
    documentName,
    items,
    sourceNote,
  };
}

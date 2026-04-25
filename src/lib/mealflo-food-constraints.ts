type FoodConstraints = {
  allergenFlags: string[];
  dietaryTags: string[];
};

const dietaryLabels: Record<string, string> = {
  dairy_free: "Dairy free",
  diabetic_friendly: "Diabetic friendly",
  gluten_free: "Gluten free",
  halal: "Halal",
  heart_healthy: "Heart healthy",
  high_protein: "High protein",
  lactose_free: "Dairy free",
  low_sodium: "Low sodium",
  renal_friendly: "Renal friendly",
  soft_food: "Soft food",
  vegan: "Vegan",
  vegetarian: "Vegetarian",
};

const allergenLabels: Record<string, string> = {
  dairy: "No dairy",
  egg: "No eggs",
  fish: "No fish",
  gluten: "No gluten",
  peanut: "No peanuts",
  shellfish: "No shellfish",
  tree_nut: "No tree nuts",
  wheat: "No wheat",
};

const dietaryAliases: Record<string, string> = {
  dairy_free: "dairy_free",
  diabetic: "diabetic_friendly",
  diabetic_friendly: "diabetic_friendly",
  diabetes: "diabetic_friendly",
  gluten_free: "gluten_free",
  halal: "halal",
  heart_healthy: "heart_healthy",
  high_protein: "high_protein",
  lactose_free: "dairy_free",
  low_salt: "low_sodium",
  low_sodium: "low_sodium",
  lower_salt: "low_sodium",
  renal_friendly: "renal_friendly",
  soft: "soft_food",
  soft_food: "soft_food",
  vegan: "vegan",
  vegetarian: "vegetarian",
};

const allergenAliases: Record<string, string[]> = {
  dairy: ["dairy"],
  dairy_allergy: ["dairy"],
  egg: ["egg"],
  egg_allergy: ["egg"],
  eggs: ["egg"],
  fish: ["fish"],
  fish_allergy: ["fish"],
  gluten: ["gluten"],
  gluten_allergy: ["gluten"],
  no_dairy: ["dairy"],
  no_egg: ["egg"],
  no_eggs: ["egg"],
  no_fish: ["fish"],
  no_gluten: ["gluten"],
  no_nuts: ["peanut", "tree_nut"],
  no_peanut: ["peanut"],
  no_peanuts: ["peanut"],
  no_shellfish: ["shellfish"],
  no_tree_nut: ["tree_nut"],
  no_tree_nuts: ["tree_nut"],
  no_wheat: ["wheat"],
  nut_allergy: ["peanut", "tree_nut"],
  peanut: ["peanut"],
  peanut_allergy: ["peanut"],
  peanut_free: ["peanut"],
  peanut_safe: ["peanut"],
  peanuts: ["peanut"],
  shellfish: ["shellfish"],
  shellfish_allergy: ["shellfish"],
  tree_nut: ["tree_nut"],
  tree_nut_allergy: ["tree_nut"],
  tree_nuts: ["tree_nut"],
  wheat: ["wheat"],
  wheat_allergy: ["wheat"],
};

const dietaryOrder = [
  "low_sodium",
  "vegetarian",
  "vegan",
  "halal",
  "gluten_free",
  "dairy_free",
  "diabetic_friendly",
  "soft_food",
  "renal_friendly",
  "heart_healthy",
  "high_protein",
];

const allergenOrder = [
  "peanut",
  "tree_nut",
  "shellfish",
  "egg",
  "fish",
  "wheat",
  "dairy",
  "gluten",
];

function normalizeKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sentenceCaseLabel(value: string) {
  const label = value.replace(/_/g, " ");

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function addConstraintEntry(
  entry: string,
  constraints: {
    allergens: Set<string>;
    dietary: Set<string>;
  }
) {
  const key = normalizeKey(entry);

  if (!key || key === "none" || key === "n_a" || key === "na") {
    return;
  }

  const allergenMatches = allergenAliases[key];

  if (allergenMatches) {
    allergenMatches.forEach((allergen) => constraints.allergens.add(allergen));
    return;
  }

  const dietaryMatch = dietaryAliases[key];

  if (dietaryMatch) {
    constraints.dietary.add(dietaryMatch);
    return;
  }

  constraints.dietary.add(key);
}

function orderedValues(values: Set<string>, order: string[]) {
  return [
    ...order.filter((value) => values.has(value)),
    ...Array.from(values)
      .filter((value) => !order.includes(value))
      .sort(),
  ];
}

export function normalizeFoodConstraints(input: FoodConstraints) {
  const dietary = new Set<string>();
  const allergens = new Set<string>();

  input.dietaryTags.forEach((entry) =>
    addConstraintEntry(entry, { allergens, dietary })
  );
  input.allergenFlags.forEach((entry) => {
    const key = normalizeKey(entry);
    const allergenMatches = allergenAliases[key];

    if (allergenMatches) {
      allergenMatches.forEach((allergen) => allergens.add(allergen));
    } else if (key) {
      allergens.add(key);
    }
  });

  if (allergens.has("dairy")) {
    dietary.delete("dairy_free");
    dietary.delete("lactose_free");
  }

  if (allergens.has("gluten")) {
    dietary.delete("gluten_free");
  }

  return {
    allergenFlags: orderedValues(allergens, allergenOrder),
    dietaryTags: orderedValues(dietary, dietaryOrder),
  };
}

export function parseFoodConstraintsReviewText(value: string) {
  return normalizeFoodConstraints({
    allergenFlags: [],
    dietaryTags: value.split(/[,;\n]/).map((entry) => entry.trim()),
  });
}

export function formatFoodConstraintsForReview(input: FoodConstraints) {
  const normalized = normalizeFoodConstraints(input);
  const labels = [
    ...normalized.dietaryTags.map(
      (tag) => dietaryLabels[tag] ?? sentenceCaseLabel(tag)
    ),
    ...normalized.allergenFlags.map(
      (flag) => allergenLabels[flag] ?? `No ${flag.replace(/_/g, " ")}`
    ),
  ];
  const uniqueLabels = Array.from(
    new Map(labels.map((label) => [label.toLowerCase(), label])).values()
  );

  return uniqueLabels.length > 0 ? uniqueLabels.join(", ") : "None";
}

export function inferFoodConstraintsFromText(value: string) {
  const text = value.toLowerCase();
  const dietaryTags: string[] = [];
  const allergenFlags: string[] = [];

  if (/\b(low[-\s]?sodium|low[-\s]?salt|lower[-\s]?salt)\b/.test(text)) {
    dietaryTags.push("low_sodium");
  }

  if (/\bvegan\b/.test(text)) {
    dietaryTags.push("vegan");
  } else if (/\b(vegetarian|no meat)\b/.test(text)) {
    dietaryTags.push("vegetarian");
  }

  if (/\b(gluten[-\s]?free|celiac)\b/.test(text)) {
    dietaryTags.push("gluten_free");
  }

  if (/\b(soft|pureed|minced|easy to chew)\b/.test(text)) {
    dietaryTags.push("soft_food");
  }

  if (/\b(diabetic|diabetes)\b/.test(text)) {
    dietaryTags.push("diabetic_friendly");
  }

  if (/\b(dairy[-\s]?free|lactose[-\s]?free)\b/.test(text)) {
    dietaryTags.push("dairy_free");
  }

  if (/\bhalal\b/.test(text)) {
    dietaryTags.push("halal");
  }

  if (/\brenal[-\s]?friendly\b/.test(text)) {
    dietaryTags.push("renal_friendly");
  }

  if (/\b(no nuts?|nut allergy)\b/.test(text)) {
    allergenFlags.push("peanut", "tree_nut");
  } else {
    if (/\b(peanut|peanuts)\b/.test(text)) {
      allergenFlags.push("peanut");
    }

    if (/\btree nuts?\b/.test(text)) {
      allergenFlags.push("tree_nut");
    }
  }

  if (/\bshellfish\b/.test(text)) {
    allergenFlags.push("shellfish");
  }

  if (/\b(egg allergy|no eggs?)\b/.test(text)) {
    allergenFlags.push("egg");
  }

  if (/\b(fish allergy|no fish)\b/.test(text)) {
    allergenFlags.push("fish");
  }

  if (/\b(wheat allergy|no wheat)\b/.test(text)) {
    allergenFlags.push("wheat");
  }

  if (/\b(dairy allergy|no dairy)\b/.test(text)) {
    allergenFlags.push("dairy");
  }

  if (/\b(gluten allergy|no gluten)\b/.test(text)) {
    allergenFlags.push("gluten");
  }

  return {
    ...normalizeFoodConstraints({ allergenFlags, dietaryTags }),
    coldChainRequired:
      /\b(chilled|frozen|cold|refrigerated|fridge|cooler)\b/.test(text),
  };
}

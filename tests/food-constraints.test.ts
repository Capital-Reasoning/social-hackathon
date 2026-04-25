import { describe, expect, it } from "vitest";

import {
  formatFoodConstraintsForReview,
  inferFoodConstraintsFromText,
  parseFoodConstraintsReviewText,
} from "@/lib/mealflo-food-constraints";

describe("food constraint normalization", () => {
  it("keeps public notes out of arbitrary dietary tags", () => {
    expect(
      inferFoodConstraintsFromText(
        "Frozen meals are okay if they can come before 3pm. I use a walker."
      )
    ).toEqual({
      allergenFlags: [],
      coldChainRequired: true,
      dietaryTags: [],
    });
  });

  it("formats allergy avoidances as allergen flags for review", () => {
    expect(
      formatFoodConstraintsForReview({
        allergenFlags: ["peanut"],
        dietaryTags: ["peanut_safe", "halal"],
      })
    ).toBe("Halal, No peanuts");
  });

  it("round trips edited review labels back to structured fields", () => {
    expect(parseFoodConstraintsReviewText("Low sodium, No peanuts")).toEqual({
      allergenFlags: ["peanut"],
      dietaryTags: ["low_sodium"],
    });
  });
});

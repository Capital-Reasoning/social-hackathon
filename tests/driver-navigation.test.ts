import { describe, expect, it } from "vitest";

import { getDirectionProgress } from "@/components/mealflo/driver-navigation";

describe("driver navigation", () => {
  it("announces the next maneuver before the simulated driver reaches it", () => {
    const directions = [
      { distanceMeters: 200 },
      { distanceMeters: 120 },
      { distanceMeters: 60 },
    ];

    expect(getDirectionProgress(directions, 80)).toEqual({
      remainingMeters: 120,
      stepIndex: 0,
    });
    expect(getDirectionProgress(directions, 150)).toEqual({
      remainingMeters: 50,
      stepIndex: 1,
    });
  });

  it("keeps the final instruction active once there is no later maneuver", () => {
    const directions = [{ distanceMeters: 200 }, { distanceMeters: 120 }];

    expect(getDirectionProgress(directions, 260)).toEqual({
      remainingMeters: 60,
      stepIndex: 1,
    });
  });
});

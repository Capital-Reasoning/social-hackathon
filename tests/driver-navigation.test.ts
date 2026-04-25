import { describe, expect, it } from "vitest";

import { getDirectionProgress } from "@/components/mealflo/driver-navigation";

describe("driver navigation", () => {
  it("announces the next maneuver once the driver is within 500 m", () => {
    const directions = [
      { distanceMeters: 700 },
      { distanceMeters: 120 },
      { distanceMeters: 60 },
    ];

    expect(getDirectionProgress(directions, 150)).toEqual({
      instruction: "Continue straight",
      remainingMeters: 550,
      stepIndex: 0,
    });
    expect(getDirectionProgress(directions, 220)).toEqual({
      remainingMeters: 480,
      stepIndex: 1,
    });
  });

  it("shows continue straight after a turn until the next turn is close", () => {
    const directions = [
      { distanceMeters: 200 },
      { distanceMeters: 1000 },
      { distanceMeters: 60 },
    ];

    expect(getDirectionProgress(directions, 205)).toEqual({
      instruction: "Continue straight",
      remainingMeters: 995,
      stepIndex: 1,
    });
    expect(getDirectionProgress(directions, 705)).toEqual({
      remainingMeters: 495,
      stepIndex: 2,
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

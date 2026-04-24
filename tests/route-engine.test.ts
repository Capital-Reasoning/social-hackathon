import { describe, expect, it } from "vitest";

import { resolveStreetRoute } from "@/server/mealflo/route-engine";

describe("route engine", () => {
  it("returns deterministic fallback geometry and directions without live routing", async () => {
    const waypoints = [
      [-123.3748, 48.4291],
      [-123.3522, 48.4275],
      [-123.3624, 48.4309],
    ] as const;

    const route = await resolveStreetRoute(waypoints);

    expect(route.provider).toBe("fallback");
    expect(route.geometry.length).toBeGreaterThan(waypoints.length);
    expect(route.geometry[0]).toEqual(waypoints[0]);
    expect(route.geometry.at(-1)).toEqual(waypoints.at(-1));
    expect(route.segments).toHaveLength(2);
    expect(route.segments.flatMap((segment) => segment.steps)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instruction: expect.stringContaining("Head"),
        }),
        expect.objectContaining({
          instruction: expect.stringContaining("Arrive"),
        }),
      ])
    );
  });
});

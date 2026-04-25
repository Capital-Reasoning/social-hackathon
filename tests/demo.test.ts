import { describe, expect, it } from "vitest";

import { getPersona, roleDefinitions } from "@/lib/demo";
import {
  requestDemoNotes,
  requestDemoProfiles,
  volunteerDemoNotes,
  volunteerDemoProfiles,
} from "@/lib/mealflo-demo-intake";

describe("demo helpers", () => {
  it("returns the default persona when no persona id is provided", () => {
    expect(getPersona("admin").id).toBe("sarah-coordinator");
  });

  it("keeps demo shell routes aligned with role definitions", () => {
    expect(roleDefinitions.driver.demoPath).toBe("/demo/driver");
    expect(roleDefinitions.public.defaultPath).toBe("/public");
  });

  it("keeps public form demo generators stocked with realistic options", () => {
    expect(requestDemoProfiles).toHaveLength(200);
    expect(volunteerDemoProfiles).toHaveLength(200);
    expect(requestDemoNotes).toHaveLength(100);
    expect(volunteerDemoNotes).toHaveLength(100);
    expect(requestDemoProfiles[0]?.address).toMatch(
      /Victoria|Street|Avenue|Road/
    );
  });
});

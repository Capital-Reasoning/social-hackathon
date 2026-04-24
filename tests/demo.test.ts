import { describe, expect, it } from "vitest";

import { getPersona, roleDefinitions } from "@/lib/demo";

describe("demo helpers", () => {
  it("returns the default persona when no persona id is provided", () => {
    expect(getPersona("admin").id).toBe("sarah-coordinator");
  });

  it("keeps demo shell routes aligned with role definitions", () => {
    expect(roleDefinitions.driver.demoPath).toBe("/demo/driver");
    expect(roleDefinitions.public.defaultPath).toBe("/public");
  });
});

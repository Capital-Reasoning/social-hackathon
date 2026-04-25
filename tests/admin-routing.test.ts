import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const adminPageFiles = [
  "src/app/admin/page.tsx",
  "src/app/admin/inbox/page.tsx",
  "src/app/admin/inventory/page.tsx",
  "src/app/admin/live/page.tsx",
  "src/app/admin/routes/page.tsx",
];

function sourceFor(pathname: string) {
  return readFileSync(join(process.cwd(), pathname), "utf8");
}

describe("admin routes", () => {
  it("render directly instead of redirecting into the demo shell", () => {
    for (const pageFile of adminPageFiles) {
      const source = sourceFor(pageFile);

      expect(source).not.toContain("next/navigation");
      expect(source).not.toContain("/demo/admin");
      expect(source).toContain("<AdminFrame");
    }
  });
});

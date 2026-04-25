import { describe, expect, it } from "vitest";

import { shouldRedirectPhoneRootToDriver } from "@/proxy";

describe("mobile driver proxy", () => {
  it("redirects phone requests only from the root page", () => {
    expect(shouldRedirectPhoneRootToDriver("/", true)).toBe(true);
    expect(shouldRedirectPhoneRootToDriver("/public", true)).toBe(false);
    expect(shouldRedirectPhoneRootToDriver("/public/request", true)).toBe(
      false
    );
    expect(shouldRedirectPhoneRootToDriver("/demo/public", true)).toBe(false);
    expect(shouldRedirectPhoneRootToDriver("/admin", true)).toBe(false);
    expect(shouldRedirectPhoneRootToDriver("/driver", true)).toBe(false);
  });

  it("leaves desktop root requests on the persona entry", () => {
    expect(shouldRedirectPhoneRootToDriver("/", false)).toBe(false);
  });
});

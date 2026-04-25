import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import { config, shouldRedirectPhoneRootToDriver } from "@/proxy";

type NextServerTesting = {
  unstable_doesMiddlewareMatch?: (options: {
    config: typeof config;
    url: string;
  }) => boolean;
  unstable_doesProxyMatch?: (options: {
    config: typeof config;
    url: string;
  }) => boolean;
};

function doesProxyMatch(url: string) {
  const globalWithAsyncStorage = globalThis as typeof globalThis & {
    AsyncLocalStorage?: typeof AsyncLocalStorage;
  };

  globalWithAsyncStorage.AsyncLocalStorage ??= AsyncLocalStorage;

  const require = createRequire(import.meta.url);
  const testing = require(
    "next/experimental/testing/server"
  ) as NextServerTesting;
  const matcher =
    testing.unstable_doesProxyMatch ?? testing.unstable_doesMiddlewareMatch;

  if (!matcher) {
    throw new Error("Next proxy matcher test helper is unavailable.");
  }

  return matcher({ config, url });
}

describe("mobile driver proxy", () => {
  it("runs the proxy only for the root page", () => {
    expect(doesProxyMatch("/")).toBe(true);
    expect(doesProxyMatch("/public")).toBe(false);
    expect(doesProxyMatch("/public/request")).toBe(false);
    expect(doesProxyMatch("/demo/public")).toBe(false);
    expect(doesProxyMatch("/admin")).toBe(false);
    expect(doesProxyMatch("/driver")).toBe(false);
  });

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

import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/lib/config/public-env";
import { parseServerEnv } from "@/lib/config/server-env";

describe("env parsing", () => {
  it("falls back to local app settings when public values are missing", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_APP_URL: "",
        NEXT_PUBLIC_MAP_STYLE_URL: "",
      })
    ).toEqual({
      appUrl: "http://localhost:3000",
      mapStyleUrl: "https://demotiles.maplibre.org/style.json",
    });
  });

  it("reports missing server integrations without crashing", () => {
    expect(
      parseServerEnv({
        NODE_ENV: "development",
        NEON_DATABASE_URL: "",
        OPENAI_API_KEY: "",
        OPENROUTESERVICE_API_KEY: "",
      })
    ).toMatchObject({
      hasDatabase: false,
      hasOpenAi: false,
      hasRouting: false,
    });
  });
});

import { existsSync, readFileSync } from "node:fs";

const dotEnvValues: Record<string, string> = {};

if (existsSync(".env")) {
  const contents = readFileSync(".env", "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    dotEnvValues[key] = value;

    if (key !== "NEON_DATABASE_URL" && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const explicitTestDatabaseUrl =
  process.env.MEALFLO_TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;
const allowConfiguredDatabase =
  process.env.MEALFLO_ALLOW_DESTRUCTIVE_TEST_DB === "true";

if (explicitTestDatabaseUrl) {
  process.env.NEON_DATABASE_URL = explicitTestDatabaseUrl;
} else if (allowConfiguredDatabase && !process.env.NEON_DATABASE_URL) {
  process.env.NEON_DATABASE_URL = dotEnvValues.NEON_DATABASE_URL;
} else if (!allowConfiguredDatabase) {
  delete process.env.NEON_DATABASE_URL;
}

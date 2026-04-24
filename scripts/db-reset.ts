import { existsSync, readFileSync } from "node:fs";

function loadEnvFile() {
  if (process.env.NEON_DATABASE_URL || !existsSync(".env")) {
    return;
  }

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

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadEnvFile();

  const { resetDemoData } = await import("../src/server/mealflo/backend.ts");
  const result = await resetDemoData();

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

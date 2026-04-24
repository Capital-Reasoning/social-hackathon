import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { serverEnv } from "@/lib/config/server-env";
import * as schema from "@/server/db/schema";

export const db = serverEnv.databaseUrl
  ? drizzle(neon(serverEnv.databaseUrl), { schema })
  : null;

export function getDb() {
  if (!db) {
    throw new Error(
      "NEON_DATABASE_URL is missing. Database-backed features are scaffolded but not active."
    );
  }

  return db;
}

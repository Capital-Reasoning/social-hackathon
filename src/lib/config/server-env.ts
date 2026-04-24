import { z } from "zod";

const serverEnvSchema = z.object({
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_INGEST_MAX_RESULTS: z.string().optional(),
  GMAIL_INGEST_QUERY: z.string().optional(),
  GMAIL_INGEST_TO_ADDRESS: z.string().optional(),
  GMAIL_REFRESH_TOKEN: z.string().optional(),
  GMAIL_USER_ID: z.string().optional(),
  MEALFLO_INGEST_SECRET: z.string().optional(),
  MEALFLO_ROUTING_MODE: z.enum(["auto", "fallback"]).default("auto"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEON_DATABASE_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_INTAKE_MODEL: z.string().optional(),
  OPENROUTESERVICE_API_KEY: z.string().optional(),
});

export function parseServerEnv(raw: Record<string, string | undefined>) {
  const parsed = serverEnvSchema.parse(raw);

  const databaseUrl =
    parsed.NEON_DATABASE_URL && parsed.NEON_DATABASE_URL.length > 0
      ? parsed.NEON_DATABASE_URL
      : null;
  const openAiApiKey =
    parsed.OPENAI_API_KEY && parsed.OPENAI_API_KEY.length > 0
      ? parsed.OPENAI_API_KEY
      : null;
  const openAiIntakeModel =
    parsed.OPENAI_INTAKE_MODEL && parsed.OPENAI_INTAKE_MODEL.length > 0
      ? parsed.OPENAI_INTAKE_MODEL
      : "gpt-4o-mini";
  const openRouteServiceApiKey =
    parsed.OPENROUTESERVICE_API_KEY &&
    parsed.OPENROUTESERVICE_API_KEY.length > 0
      ? parsed.OPENROUTESERVICE_API_KEY
      : null;
  const gmailClientId =
    parsed.GMAIL_CLIENT_ID && parsed.GMAIL_CLIENT_ID.length > 0
      ? parsed.GMAIL_CLIENT_ID
      : null;
  const gmailClientSecret =
    parsed.GMAIL_CLIENT_SECRET && parsed.GMAIL_CLIENT_SECRET.length > 0
      ? parsed.GMAIL_CLIENT_SECRET
      : null;
  const gmailRefreshToken =
    parsed.GMAIL_REFRESH_TOKEN && parsed.GMAIL_REFRESH_TOKEN.length > 0
      ? parsed.GMAIL_REFRESH_TOKEN
      : null;
  const gmailUserId =
    parsed.GMAIL_USER_ID && parsed.GMAIL_USER_ID.length > 0
      ? parsed.GMAIL_USER_ID
      : "me";
  const gmailIngestToAddress =
    parsed.GMAIL_INGEST_TO_ADDRESS && parsed.GMAIL_INGEST_TO_ADDRESS.length > 0
      ? parsed.GMAIL_INGEST_TO_ADDRESS
      : "info+mealflo@capitalreasoning.com";
  const gmailIngestQuery =
    parsed.GMAIL_INGEST_QUERY && parsed.GMAIL_INGEST_QUERY.length > 0
      ? parsed.GMAIL_INGEST_QUERY
      : `deliveredto:${gmailIngestToAddress} newer_than:30d`;
  const gmailIngestMaxResults = parsed.GMAIL_INGEST_MAX_RESULTS
    ? Number.parseInt(parsed.GMAIL_INGEST_MAX_RESULTS, 10)
    : 10;
  const mealfloIngestSecret =
    parsed.MEALFLO_INGEST_SECRET && parsed.MEALFLO_INGEST_SECRET.length > 0
      ? parsed.MEALFLO_INGEST_SECRET
      : null;

  return {
    nodeEnv: parsed.NODE_ENV,
    databaseUrl,
    gmailClientId,
    gmailClientSecret,
    gmailIngestMaxResults: Number.isFinite(gmailIngestMaxResults)
      ? Math.min(Math.max(gmailIngestMaxResults, 1), 50)
      : 10,
    gmailIngestQuery,
    gmailIngestToAddress,
    gmailRefreshToken,
    gmailUserId,
    openAiApiKey,
    openAiIntakeModel,
    openRouteServiceApiKey,
    hasDatabase: Boolean(databaseUrl),
    hasGmail: Boolean(gmailClientId && gmailClientSecret && gmailRefreshToken),
    mealfloIngestSecret,
    hasOpenAi: Boolean(openAiApiKey),
    hasRouting: Boolean(openRouteServiceApiKey),
    routingMode: parsed.MEALFLO_ROUTING_MODE,
  };
}

export const serverEnv = parseServerEnv(process.env);

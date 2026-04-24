import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_MAP_STYLE_URL: z.string().optional(),
});

export function parsePublicEnv(raw: Record<string, string | undefined>) {
  const parsed = publicEnvSchema.parse(raw);

  return {
    appUrl:
      parsed.NEXT_PUBLIC_APP_URL && parsed.NEXT_PUBLIC_APP_URL.length > 0
        ? parsed.NEXT_PUBLIC_APP_URL
        : "http://localhost:3000",
    mapStyleUrl:
      parsed.NEXT_PUBLIC_MAP_STYLE_URL &&
      parsed.NEXT_PUBLIC_MAP_STYLE_URL.length > 0
        ? parsed.NEXT_PUBLIC_MAP_STYLE_URL
        : "https://demotiles.maplibre.org/style.json",
  };
}

export const publicEnv = parsePublicEnv(process.env);

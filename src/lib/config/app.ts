import { publicEnv } from "@/lib/config/public-env";
import { serverEnv } from "@/lib/config/server-env";

export const appConfig = {
  name: "mealflo",
  appUrl: publicEnv.appUrl,
  mapStyleUrl: publicEnv.mapStyleUrl,
  integrations: [
    {
      id: "database",
      label: "Neon",
      ready: serverEnv.hasDatabase,
    },
    {
      id: "ai",
      label: "OpenAI",
      ready: serverEnv.hasOpenAi,
    },
    {
      id: "routing",
      label: "openrouteservice",
      ready: serverEnv.hasRouting,
    },
    {
      id: "maps",
      label: "Map style",
      ready: Boolean(publicEnv.mapStyleUrl),
    },
  ],
} as const;

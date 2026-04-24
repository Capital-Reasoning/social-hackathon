import { NextResponse } from "next/server";

import { appConfig } from "@/lib/config/app";
import { hasSeededData } from "@/server/mealflo/backend";

export async function GET() {
  const seeded = appConfig.integrations.some(
    (integration) => integration.id === "database" && integration.ready
  )
    ? await hasSeededData().catch(() => false)
    : false;

  return NextResponse.json({
    ok: true,
    integrations: appConfig.integrations,
    seeded,
  });
}

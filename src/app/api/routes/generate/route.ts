import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, generateRoutes } from "@/server/mealflo/backend";

export async function POST() {
  try {
    await ensureSeededData();

    return NextResponse.json({
      ok: true,
      data: await generateRoutes(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

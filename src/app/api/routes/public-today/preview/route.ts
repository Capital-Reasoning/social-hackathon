import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import {
  ensureSeededData,
  previewUnroutedPublicTodayRoutes,
} from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    await ensureSeededData();

    const payload = (await request.json().catch(() => ({}))) as {
      batchId?: string;
    };

    return NextResponse.json({
      ok: true,
      data: await previewUnroutedPublicTodayRoutes({
        batchId: payload.batchId,
      }),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

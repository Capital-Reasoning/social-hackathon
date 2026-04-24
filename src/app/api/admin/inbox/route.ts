import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, getAdminInboxData } from "@/server/mealflo/backend";

export async function GET() {
  try {
    await ensureSeededData();

    return NextResponse.json({
      ok: true,
      data: await getAdminInboxData(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

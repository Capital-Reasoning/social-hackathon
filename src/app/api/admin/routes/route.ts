import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, getAdminRoutesData } from "@/server/mealflo/backend";

export async function GET() {
  try {
    await ensureSeededData();

    return NextResponse.json({
      ok: true,
      data: await getAdminRoutesData(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

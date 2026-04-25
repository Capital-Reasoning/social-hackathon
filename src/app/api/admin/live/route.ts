import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, getAdminLiveData } from "@/server/mealflo/backend";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureSeededData();

    return NextResponse.json({
      ok: true,
      data: await getAdminLiveData(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

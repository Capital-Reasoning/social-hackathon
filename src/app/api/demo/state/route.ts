import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, getDemoState } from "@/server/mealflo/backend";

export async function GET() {
  try {
    await ensureSeededData();

    return NextResponse.json(await getDemoState());
  } catch (error) {
    return routeErrorResponse(error);
  }
}

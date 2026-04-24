import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, startDriverSession } from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    await ensureSeededData();
    const payload = await request.json();

    return NextResponse.json({
      ok: true,
      data: await startDriverSession(payload),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

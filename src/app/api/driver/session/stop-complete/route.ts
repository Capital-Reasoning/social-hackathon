import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { completeDriverStop } from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    return NextResponse.json({
      ok: true,
      data: await completeDriverStop(payload),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { markDraftOther } from "@/server/mealflo/backend";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    return NextResponse.json({
      ok: true,
      data: await markDraftOther(id),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

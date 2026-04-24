import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ignoreDraft, updateDraft } from "@/server/mealflo/backend";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    return NextResponse.json({
      ok: true,
      data: await updateDraft(id, await request.json()),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    return NextResponse.json({
      ok: true,
      data: await ignoreDraft(id),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

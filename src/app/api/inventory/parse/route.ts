import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { parseInventoryDocument } from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    return NextResponse.json({
      ok: true,
      data: await parseInventoryDocument(payload),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

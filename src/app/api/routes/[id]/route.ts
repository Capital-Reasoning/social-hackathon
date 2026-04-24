import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import {
  approveRoute,
  ensureSeededData,
  getRouteDetail,
} from "@/server/mealflo/backend";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeededData();

    const { id } = await context.params;

    return NextResponse.json({
      ok: true,
      data: await getRouteDetail(id),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSeededData();

    const { id } = await context.params;

    return NextResponse.json({
      ok: true,
      data: await approveRoute({ routeId: id }),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

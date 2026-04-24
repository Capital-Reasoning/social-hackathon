import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { seedDemoData } from "@/server/mealflo/backend";

export async function POST() {
  try {
    return NextResponse.json({
      ok: true,
      data: await seedDemoData(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

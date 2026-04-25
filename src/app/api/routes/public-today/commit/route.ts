import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import {
  commitUnroutedPublicTodayRoutes,
  ensureSeededData,
} from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    await ensureSeededData();

    const payload = await request.json().catch(() => ({}));
    const data = await commitUnroutedPublicTodayRoutes(payload);

    revalidatePath("/admin/routes");
    revalidatePath("/demo/admin");
    revalidatePath("/driver");
    revalidatePath("/demo/driver");

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

import { after, NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import {
  createRequestIntake,
  parsePublicIntakeDraft,
} from "@/server/mealflo/backend";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const data = await createRequestIntake(payload);

    after(() => {
      void parsePublicIntakeDraft(data.draftId).catch(() => undefined);
    });

    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

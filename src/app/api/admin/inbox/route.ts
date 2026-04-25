import { NextResponse } from "next/server";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { ensureSeededData, getAdminInboxData } from "@/server/mealflo/backend";
import { syncConfiguredGmailForAdminInbox } from "@/server/mealflo/gmail-ingest";

export async function GET(request: Request) {
  try {
    await ensureSeededData();

    const url = new URL(request.url);
    const draftId = url.searchParams.get("draft");
    const shouldForceSync = url.searchParams.get("sync") === "gmail";

    await syncConfiguredGmailForAdminInbox({ force: shouldForceSync });

    return NextResponse.json({
      ok: true,
      data: await getAdminInboxData(draftId),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { routeErrorResponse } from "@/app/api/_lib/responses";
import { serverEnv } from "@/lib/config/server-env";
import { createGmailIntake, gmailIntakeSchema } from "@/server/mealflo/backend";
import { ingestConfiguredGmailMessages } from "@/server/mealflo/gmail-ingest";

export const dynamic = "force-dynamic";

const stagedGmailPayloadSchema = z.object({
  messages: z.array(gmailIntakeSchema).min(1).optional(),
  mode: z.enum(["live", "staged"]).default("staged"),
});

function isAuthorized(request: Request) {
  if (!serverEnv.mealfloIngestSecret) {
    return serverEnv.nodeEnv !== "production";
  }

  const expected = serverEnv.mealfloIngestSecret;
  const authorization = request.headers.get("authorization");
  const token = request.headers.get("x-mealflo-ingest-secret");

  return authorization === `Bearer ${expected}` || token === expected;
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Unauthorized Gmail ingestion request.",
      ok: false,
    },
    { status: 401 }
  );
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    return NextResponse.json({
      ok: true,
      data: await ingestConfiguredGmailMessages(),
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return unauthorizedResponse();
    }

    const payload = stagedGmailPayloadSchema.parse(await request.json());

    if (payload.mode === "live") {
      return NextResponse.json({
        ok: true,
        data: await ingestConfiguredGmailMessages(),
      });
    }

    const messages = payload.messages ?? [];
    const results = [];

    for (const message of messages) {
      results.push(await createGmailIntake(message));
    }

    return NextResponse.json({
      ok: true,
      data: {
        created: results.filter((result) => result.action === "created").length,
        duplicates: results.filter((result) => result.action === "duplicate")
          .length,
        results,
        skipped: results.filter((result) => result.action === "skipped").length,
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}

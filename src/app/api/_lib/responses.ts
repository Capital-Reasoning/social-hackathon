import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function routeErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: "Validation failed",
        issues: error.flatten(),
      },
      { status: 400 }
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected backend error";

  return NextResponse.json(
    {
      ok: false,
      error: message,
    },
    { status: 500 }
  );
}

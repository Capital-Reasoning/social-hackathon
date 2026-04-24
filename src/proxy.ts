import { NextResponse, type NextRequest, userAgent } from "next/server";

const DRIVER_PATH_PREFIXES = ["/driver", "/api/driver"];

function isDriverPath(pathname: string) {
  return DRIVER_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isPhoneRequest(request: NextRequest) {
  const { device } = userAgent(request);

  return device.type === "mobile";
}

export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  if (!isPhoneRequest(request) || isDriverPath(nextUrl.pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/driver", request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\..*).*)",
  ],
};

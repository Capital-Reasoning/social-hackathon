import { NextResponse, type NextRequest, userAgent } from "next/server";

function isPhoneRequest(request: NextRequest) {
  const { device } = userAgent(request);

  return device.type === "mobile";
}

export function shouldRedirectPhoneRootToDriver(
  pathname: string,
  isPhone: boolean
) {
  return isPhone && pathname === "/";
}

export function proxy(request: NextRequest) {
  const { nextUrl } = request;

  if (
    !shouldRedirectPhoneRootToDriver(nextUrl.pathname, isPhoneRequest(request))
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/driver", request.url));
}

export const config = {
  matcher: ["/"],
};

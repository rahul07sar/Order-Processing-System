/**
 * Middleware that keeps signed-in users out of guest-only entry pages.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || "ops_session";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

  if (!sessionCookie) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/home", request.url));
}

export const config = {
  matcher: ["/login", "/registration"]
};

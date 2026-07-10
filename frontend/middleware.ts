/**
 * Middleware that keeps signed-in users out of guest-only entry pages.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME || process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME || "ops_session";

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie) {
    return false;
  }

  try {
    const response = await fetch(new URL("/api/auth/me", request.url), {
      headers: {
        cookie: request.headers.get("cookie") || ""
      },
      cache: "no-store"
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  if (!(await hasValidSession(request))) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/home", request.url));
}

export const config = {
  matcher: ["/login", "/registration"]
};

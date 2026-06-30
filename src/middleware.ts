import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

/**
 * AN Group ERP - Route Protection Middleware
 * Custom JWT stored in httpOnly cookie (an_token) or Authorization header
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes — no auth required
  const publicPrefixes = [
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/seed",
    "/api/sso/verify",
    "/invoice/verify",
    "/_next",
    "/favicon.ico",
    "/signature.png",
  ];

  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // Extract token from cookie or header
  const cookieToken = req.cookies.get("an_token")?.value;
  const authHeader = req.headers.get("Authorization");
  const headerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;
  const token = cookieToken || headerToken;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const user = verifyToken(token);
  if (!user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired token" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Inject user context into request headers for API handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email);
  requestHeaders.set("x-user-name", user.name);
  requestHeaders.set("x-user-role", user.role);
  requestHeaders.set("x-is-super-admin", user.isSuperAdmin ? "true" : "false");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

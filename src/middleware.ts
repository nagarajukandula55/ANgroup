import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

/**
 * AN Group ERP — Route Protection Middleware
 * Uses custom JWT (an_token cookie) — NOT NextAuth
 *
 * Super Admin bypass: SUPER_ADMIN role skips all business-level restrictions.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  /* ── Public routes — no auth needed ──────────────────────────────────── */
  const publicPrefixes = [
    "/login",
    "/register",
    "/api/auth",          // login / logout / refresh endpoints
    "/api/seed",          // first-run super admin seeding
    "/api/health",
    "/_next",
    "/favicon.ico",
    "/public",
  ];

  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  /* ── Extract & verify JWT from cookie ────────────────────────────────── */
  const token = req.cookies.get("an_token")?.value;

  if (!token) {
    // API routes → 401 JSON; page routes → redirect to login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = verifyToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  /* ── Inject user context as request headers ───────────────────────────── */
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.id);
  requestHeaders.set("x-user-name", payload.name);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-is-super-admin", payload.isSuperAdmin ? "true" : "false");

  if (payload.organizationId) {
    requestHeaders.set("x-organization-id", payload.organizationId);
  }

  // Super admin gets all business IDs available — no restriction
  if (payload.isSuperAdmin) {
    requestHeaders.set("x-super-admin-access", "true");
    // Still pass their business context if set
    if (payload.activeBusinessId) {
      requestHeaders.set("x-active-business-id", payload.activeBusinessId);
    }
    if (payload.businessIds?.length) {
      requestHeaders.set("x-business-ids", payload.businessIds.join(","));
    }
  } else {
    // Regular users — restrict to their assigned businesses
    if (payload.businessIds?.length) {
      requestHeaders.set("x-business-ids", payload.businessIds.join(","));
    }
    if (payload.activeBusinessId) {
      requestHeaders.set("x-active-business-id", payload.activeBusinessId);
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/* ── Matcher — apply to all pages and API routes ─────────────────────── */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

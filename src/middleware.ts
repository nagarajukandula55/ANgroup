import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

/**
 * =========================================================
 * ERP Route Protection Middleware — Custom JWT
 * =========================================================
 * 1. Reads `an_token` cookie or Authorization Bearer header
 * 2. Verifies the JWT and injects user headers for API routes
 * 3. Redirects unauthenticated users to /login
 * 4. Enforces role-based route access
 * =========================================================
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Public routes — no auth needed ────────────────────────
  const publicPrefixes = [
    "/login",
    "/register",
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/register",
    "/api/sso/verify",
    "/api/invoice/verify",
    "/api/invoice/view",
    "/_next",
    "/favicon.ico",
    "/fonts",
    "/images",
  ];

  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  // ── Extract token from cookie or Authorization header ─────
  const cookieToken = req.cookies.get("an_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  const token = cookieToken || bearerToken;

  // ── Verify token ──────────────────────────────────────────
  const payload = token ? verifyToken(token) : null;

  // Unauthenticated — redirect pages, return 401 for API
  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Role-based route access control ───────────────────────
  const role = payload.role;
  const isSuperAdmin = payload.isSuperAdmin;

  // Vendor-only routes
  if (pathname.startsWith("/vendor") && !pathname.startsWith("/vendor/layout")) {
    if (role !== "VENDOR" && !isSuperAdmin) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Admin-only routes (pages + API)
  const adminOnlyPaths = ["/admin/users", "/admin/access", "/admin/integrations", "/admin/roles", "/api/admin/"];
  if (adminOnlyPaths.some((p) => pathname.startsWith(p))) {
    if (!["SUPER_ADMIN", "ADMIN"].includes(role) && !isSuperAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // ── Inject user context headers for server components/routes
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", payload.id);
  requestHeaders.set("x-user-email", payload.email);
  requestHeaders.set("x-user-name", payload.name);
  requestHeaders.set("x-user-role", payload.role);
  requestHeaders.set("x-is-super-admin", String(payload.isSuperAdmin));
  if (payload.organizationId) {
    requestHeaders.set("x-organization-id", payload.organizationId);
  }
  if (payload.businessIds?.length > 0) {
    requestHeaders.set("x-business-ids", payload.businessIds.join(","));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * Apply middleware to all routes except static files
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|images).*)",
  ],
};

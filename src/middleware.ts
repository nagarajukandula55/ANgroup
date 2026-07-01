import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * AN Group ERP — Route Protection Middleware
 *
 * Uses `jose` for JWT verification — it is Web Crypto / Edge-runtime compatible.
 * `jsonwebtoken` uses Node.js crypto and CANNOT be used in Next.js middleware
 * (which runs on the Edge runtime).
 */

// Encode secret once at module level (TextEncoder works in Edge)
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "AN_GROUP_ENTERPRISE_SECRET"
);

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  businessIds: string[];
  activeBusinessId?: string;
  organizationId?: string;
}

async function verifyEdgeToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/* ── Public routes — no auth needed ──────────────────────────────────── */
const publicPrefixes = [
  "/login",
  "/register",
  "/api/auth",
  "/api/seed",
  "/api/health",
  "/_next",
  "/favicon.ico",
  "/public",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic = publicPrefixes.some((p) => pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  /* ── Extract & verify JWT from cookie ────────────────────────────────── */
  const token = req.cookies.get("an_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyEdgeToken(token);

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

  if (payload.isSuperAdmin) {
    requestHeaders.set("x-super-admin-access", "true");
    if (payload.activeBusinessId) {
      requestHeaders.set("x-active-business-id", payload.activeBusinessId);
    }
    if (payload.businessIds?.length) {
      requestHeaders.set("x-business-ids", payload.businessIds.join(","));
    }
  } else {
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

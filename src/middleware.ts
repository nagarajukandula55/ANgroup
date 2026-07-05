import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

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

/* ── Exact public paths (no auth needed, no header injection) ──────────── */
const PUBLIC_EXACT = new Set(["/login", "/register", "/favicon.ico"]);

/* ── Public prefixes ────────────────────────────────────────────────────── */
const PUBLIC_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/switch-business",   // reads its own cookie
  "/api/auth/exit-business",     // reads its own cookie
  "/api/auth/[...nextauth]",
  "/api/seed",
  "/api/health",
  "/api/ping",
  "/api/vendors/apply",          // public vendor application submission
  "/api/businesses/public",      // public business name lookup for the form
  "/vendor-apply",               // public vendor application form page
  "/_next",
  "/public",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  /* ── Extract & verify JWT from cookie ───────────────────────────────── */
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

  /* ── Inject user context headers ────────────────────────────────────── */
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id",       payload.id);
  requestHeaders.set("x-user-name",     payload.name);
  requestHeaders.set("x-user-email",    payload.email);
  requestHeaders.set("x-user-role",     payload.role);
  requestHeaders.set("x-is-super-admin", payload.isSuperAdmin ? "true" : "false");

  if (payload.organizationId)   requestHeaders.set("x-organization-id",   payload.organizationId);
  if (payload.activeBusinessId) requestHeaders.set("x-active-business-id", payload.activeBusinessId);
  if (payload.businessIds?.length) {
    requestHeaders.set("x-business-ids", payload.businessIds.join(","));
  }
  if (payload.isSuperAdmin) requestHeaders.set("x-super-admin-access", "true");

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

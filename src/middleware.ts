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
  // Native storefront integration — public, unauthenticated catalog
  // browsing routes (see ANGROUP_INTEGRATION_STATUS.md in the Native repo
  // for the gap these close). Deliberately separate paths from the
  // internal, auth-gated /api/products, /api/product-categories etc.
  "/api/categories",
  "/api/storefront/products",
  "/api/products/",
  "/_next",
  "/public",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/* ── CORS — cross-origin storefront frontends (e.g. Native) ─────────────
   an_token is an httpOnly cookie, so Access-Control-Allow-Origin must be
   an exact origin (never "*") with Access-Control-Allow-Credentials: true
   for the cookie to actually arrive on cross-origin requests. Kept as an
   explicit allow-list, same production domains payment/verify/route.ts
   already trusts, plus any localhost port for local Native dev. ───────── */
const CORS_ALLOWED_ORIGINS = [
  "https://shopnative.in",
  "https://www.shopnative.in",
  "https://angroup.in",
  "https://www.angroup.in",
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (CORS_ALLOWED_ORIGINS.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^http:\/\/localhost:\d+$/.test(origin)) return true;
  return false;
}

function applyCors(res: NextResponse, origin: string | null): NextResponse {
  if (isAllowedOrigin(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin as string);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-business-id");
    res.headers.set("Vary", "Origin");
  }
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const origin = req.headers.get("origin");

  // Preflight — answer directly, before any auth check, same as any other
  // CORS-aware API (this must never reach the JWT check, which would 401
  // an OPTIONS request that carries no cookie yet).
  if (req.method === "OPTIONS") {
    return applyCors(new NextResponse(null, { status: 204 }), origin);
  }

  if (isPublic(pathname)) return applyCors(NextResponse.next(), origin);

  /* ── Extract & verify JWT from cookie ───────────────────────────────── */
  const token = req.cookies.get("an_token")?.value;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return applyCors(NextResponse.json({ error: "Unauthorized" }, { status: 401 }), origin);
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyEdgeToken(token);

  if (!payload) {
    if (pathname.startsWith("/api/")) {
      return applyCors(NextResponse.json({ error: "Invalid token" }, { status: 401 }), origin);
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

  return applyCors(NextResponse.next({ request: { headers: requestHeaders } }), origin);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};

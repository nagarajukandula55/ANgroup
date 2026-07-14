import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Was a module-level throw -- same bug class as lib/auth/jwt.ts (see that
// file's comment): crashes the whole build the moment JWT_SECRET is
// missing at BUILD time, not just requests that need it at runtime.
// Resolved lazily instead.
function getEdgeSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
    );
  }
  return new TextEncoder().encode(secret);
}

interface JWTPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  isPlatformStaff?: boolean;
  businessIds: string[];
  activeBusinessId?: string;
  organizationId?: string;
  mustChangePassword?: boolean;
}

// Allowed while mustChangePassword is set -- everything else 403s/redirects
// until the user actually changes their password. Exact paths, not
// prefixes: the whole point is that nothing else is reachable.
const PASSWORD_CHANGE_ALLOWED = new Set([
  "/update-password",
  "/api/auth/change-password",
  "/api/auth/logout",
  "/api/auth/me",
]);

async function verifyEdgeToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEdgeSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

/* ── Exact public paths (no auth needed, no header injection) ──────────── */
// "/api/reviews" is EXACT, not a prefix -- the list/create route lives
// exactly there (src/app/api/reviews/route.ts). Its sibling
// /api/reviews/[id] (moderation, requires a real session) must NOT become
// public as a side effect of a prefix match -- using PUBLIC_EXACT rather
// than PUBLIC_PREFIXES for this one is what keeps that route protected.
const PUBLIC_EXACT = new Set(["/login", "/register", "/favicon.ico", "/api/reviews"]);

/* ── Public prefixes ────────────────────────────────────────────────────── */
const PUBLIC_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/switch-business",   // reads its own cookie
  "/api/auth/exit-business",     // reads its own cookie
  "/api/auth/[...nextauth]",
  // Both /request and the token-confirm route are public by design -- the
  // reset token itself is the auth mechanism, not the session cookie.
  "/api/auth/reset-password",
  "/api/health",
  "/api/ping",
  "/api/vendors/apply",          // public vendor application submission
  "/api/businesses/public",      // public business name lookup for the form
  "/vendor-apply",               // public vendor application form page
  // Guest checkout -- Order.customer is a standalone {name,phone,email}
  // sub-object independent of any userId, so an unauthenticated Native
  // visitor can check out without ever logging in (see checkout/page.tsx's
  // own comment on this). Neither route reads x-user-id/session identity
  // internally -- their real security boundary is cart/amount validation
  // (create) and the Razorpay HMAC signature check (verify) -- so gating
  // them behind the JWT cookie only broke guest checkout outright: every
  // unauthenticated order attempt 401'd before ever reaching the route.
  "/api/orders/create",
  "/api/payment/verify",
  // Guest order tracking (order-success page, /track) -- same guest-cart
  // reasoning as above. Looked up by orderId (an unguessable generated
  // string), not by user identity, so no auth is actually needed to view
  // your own order's status.
  "/api/orders/get-by-id",
  // Native storefront integration — public, unauthenticated catalog
  // browsing routes (see ANGROUP_INTEGRATION_STATUS.md in the Native repo
  // for the gap these close). Deliberately separate paths from the
  // internal, auth-gated /api/products, /api/product-categories etc.
  "/api/categories",
  "/api/storefront/products",
  "/api/storefront/categories",
  // Native storefront: public homepage hero-slideshow banners, managed via
  // the admin/business/[id]/banners UI instead of manually dropped image
  // files. Read-only; create/edit/delete stay behind /api/admin/banners.
  "/api/storefront/banners",
  // Mobile app (/mobile) launch-time config -- read-only, called before
  // the user is signed in. Editing lives at the separate, protected
  // /api/admin/mobile-app/config path (see that route's own comment for
  // why it's deliberately not this same path).
  "/api/mobile-app/config",
  "/api/products/",
  "/api/newsletter/subscribe",
  "/api/appointment-requests",   // public appointment-request submission
  "/appointment-request",        // public appointment-request form page
  // Native storefront: public blog listing (read-only; create/delete stay
  // behind the admin UI, which isn't reachable without a session anyway)
  // and the public contact-form submission endpoint.
  "/api/blog/list",
  "/api/contact",
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

  if (payload.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.has(pathname)) {
    if (pathname.startsWith("/api/")) {
      return applyCors(
        NextResponse.json(
          { success: false, message: "Password change required", mustChangePassword: true },
          { status: 403 }
        ),
        origin
      );
    }
    return NextResponse.redirect(new URL("/update-password", req.url));
  }

  /* ── Inject user context headers ────────────────────────────────────── */
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id",       payload.id);
  requestHeaders.set("x-user-name",     payload.name);
  requestHeaders.set("x-user-email",    payload.email);
  requestHeaders.set("x-user-role",     payload.role);
  requestHeaders.set("x-is-super-admin", payload.isSuperAdmin ? "true" : "false");
  // AN Group platform staff -- an account holding a platform-wide Role
  // (businessId/vendorId both null), same class of account as super admin
  // for cross-business VISIBILITY purposes (still gated per-module by
  // their actual granted permissions -- see api/auth/login's
  // isPlatformStaff computation and api/auth/me's mirror of it).
  requestHeaders.set("x-is-platform-staff", payload.isPlatformStaff ? "true" : "false");

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

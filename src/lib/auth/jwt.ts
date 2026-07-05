import jwt from "jsonwebtoken";

// Secrets are read lazily (inside the functions that use them) rather than at
// module load time. This module is imported by routes that only ever touch
// the standard auth token (e.g. /api/auth/login) — throwing here at import
// time for a missing SSO_SECRET would break every route that imports this
// file, even ones that never sign or verify an SSO token.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
    );
  }
  return secret;
}

function getSsoSecret(): string {
  const secret = process.env.SSO_SECRET;
  if (!secret) {
    throw new Error(
      "SSO_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
    );
  }
  return secret;
}

export interface JWTPayload {
  id: string;
  email: string;
  username?: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  businessIds: string[];
  activeBusinessId?: string;
  organizationId?: string;
  iat?: number;
  exp?: number;
}

export interface SSOPayload {
  userId: string;
  email: string;
  name: string;
  role: string;
  isSuperAdmin: boolean;
  permissions: string[];
  issuer: string;
  /**
   * Business tagging — every platform (Native e-commerce, other business
   * front-ends) consuming this SSO token gets the user's business scope,
   * so a vendor/staff login on any platform is automatically scoped to
   * the right business(es) in the centralized system.
   */
  businessIds?: string[];
  activeBusinessId?: string;
  memberType?: string; // e.g. VENDOR | STAFF | OWNER for the active business
  iat?: number;
  exp?: number;
}

/**
 * Sign a standard auth JWT (7 days)
 */
export function signToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "7d" });
}

/**
 * Verify and decode a standard auth JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Sign an SSO token (valid for 1 hour, cross-app)
 */
export function signSSOToken(payload: Omit<SSOPayload, "iat" | "exp">): string {
  return jwt.sign(payload, getSsoSecret(), { expiresIn: "1h" });
}

/**
 * Verify SSO token
 */
export function verifySSOToken(token: string): SSOPayload | null {
  try {
    return jwt.verify(token, getSsoSecret()) as SSOPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from request (Authorization header or cookie)
 */
export function extractToken(request: Request): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookie
  const cookieHeader = request.headers.get("Cookie");
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split("; ").map((c) => {
        const [k, ...v] = c.split("=");
        return [k, v.join("=")];
      })
    );
    return cookies["an_token"] || null;
  }

  return null;
}

/**
 * Get authenticated user from request
 */
export function getAuthUser(request: Request): JWTPayload | null {
  const token = extractToken(request);
  if (!token) return null;
  return verifyToken(token);
}

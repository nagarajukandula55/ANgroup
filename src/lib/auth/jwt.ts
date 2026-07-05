import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
  );
}
if (!process.env.SSO_SECRET) {
  throw new Error(
    "SSO_SECRET environment variable is required and must not use the insecure default. Set it before starting the app."
  );
}

const JWT_SECRET = process.env.JWT_SECRET;
const SSO_SECRET = process.env.SSO_SECRET;

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verify and decode a standard auth JWT
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

/**
 * Sign an SSO token (valid for 1 hour, cross-app)
 */
export function signSSOToken(payload: Omit<SSOPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SSO_SECRET, { expiresIn: "1h" });
}

/**
 * Verify SSO token
 */
export function verifySSOToken(token: string): SSOPayload | null {
  try {
    return jwt.verify(token, SSO_SECRET) as SSOPayload;
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

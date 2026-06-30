/**
 * Auth session helpers (custom JWT version)
 * Auth is now handled via custom JWT — see lib/auth/jwt.ts
 * This file is kept for reference; use getAuthUser() from jwt.ts instead.
 */
import User from "@/models/User";

/**
 * Full enriched session context for ERP
 */
export interface IAuthSession {
  user: {
    id: string;
    name: string;
    email: string;
  };

  organizationId?: string;
  businessId?: string;

  roles: string[];
  permissions: string[];
}

/**
 * Legacy stub — session is now provided by custom JWT middleware
 * Use req.headers.get('x-user-id') in API routes instead
 */
export async function getSession() {
  return null;
}

export async function getAuthSession(): Promise<IAuthSession | null> {
  return null;
}

/**
 * Check if user has permission
 */
export function hasPermission(
  session: IAuthSession | null,
  permission: string
): boolean {
  if (!session) return false;

  return session.permissions.includes(permission);
}

/**
 * Check if user has role
 */
export function hasRole(
  session: IAuthSession | null,
  role: string
): boolean {
  if (!session) return false;

  return session.roles.includes(role);
}

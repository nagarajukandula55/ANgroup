import { IAuthSession } from "@/lib/auth/session";

/**
 * CONVENTION MIGRATION — RESOLVED: every live requirePermission()/
 * requireAnyPermission() call site (11 total, across finance/audit/
 * logistics/inventory/purchase/organization/dashboard/analytics routes) has
 * been migrated to call core/access/actions.ts's buildPermissionCode()
 * instead of hand-typing lowercase-dot strings like "dashboard.view". That
 * function is the ONE place the "MODULEKEY.ACTIONKEY" naming convention is
 * defined, so every call site now derives its code from the same source the
 * module-registry/permission-sync system uses to generate grantable
 * permissions — no more drift between what a route checks for and what a
 * seeded module actually grants.
 *
 * hasPermission() below still normalizes case before comparing. This is now
 * pure defense-in-depth (tolerates any stray mixed-case permission code that
 * might exist in older stored session/role data) rather than a load-bearing
 * bridge between two live conventions — there is only one convention now.
 */
function hasPermission(session: IAuthSession, permission: string): boolean {
  const wanted = permission.toUpperCase();
  return session.permissions.some((p: string) => p.toUpperCase() === wanted);
}

/**
 * Generic permission guard for API routes
 */
export function requirePermission(
  session: IAuthSession | null,
  permission: string
) {
  if (!session?.user) {
    const error = new Error("Unauthorized");
    (error as any).code = "UNAUTHORIZED";
    throw error;
  }

  if (!hasPermission(session, permission)) {
    const error = new Error(
      `Forbidden: Missing permission -> ${permission}`
    );
    (error as any).code = "FORBIDDEN";
    throw error;
  }
}

/**
 * Require any permission (OR logic)
 */
export function requireAnyPermission(
  session: IAuthSession | null,
  permissions: string[]
) {
  if (!session?.user) {
    const error = new Error("Unauthorized");
    (error as any).code = "UNAUTHORIZED";
    throw error;
  }

  const ok = permissions.some((p) => hasPermission(session, p));

  if (!ok) {
    const error = new Error(
      `Forbidden: Requires one of -> ${permissions.join(
        ", "
      )}`
    );
    (error as any).code = "FORBIDDEN";
    throw error;
  }
}

/**
 * Require role (fallback check)
 */
export function requireRole(
  session: IAuthSession | null,
  role: string
) {
  if (!session?.user) {
    const error = new Error("Unauthorized");
    (error as any).code = "UNAUTHORIZED";
    throw error;
  }

  if (!session.roles.includes(role)) {
    const error = new Error(
      `Forbidden: Missing role -> ${role}`
    );
    (error as any).code = "FORBIDDEN";
    throw error;
  }
}

/**
 * Safe wrapper for API routes
 */
export async function withPermission<T>(
  session: IAuthSession | null,
  permission: string,
  fn: () => Promise<T>
): Promise<T> {
  requirePermission(session, permission);
  return await fn();
}

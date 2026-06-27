import { IAuthSession } from "@/lib/auth/session";

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

  if (!session.permissions.includes(permission)) {
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

  const ok = permissions.some((p) =>
    session.permissions.includes(p)
  );

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

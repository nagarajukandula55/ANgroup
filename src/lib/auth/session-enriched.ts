import { headers } from "next/headers";
import { getBusinessContext } from "./business-context";
import User from "@/models/User";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import RolePermission from "@/models/RolePermission";
import Permission from "@/models/Permission";

/**
 * =========================================================
 * ENRICHED ERP SESSION (SINGLE SOURCE OF TRUTH)
 * =========================================================
 * Reads user identity from request headers injected by the
 * custom JWT middleware (src/middleware.ts). The middleware
 * verifies the an_token cookie and injects:
 *   x-user-id, x-user-email, x-user-name,
 *   x-user-role, x-is-super-admin
 * =========================================================
 */

export interface IEnrichedSession {
  user: {
    id: string;
    name: string;
    email: string;
  };

  business: {
    businessId: string;
    organizationId: string;
    membershipId: string;
  } | null;

  roles: string[];
  permissions: string[];

  isSuperAdmin: boolean;
}

/**
 * Build full enriched session from JWT middleware headers.
 * Falls back to DB lookup for roles/permissions if business context exists.
 */
export async function getEnrichedSession(): Promise<IEnrichedSession | null> {
  const headersList = await headers();

  const userId = headersList.get("x-user-id");
  const userEmail = headersList.get("x-user-email");
  const userName = headersList.get("x-user-name") || "";
  const userRole = headersList.get("x-user-role") || "";
  const isSuperAdmin = headersList.get("x-is-super-admin") === "true";

  // Not authenticated — middleware didn't inject headers
  if (!userId || !userEmail) return null;

  // Try to get business context (sets businessId, organizationId, membershipId)
  let businessContext: Awaited<ReturnType<typeof getBusinessContext>> = null;
  try {
    businessContext = await getBusinessContext();
  } catch {
    // business-context not available in this request (e.g. no cookie)
  }

  // If no business context we still return a valid session with basic info
  if (!businessContext) {
    return {
      user: { id: userId, name: userName, email: userEmail },
      business: null,
      roles: userRole ? [userRole] : [],
      permissions: [],
      isSuperAdmin,
    };
  }

  // ── DB lookup for roles & permissions scoped to this user ──────────────
  let roles: string[] = userRole ? [userRole] : [];
  let permissions: string[] = [];

  try {
    const user = await User.findOne({ email: userEmail }).lean();

    if (user) {
      const userRoles = await UserRole.find({
        userId: (user as any)._id,
        isActive: true,
      }).lean();

      const roleIds = userRoles.map((r: any) => r.roleId);

      if (roleIds.length > 0) {
        const rolesDocs = await Role.find({ _id: { $in: roleIds } }).lean();
        roles = rolesDocs.map((r: any) => r.code);

        const rolePermissions = await RolePermission.find({
          roleId: { $in: roleIds },
        }).lean();

        const permissionIds = rolePermissions.map((p: any) => p.permissionId);

        if (permissionIds.length > 0) {
          const permissionDocs = await Permission.find({
            _id: { $in: permissionIds },
          }).lean();
          permissions = permissionDocs.map((p: any) => p.code);
        }
      }
    }
  } catch {
    // DB models may not be available; fall back to header-based role
    roles = userRole ? [userRole] : [];
  }

  return {
    user: { id: userId, name: userName, email: userEmail },
    business: {
      businessId: businessContext.businessId,
      organizationId: businessContext.organizationId,
      membershipId: businessContext.membershipId,
    },
    roles,
    permissions,
    isSuperAdmin,
  };
}

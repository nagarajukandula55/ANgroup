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

  // ── DB lookup for roles & permissions scoped to this user ──────────────
  // Was gated behind `if (!businessContext) return early`, so any user with
  // no active BusinessMember (every brand-new self-registered customer, by
  // definition) always resolved to permissions: [] regardless of whatever
  // UserRole rows they actually had. UserRole.businessId is optional, so this
  // lookup is intentionally businessId-agnostic -- only the `business` field
  // on the returned session stays conditional on business context.
  let roles: string[] = userRole ? [userRole] : [];
  let permissions: string[] = [];

  try {
    const user = await User.findOne({ email: userEmail }).lean();

    if (user) {
      // Was filtering on `isActive: true`, but UserRole has no `isActive`
      // field at all (see models/UserRole.ts) -- every query here matched
      // zero documents, for every user, unconditionally. This single line
      // silently broke permission resolution for the entire app: every
      // non-super-admin permission check has always resolved to an empty
      // `permissions` array and failed, since super-admin's unconditional
      // bypass in permission.guard.ts is the only thing that ever made a
      // requirePermission() call succeed in this codebase so far.
      const userRoles = await UserRole.find({
        userId: (user as any)._id,
      }).lean();

      const roleIds = userRoles.map((r: any) => r.roleId);

      if (roleIds.length > 0) {
        const rolesDocs = await Role.find({ _id: { $in: roleIds } }).lean();
        roles = rolesDocs.map((r: any) => r.code);

        // Two independent, non-overlapping permission storage conventions
        // exist in this codebase: the relational RolePermission -> Permission
        // join (queried below) and Role.permissions (a flat string[] set
        // directly via buildPermissionCode(), which is what every route
        // this session actually grants through -- e.g. the vendor "Full
        // Access" role, the coupons role, etc.). Reading only the relational
        // join meant any role using the flat-array convention (effectively
        // all of them) still resolved to zero permissions even after the
        // isActive fix above. Union both sources so neither convention is
        // silently ignored.
        const flatPermissions = rolesDocs.flatMap((r: any) =>
          Array.isArray(r.permissions) ? r.permissions : []
        );

        const rolePermissions = await RolePermission.find({
          roleId: { $in: roleIds },
        }).lean();

        const permissionIds = rolePermissions.map((p: any) => p.permissionId);

        let relationalPermissions: string[] = [];
        if (permissionIds.length > 0) {
          const permissionDocs = await Permission.find({
            _id: { $in: permissionIds },
          }).lean();
          relationalPermissions = permissionDocs.map((p: any) => p.code);
        }

        permissions = Array.from(new Set([...flatPermissions, ...relationalPermissions]));
      }
    }
  } catch {
    // DB models may not be available; fall back to header-based role
    roles = userRole ? [userRole] : [];
  }

  return {
    user: { id: userId, name: userName, email: userEmail },
    business: businessContext
      ? {
          businessId: businessContext.businessId,
          organizationId: businessContext.organizationId,
          membershipId: businessContext.membershipId,
        }
      : null,
    roles,
    permissions,
    isSuperAdmin,
  };
}

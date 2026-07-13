import { headers } from "next/headers";
import { getBusinessContext } from "./business-context";
import User from "@/models/User";
import Role from "@/models/Role";
import UserRole from "@/models/UserRole";
import RolePermission from "@/models/RolePermission";
import Permission from "@/models/Permission";
import Business from "@/models/Business";
import { expandWithAliases } from "@/core/access/moduleKeyAliases";

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
        let rolesDocs = await Role.find({ _id: { $in: roleIds } }).lean();

        // Self-heal: the base MANAGER role used to be seeded with
        // permissions: [] (see permissionSync.service.ts's syncManagerRole
        // -- "give me full access to manager roles"). An install created
        // before that fix has a MANAGER role stuck with zero permissions
        // until someone happens to re-run the module sync. Since this is
        // the actual per-request path every Manager's access flows
        // through, refresh it here the first time it's found empty rather
        // than requiring a separate manual trigger.
        const staleManager = rolesDocs.find((r: any) => r.code === "MANAGER" && (!r.permissions || r.permissions.length === 0));
        if (staleManager) {
          const { syncManagerRole } = await import("@/core/access/permissionSync.service");
          await syncManagerRole().catch(() => {});
          rolesDocs = await Role.find({ _id: { $in: roleIds } }).lean();
        }

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

  // Cross-check against the active business's enabled modules
  // (Business.modules[]) -- this was previously enforced ONLY at the
  // sidebar (api/ui/sidebar/route.ts intersects a role's permitted modules
  // with the business's enabled ones before deciding what to show), never
  // at actual API enforcement. A role granting e.g. "FINANCE.VIEW" could
  // still call the real finance API successfully even after a super admin
  // disabled the Finance module for that specific business -- the module
  // toggle was cosmetic (hid the nav link) rather than a real access
  // boundary. Super admins are exempt (requirePermission already bypasses
  // them unconditionally; filtering here would just be wasted work). An
  // empty/unconfigured modules[] means "no restriction yet", same
  // convention the sidebar route already uses, so a business that's never
  // touched this setting isn't suddenly locked out of everything.
  if (!isSuperAdmin && businessContext?.businessId && permissions.length > 0) {
    try {
      const business = await Business.findById(businessContext.businessId).select("modules").lean();
      const businessModules = Array.isArray((business as any)?.modules) ? (business as any).modules : [];
      if (businessModules.length > 0) {
        const rawEnabledKeys = businessModules
          .filter((m: any) => m?.enabled !== false)
          .map((m: any) => String(m?.key).toLowerCase());
        // Expand through the sidebar-key <-> real-permission-key alias map
        // (see moduleKeyAliases.ts) before uppercasing to match
        // buildPermissionCode's module-key casing -- otherwise a handful
        // of masters pages toggled "on" never actually matched their real
        // permission code's module key.
        const enabledKeys = new Set(
          Array.from(expandWithAliases(rawEnabledKeys)).map((k) => k.toUpperCase())
        );
        permissions = permissions.filter((code) => {
          const moduleKey = code.split(".")[0];
          return enabledKeys.has(moduleKey);
        });
      }
    } catch {
      // If this lookup fails, fall through with the unfiltered permission
      // list rather than breaking every permission check platform-wide.
    }
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

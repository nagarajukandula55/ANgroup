import { auth } from "./auth";
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
}

/**
 * Build full enriched session
 */
export async function getEnrichedSession(): Promise<IEnrichedSession | null> {
  const session = await auth();

  if (!session?.user?.email) return null;

  const user = await User.findOne({
    email: session.user.email,
  });

  if (!user) return null;

  const businessContext = await getBusinessContext();

  if (!businessContext) {
    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      business: null,
      roles: [],
      permissions: [],
    };
  }

  /**
   * USER ROLES
   */
  const userRoles = await UserRole.find({
    userId: user._id,
    isActive: true,
  });

  const roleIds = userRoles.map((r) => r.roleId);

  const roles = await Role.find({
    _id: { $in: roleIds },
  });

  /**
   * ROLE PERMISSIONS
   */
  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds },
  });

  const permissionIds = rolePermissions.map(
    (p) => p.permissionId
  );

  const permissions = await Permission.find({
    _id: { $in: permissionIds },
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },

    business: {
      businessId: businessContext.businessId,
      organizationId: businessContext.organizationId,
      membershipId: businessContext.membershipId,
    },

    roles: roles.map((r) => r.code),

    permissions: permissions.map((p) => p.code),
  };
}

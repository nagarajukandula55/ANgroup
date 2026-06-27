import { auth } from "./auth";
import User from "@/models/User";
import BusinessMember from "@/models/BusinessMember";
import RolePermission from "@/models/RolePermission";
import UserRole from "@/models/UserRole";
import Role from "@/models/Role";
import Permission from "@/models/Permission";
import { Types } from "mongoose";

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
 * Get raw Auth.js session
 */
export async function getSession() {
  return await auth();
}

/**
 * Build enriched ERP session with roles + permissions
 */
export async function getAuthSession(): Promise<IAuthSession | null> {
  const session = await auth();

  if (!session?.user?.email) return null;

  const user = await User.findOne({
    email: session.user.email,
    isDeleted: false,
  });

  if (!user) return null;

  /**
   * Get active business membership
   */
  const membership = await BusinessMember.findOne({
    userId: user._id,
    isDeleted: false,
    status: "ACTIVE",
  });

  const businessId = membership?.businessId?.toString();
  const organizationId = membership?.organizationId?.toString();

  /**
   * Get user roles in this business
   */
  const userRoles = await UserRole.find({
    userId: user._id,
    businessMemberId: membership?._id,
    isActive: true,
  });

  const roleIds = userRoles.map((r) => r.roleId);

  const roles = await Role.find({
    _id: { $in: roleIds },
  });

  /**
   * Get permissions from roles
   */
  const rolePermissions = await RolePermission.find({
    roleId: { $in: roleIds },
  });

  const permissionIds = rolePermissions.map((rp) => rp.permissionId);

  const permissions = await Permission.find({
    _id: { $in: permissionIds },
  });

  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    },

    organizationId,
    businessId,

    roles: roles.map((r) => r.code),

    permissions: permissions.map((p) => p.code),
  };
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

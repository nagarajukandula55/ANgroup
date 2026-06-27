import Role, { RoleType, RoleStatus } from "@/models/Role";
import Permission from "@/models/Permission";
import RolePermission from "@/models/RolePermission";
import { Types } from "mongoose";

/**
 * System Roles Definition
 * These are the backbone of ERP access control
 */
export const SYSTEM_ROLES = [
  {
    name: "Super Admin",
    code: "SUPER_ADMIN",
    description: "Full system access",
  },
  {
    name: "Business Owner",
    code: "BUSINESS_OWNER",
    description: "Owns business and has full control over it",
  },
  {
    name: "Admin",
    code: "ADMIN",
    description: "Administrative access within business",
  },
  {
    name: "Purchase Manager",
    code: "PURCHASE_MANAGER",
    description: "Handles purchase operations",
  },
  {
    name: "Inventory Manager",
    code: "INVENTORY_MANAGER",
    description: "Manages inventory operations",
  },
  {
    name: "Finance Manager",
    code: "FINANCE_MANAGER",
    description: "Handles finance and approvals",
  },
];

/**
 * Seed system roles and attach permissions
 */
export async function seedRoles(organizationId: string) {
  const permissions = await Permission.find({});

  const permissionMap = new Map(
    permissions.map((p) => [p.code, p._id])
  );

  const results: any[] = [];

  for (const role of SYSTEM_ROLES) {
    const createdRole = await Role.updateOne(
      {
        code: role.code,
        organizationId: new Types.ObjectId(organizationId),
      },
      {
        $setOnInsert: {
          organizationId: new Types.ObjectId(organizationId),
          name: role.name,
          code: role.code,
          description: role.description,
          type: RoleType.SYSTEM,
          status: RoleStatus.ACTIVE,
          isDefault: role.code === "BUSINESS_OWNER",
          isProtected: true,
        },
      },
      { upsert: true }
    );

    const roleDoc = await Role.findOne({
      code: role.code,
      organizationId: organizationId,
    });

    if (!roleDoc) continue;

    /**
     * Role → Permission mapping rules
     */
    const rolePermissions: string[] = [];

    switch (role.code) {
      case "SUPER_ADMIN":
        rolePermissions.push(...permissions.map((p) => p.code));
        break;

      case "BUSINESS_OWNER":
        rolePermissions.push(
          ...permissions
            .filter((p) => !p.code.startsWith("settings"))
            .map((p) => p.code)
        );
        break;

      case "ADMIN":
        rolePermissions.push(
          "users.view",
          "roles.view",
          "purchase.view",
          "inventory.view",
          "vendor.view",
          "finance.view"
        );
        break;

      case "PURCHASE_MANAGER":
        rolePermissions.push(
          "purchase.create",
          "purchase.view",
          "purchase.approve"
        );
        break;

      case "INVENTORY_MANAGER":
        rolePermissions.push(
          "inventory.manage",
          "inventory.view",
          "inventory.transfer"
        );
        break;

      case "FINANCE_MANAGER":
        rolePermissions.push(
          "finance.view",
          "finance.approve"
        );
        break;
    }

    /**
     * Assign permissions
     */
    const rolePermissionOps = rolePermissions
      .filter((code) => permissionMap.has(code))
      .map((code) => ({
        updateOne: {
          filter: {
            roleId: roleDoc._id,
            permissionId: permissionMap.get(code),
          },
          update: {
            $setOnInsert: {
              roleId: roleDoc._id,
              permissionId: permissionMap.get(code),
            },
          },
          upsert: true,
        },
      }));

    if (rolePermissionOps.length > 0) {
      await RolePermission.bulkWrite(rolePermissionOps);
    }

    results.push({
      role: role.code,
      permissions: rolePermissions.length,
    });
  }

  return {
    success: true,
    roles: results,
  };
}

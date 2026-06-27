import Permission, {
  PermissionType,
  PermissionStatus,
} from "@/models/Permission";

/**
 * Core system permissions for AN GROUP ERP
 * These are stable identifiers used across the entire system
 */
export const SYSTEM_PERMISSIONS = [
  /* ================= USERS ================= */
  { module: "users", group: "Users", name: "Create User", code: "users.create" },
  { module: "users", group: "Users", name: "Edit User", code: "users.edit" },
  { module: "users", group: "Users", name: "Delete User", code: "users.delete" },
  { module: "users", group: "Users", name: "View Users", code: "users.view" },

  /* ================= ROLES ================= */
  { module: "roles", group: "Roles", name: "Create Role", code: "roles.create" },
  { module: "roles", group: "Roles", name: "Edit Role", code: "roles.edit" },
  { module: "roles", group: "Roles", name: "Delete Role", code: "roles.delete" },
  { module: "roles", group: "Roles", name: "View Roles", code: "roles.view" },

  /* ================= PERMISSIONS ================= */
  { module: "permissions", group: "Permissions", name: "View Permissions", code: "permissions.view" },

  /* ================= PURCHASE ================= */
  { module: "purchase", group: "Purchase", name: "Create Purchase Order", code: "purchase.create" },
  { module: "purchase", group: "Purchase", name: "Approve Purchase Order", code: "purchase.approve" },
  { module: "purchase", group: "Purchase", name: "View Purchase Orders", code: "purchase.view" },

  /* ================= INVENTORY ================= */
  { module: "inventory", group: "Inventory", name: "Manage Inventory", code: "inventory.manage" },
  { module: "inventory", group: "Inventory", name: "View Inventory", code: "inventory.view" },
  { module: "inventory", group: "Inventory", name: "Transfer Stock", code: "inventory.transfer" },

  /* ================= VENDORS ================= */
  { module: "vendors", group: "Vendors", name: "Manage Vendors", code: "vendor.manage" },
  { module: "vendors", group: "Vendors", name: "View Vendors", code: "vendor.view" },

  /* ================= FINANCE ================= */
  { module: "finance", group: "Finance", name: "View Finance Data", code: "finance.view" },
  { module: "finance", group: "Finance", name: "Approve Payments", code: "finance.approve" },

  /* ================= SETTINGS ================= */
  { module: "settings", group: "Settings", name: "Manage Settings", code: "settings.manage" },
];

/**
 * Seed permissions into database (idempotent)
 */
export async function seedPermissions() {
  for (const perm of SYSTEM_PERMISSIONS) {
    await Permission.updateOne(
      { code: perm.code },
      {
        $setOnInsert: {
          module: perm.module,
          group: perm.group,
          name: perm.name,
          code: perm.code,
          type: PermissionType.SYSTEM,
          status: PermissionStatus.ACTIVE,
          isProtected: true,
        },
      },
      { upsert: true }
    );
  }

  return {
    success: true,
    count: SYSTEM_PERMISSIONS.length,
  };
}

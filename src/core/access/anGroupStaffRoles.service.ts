import Role, { RoleType, RoleStatus } from "@/models/Role";
import { buildPermissionCode } from "./actions";

/**
 * AN Group's own platform-staff roles -- distinct from a business's
 * per-tenant roles and from a vendor's per-vendor roles (see
 * vendorDefaultRoles.service.ts for that pattern, which this mirrors).
 * These are cross-business: businessId is deliberately null (same
 * "AN_GROUP" platform-wide convention as DocumentNumberConfig/Integration),
 * and since session-enriched.ts's UserRole lookup is NOT businessId-scoped
 * (it unions permission codes from every role a user holds, regardless of
 * which businessId that role belongs to -- confirmed by reading that file),
 * a user holding one of these roles gets that permission code everywhere,
 * across every business, without needing per-business grants.
 */

type ActionKey =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "approve"
  | "manage_settings";

const ALL_ACTIONS: ActionKey[] = ["view", "create", "edit", "delete", "export", "approve", "manage_settings"];

interface AnGroupRoleDef {
  code: string;
  name: string;
  description: string;
  modules: string[];
  actions: ActionKey[];
}

export const AN_GROUP_ROLE_DEFS: AnGroupRoleDef[] = [
  {
    code: "AN_BUSINESS_ADMIN",
    name: "Business Admin",
    description: "Creates and updates businesses, onboards and approves vendors.",
    modules: ["businesses", "vendors"],
    actions: ALL_ACTIONS,
  },
  {
    code: "AN_PRODUCT_ADMIN",
    name: "Product Admin",
    description: "Reviews and approves product submissions from every vendor.",
    modules: ["products", "vendor_products"],
    actions: ALL_ACTIONS,
  },
  {
    code: "AN_SALES_ADMIN",
    name: "Sales Admin",
    description: "Oversees all sales, orders, and related invoicing across every business.",
    modules: ["sales", "orders", "invoices", "coupons"],
    actions: ALL_ACTIONS,
  },
  {
    code: "AN_MATERIAL_ADMIN",
    name: "Material Admin",
    description: "Manages materials, warehouse configuration, and stock maintenance.",
    modules: ["inventory", "materials", "warehouses", "stock_adjustments", "stock_transfers"],
    actions: ALL_ACTIONS,
  },
  {
    code: "AN_FINANCE_ADMIN",
    name: "Finance Admin",
    description: "Oversees the finance team's records, invoices, and settlements.",
    modules: ["finance", "vendor_settlements"],
    actions: ALL_ACTIONS,
  },
  {
    code: "AN_SCM_ADMIN",
    name: "SCM Admin",
    description: "Manages supply chain and logistics across every business.",
    modules: ["logistics", "scm"],
    actions: ALL_ACTIONS,
  },
];

function permissionCodesFor(modules: string[], actions: ActionKey[]): string[] {
  const codes: string[] = [];
  for (const moduleKey of modules) {
    for (const action of actions) {
      codes.push(buildPermissionCode(moduleKey, action));
    }
  }
  return codes;
}

/**
 * Idempotent upsert of all 6 AN Group staff roles -- safe to call more than
 * once (e.g. to pick up a definition change above); existing role docs get
 * their permission set refreshed via $set, never duplicated.
 */
export async function seedAnGroupStaffRoles(): Promise<{ code: string; name: string; roleId: string }[]> {
  const results: { code: string; name: string; roleId: string }[] = [];
  for (const def of AN_GROUP_ROLE_DEFS) {
    const codes = permissionCodesFor(def.modules, def.actions);
    const role = await Role.findOneAndUpdate(
      { code: def.code, businessId: null, vendorId: null },
      {
        $setOnInsert: {
          code: def.code,
          businessId: null,
          vendorId: null,
          name: def.name,
          description: def.description,
          type: RoleType.SYSTEM,
          status: RoleStatus.ACTIVE,
          isSystem: true,
          isProtected: true,
        },
        $set: { permissions: codes },
      },
      { upsert: true, new: true }
    );
    results.push({ code: def.code, name: def.name, roleId: String(role._id) });
  }
  return results;
}

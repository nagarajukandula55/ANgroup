import Business from "@/models/Business";
import Role, { RoleType, RoleStatus } from "@/models/Role";
import { buildPermissionCode } from "./actions";

/**
 * Fixed default role set every vendor gets the moment it's approved
 * (finalized), scoped to that one vendor via {businessId, vendorId}. A
 * vendor's own team-management screen can only assign from these 11 roles
 * (see the vendorId-scoped Role.find() restriction used there) — it can
 * never invent a new role or grant access beyond this set.
 *
 * Module scope for each role is intersected with the modules actually
 * enabled on the vendor's Business (Business.modules[], filtered to
 * enabled !== false) so a business with fewer enabled modules produces a
 * correspondingly smaller permission set — never grants access to a module
 * the business itself doesn't have turned on.
 */

type ActionKey =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "export"
  | "approve"
  | "manage_settings";

const ALL_ACTIONS: ActionKey[] = [
  "view",
  "create",
  "edit",
  "delete",
  "export",
  "approve",
  "manage_settings",
];
const ALL_EXCEPT_EDIT = ALL_ACTIONS.filter((a) => a !== "edit");
const VIEW_CREATE: ActionKey[] = ["view", "create"];
const VIEW_ONLY: ActionKey[] = ["view"];
const VIEW_EDIT: ActionKey[] = ["view", "edit"];

interface VendorRoleDef {
  code: string;
  name: string;
  description: string;
  /** "*" = every module enabled on the business. */
  modules: string[] | "*";
  actions: ActionKey[];
}

const VENDOR_ROLE_DEFS: VendorRoleDef[] = [
  { code: "VENDOR_OWNER", name: "Owner", description: "Full access to every module enabled for this business.", modules: "*", actions: ALL_ACTIONS },
  { code: "VENDOR_MANAGER", name: "Manager", description: "Full access except editing existing records (reserved for Owner).", modules: "*", actions: ALL_EXCEPT_EDIT },
  { code: "VENDOR_FINANCE_MANAGER", name: "Finance Manager", description: "Full access to finance modules/reports.", modules: ["finance"], actions: ALL_ACTIONS },
  { code: "VENDOR_FINANCE_ASSISTANT", name: "Finance Assistant", description: "View and create access to finance records.", modules: ["finance"], actions: VIEW_CREATE },
  { code: "VENDOR_WAREHOUSE_MANAGER", name: "Warehouse Manager", description: "Full access to orders, inventory, products and stock adjustments.", modules: ["orders", "inventory", "products", "vendor_products", "stock_adjustments"], actions: ALL_ACTIONS },
  { code: "VENDOR_ASSISTANT_MANAGER", name: "Assistant Manager", description: "View and create access, same module scope as Manager.", modules: "*", actions: VIEW_CREATE },
  { code: "VENDOR_WAREHOUSE_SCM", name: "Warehouse SCM", description: "Full access to logistics and orders.", modules: ["logistics", "orders"], actions: ALL_ACTIONS },
  { code: "VENDOR_WAREHOUSE_HELPER", name: "Warehouse Helper", description: "View and create access to orders only.", modules: ["orders"], actions: VIEW_CREATE },
  { code: "VENDOR_DELIVERY", name: "Delivery", description: "View orders/logistics and update delivery status.", modules: ["orders", "logistics"], actions: VIEW_EDIT },
  { code: "VENDOR_FRONT_OFFICE", name: "Front Office", description: "Full access to CRM (appointments/workorders); view-only stock check in inventory.", modules: ["crm"], actions: ALL_ACTIONS, },
  { code: "VENDOR_ENGINEER", name: "Engineer", description: "Full access to CRM (appointments/workorders) and inventory.", modules: ["crm", "inventory"], actions: ALL_ACTIONS },
];

// Front Office additionally gets view-only inventory access, on top of full
// CRM access above — expressed as a second module entry since it has a
// different action set than the role's primary module scope.
const FRONT_OFFICE_EXTRA_MODULES: { modules: string[]; actions: ActionKey[] } = {
  modules: ["inventory"],
  actions: VIEW_ONLY,
};

// Every module key "*" could plausibly expand to -- the safe superset used
// when a business hasn't configured Business.modules[] yet (see intersect()
// below). Built from every module referenced anywhere in VENDOR_ROLE_DEFS/
// FRONT_OFFICE_EXTRA_MODULES, so it can never fall out of sync with the
// roles actually defined above.
const ALL_REFERENCED_MODULES: string[] = Array.from(
  new Set(
    VENDOR_ROLE_DEFS.flatMap((def) => (def.modules === "*" ? [] : def.modules)).concat(
      FRONT_OFFICE_EXTRA_MODULES.modules
    )
  )
);

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
 * Creates/updates the 11 default vendor roles for one vendor, scoped to
 * {businessId, vendorId}. Safe to call more than once (idempotent upsert) —
 * re-running after a vendor's business enables/disables a module keeps the
 * role's permission set current rather than leaving it stale.
 */
export async function createDefaultVendorRoles(
  vendorProfileId: string,
  businessId: string
): Promise<void> {
  const business = await Business.findById(businessId).lean<any>();
  const businessModules = Array.isArray(business?.modules) ? business.modules : [];
  const enabledKeys = businessModules.length
    ? new Set(
        businessModules
          .filter((m: any) => m?.enabled !== false)
          .map((m: any) => m?.key)
      )
    : null; // null = no restriction configured yet, matches sidebar route's convention

  const intersect = (moduleKeys: string[] | "*"): string[] => {
    if (moduleKeys === "*") {
      // "all enabled modules" -- if the business HAS configured a
      // restriction, use exactly that set; if it hasn't (the common case
      // for a business that's never touched that setting), fall back to
      // every seeded module key referenced anywhere in this role set as a
      // safe superset, so Owner/Manager/Assistant Manager still actually
      // get real permissions instead of silently ending up with none.
      // (This was previously backwards: it returned [] -- zero modules,
      // zero permissions -- for exactly the unconfigured case the comment
      // said it should handle, which is why a freshly-onboarded vendor's
      // Owner could be granted the role yet be forbidden from every
      // action, e.g. 403'ing on vendor_products.create when adding a
      // product for the first time.)
      return enabledKeys ? Array.from(enabledKeys as Set<string>) : ALL_REFERENCED_MODULES;
    }
    return enabledKeys
      ? moduleKeys.filter((k) => (enabledKeys as Set<string>).has(k))
      : moduleKeys;
  };

  for (const def of VENDOR_ROLE_DEFS) {
    const scopedModules = intersect(def.modules);
    let codes = permissionCodesFor(scopedModules, def.actions);

    if (def.code === "VENDOR_FRONT_OFFICE") {
      const extraModules = intersect(FRONT_OFFICE_EXTRA_MODULES.modules);
      codes = Array.from(
        new Set([...codes, ...permissionCodesFor(extraModules, FRONT_OFFICE_EXTRA_MODULES.actions)])
      );
    }

    await Role.updateOne(
      { code: def.code, businessId, vendorId: vendorProfileId },
      {
        $setOnInsert: {
          code: def.code,
          businessId,
          vendorId: vendorProfileId,
          name: def.name,
          description: def.description,
          type: RoleType.SYSTEM,
          status: RoleStatus.ACTIVE,
          isSystem: true,
          isProtected: true,
        },
        $set: { permissions: codes },
      },
      { upsert: true }
    );
  }
}

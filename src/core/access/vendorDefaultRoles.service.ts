import Business from "@/models/Business";
import Role, { RoleType, RoleStatus } from "@/models/Role";
import { buildPermissionCode } from "./actions";
import { expandWithAliases } from "./moduleKeyAliases";

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
// Real operational module keys not referenced by any single vendor role
// def's explicit module list, but that Owner/Manager/Assistant Manager's
// "*" wildcard should still cover when a business hasn't configured
// Business.modules[] at all yet (the safe-superset fallback below) --
// masters pages (fault codes, solutions, product/material categories,
// device models) plus vendor products, GST, and storefront-adjacent
// modules (banners/blog/reviews) a vendor Owner legitimately needs.
const EXTRA_OWNER_MODULES = [
  "fault_codes",
  "symptom_codes",
  "solutions",
  "product_categories",
  "material_categories",
  "device_models",
  "units",
  "crm_options",
  "vendor_products",
  "gst",
  "grn",
  "staff",
  "banners",
  "blog",
  "reviews",
];

const ALL_REFERENCED_MODULES: string[] = Array.from(
  new Set(
    VENDOR_ROLE_DEFS.flatMap((def) => (def.modules === "*" ? [] : def.modules))
      .concat(FRONT_OFFICE_EXTRA_MODULES.modules)
      .concat(EXTRA_OWNER_MODULES)
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
  // DENY-list, not allow-list: a module key this business's modules[] has
  // never heard of (true for most keys, for most businesses -- most were
  // added to the platform after most businesses' modules[] was last
  // saved) must stay granted, not silently drop out. Building an
  // allow-list from "whatever happens to be in the array" was the same
  // bug fixed in session-enriched.ts's own module-enabled filter: a
  // freshly-added module (assets/customers/designs/employees/solutions/
  // crm/settings/integrations/users/roles/access/gst/...) was invisible
  // to every vendor's Owner/Manager role until that business's admin
  // happened to re-open and re-save Business > Modules.
  const disabledKeys = businessModules.length
    ? expandWithAliases(
        businessModules
          .filter((m: any) => m?.enabled === false)
          .map((m: any) => String(m?.key))
      )
    : new Set<string>();

  const intersect = (moduleKeys: string[] | "*"): string[] => {
    if (moduleKeys === "*") {
      // "every module this role should reach" -- the safe superset of
      // every module key referenced anywhere in this role set, minus
      // anything this business has explicitly disabled.
      //
      // EXTRA_OWNER_MODULES (masters lists, GST, vendor products, staff,
      // storefront content) are always unioned in -- these were never
      // presented as toggleable business-feature checkboxes in the first
      // place (no sidebar entry existed to toggle them), so a business
      // owner had no way to "enable" them even though Owner/Manager
      // fundamentally need them to run their own portal.
      return Array.from(new Set([...ALL_REFERENCED_MODULES, ...EXTRA_OWNER_MODULES])).filter(
        (k) => !disabledKeys.has(k)
      );
    }
    return moduleKeys.filter((k) => !disabledKeys.has(k));
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

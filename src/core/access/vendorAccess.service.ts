/**
 * Vendor staff access — the ONE mechanism by which a vendor's Owner or
 * Manager grants working access to their team, per the final access
 * architecture:
 *
 *   AN Group (platform)
 *     └─ Businesses (each with its own enabled-module selection)
 *          └─ Vendors (Owner structural via VendorProfile.userId;
 *             Manager granted; Super Admin attaches users to the team)
 *               └─ Staff (granted one or MANY module accesses by the
 *                  vendor's Owner/Manager from the vendor profile page)
 *
 * Instead of a fixed laundry list of pre-baked roles, each staff member
 * gets a PERSONAL role document (code `VSTAFF_<userId>`, scoped to
 * {businessId, vendorId}) whose permission set is derived directly from
 * the module checkboxes the Owner/Manager ticked. Granting/revoking is a
 * single upsert; the existing enforcement chain (UserRole -> Role ->
 * session permissions -> requirePermission) is completely unchanged, so
 * every API/permission fix made this session keeps applying as-is.
 */
import Role, { RoleStatus, RoleType } from "@/models/Role";
import UserRole from "@/models/UserRole";
import VendorProfile from "@/models/VendorProfile";
import BusinessMember from "@/models/BusinessMember";
import Business from "@/models/Business";
import { buildPermissionCode, STANDARD_ACTIONS } from "./actions";
import { ACCESS_HIERARCHY, ModuleEntry } from "./moduleHierarchy";
import { expandWithAliases } from "./moduleKeyAliases";
import { stripFloorRoles } from "./floorRoles.service";

/** Modules a vendor's team can ever be granted — operational modules only.
 * Platform/administration modules (businesses, users, roles, access,
 * settings, integrations, HR, customers-at-large, coupons) are deliberately
 * excluded: those belong to AN Group / business administration, never to a
 * vendor's staff, no matter what a business has enabled. */
export const VENDOR_MODULE_KEYS = [
  "sales",
  "reviews",
  "inventory",
  "products",
  "product_categories",
  "materials",
  "bom",
  "grn",
  "warehouses",
  "stock_transfers",
  "stock_adjustments",
  "purchase",
  "vendor_products",
  "logistics",
  "finance",
  "gst",
  "crm",
  "crm_calls",
  "crm_jobsheets",
  "fault_codes",
  "solutions",
  "banners",
  "blog",
  "staff",
] as const;

const ALL_ACTION_KEYS = STANDARD_ACTIONS.map((a) => a.key);

function flattenHierarchy(): ModuleEntry[] {
  const out: ModuleEntry[] = [];
  for (const cat of ACCESS_HIERARCHY) {
    for (const m of cat.modules ?? []) out.push(m);
    for (const sc of cat.subcategories ?? []) out.push(...sc.modules);
  }
  return out;
}

/**
 * The modules a vendor under `businessId` can be granted: the vendor
 * module set, minus anything this business has EXPLICITLY disabled in
 * Business > Modules (deny-list convention — a key the business's saved
 * modules[] has never heard of stays available; see session-enriched.ts's
 * matching filter for why absent must never mean disabled).
 */
export async function getVendorAvailableModules(businessId: string): Promise<ModuleEntry[]> {
  const business = await Business.findById(businessId).select("modules").lean<any>();
  const businessModules = Array.isArray(business?.modules) ? business.modules : [];
  const disabled = expandWithAliases(
    businessModules
      .filter((m: any) => m?.enabled === false)
      .map((m: any) => String(m?.key).toLowerCase())
  );

  const vendorKeys = new Set<string>(VENDOR_MODULE_KEYS);
  return flattenHierarchy().filter((m) => vendorKeys.has(m.key) && !disabled.has(m.key));
}

function permissionCodesForModules(modules: string[]): string[] {
  const codes: string[] = [];
  for (const moduleKey of modules) {
    for (const action of ALL_ACTION_KEYS) {
      codes.push(buildPermissionCode(moduleKey, action));
    }
  }
  return codes;
}

/**
 * The two structural vendor roles — Owner and Manager. Owner is whoever
 * can log in AS the vendor (VendorProfile.userId); Manager is granted by
 * the Owner (or Super Admin) and can do everything the Owner can inside
 * the vendor portal, including managing staff access. Both get full
 * access to every module available to this vendor's business.
 *
 * This REPLACES the old 11-role generated set (Finance Assistant,
 * Warehouse Helper, Front Office, Engineer, ...) — per the rebuilt
 * architecture, staff access is granted per-module per-user by the
 * vendor, not picked from a fixed menu of job titles.
 */
export async function ensureVendorCoreRoles(vendorProfileId: string, businessId: string): Promise<void> {
  const available = await getVendorAvailableModules(businessId);
  const codes = permissionCodesForModules(available.map((m) => m.key));

  for (const def of [
    { code: "VENDOR_OWNER", name: "Owner", description: "Full access to every module available to this vendor." },
    { code: "VENDOR_MANAGER", name: "Manager", description: "Full access, including managing staff and their access." },
  ]) {
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
        // Refreshed on every call so an already-onboarded vendor's
        // Owner/Manager tracks the business's current module selection.
        $set: { permissions: codes },
      },
      { upsert: true }
    );
  }
}

const STAFF_ROLE_PREFIX = "VSTAFF_";

/**
 * Grant (or update) a staff member's access: `modules` is exactly the set
 * of module keys this user should hold — a single access or many
 * ("vendor can give either single access to user or multiple access").
 * Passing an empty array revokes everything. `isManager` grants/revokes
 * the vendor's Manager role on top.
 */
export async function grantVendorStaffAccess(opts: {
  userId: string;
  businessId: string;
  vendorId: string;
  modules: string[];
  isManager?: boolean;
  grantedBy?: string;
}): Promise<void> {
  const { userId, businessId, vendorId, modules, isManager, grantedBy } = opts;

  // Never allow a grant outside what this vendor's business makes
  // available — the UI only offers valid options, but the API enforces it
  // independently.
  const available = new Set((await getVendorAvailableModules(businessId)).map((m) => m.key));
  const granted = modules.filter((m) => available.has(m));

  const staffRoleCode = `${STAFF_ROLE_PREFIX}${userId}`.toUpperCase();

  if (granted.length > 0) {
    const role = await Role.findOneAndUpdate(
      { code: staffRoleCode, businessId, vendorId },
      {
        $setOnInsert: {
          code: staffRoleCode,
          businessId,
          vendorId,
          name: "Staff Access",
          type: RoleType.CUSTOM,
          status: RoleStatus.ACTIVE,
          isSystem: true, // not editable from the generic roles UI
        },
        $set: {
          permissions: permissionCodesForModules(granted),
          description: `Per-user staff access: ${granted.join(", ")}`,
        },
      },
      { upsert: true, new: true }
    );
    await UserRole.updateOne(
      { userId, roleId: role._id },
      { $setOnInsert: { userId, roleId: role._id, businessId, assignedBy: grantedBy } },
      { upsert: true }
    );
    // Real access granted -> the registration floor (shopnative view) is
    // removed; the user retains exactly what was added.
    await stripFloorRoles(userId);
  } else {
    // Empty grant = revoke: remove the personal role and its link.
    const role = await Role.findOne({ code: staffRoleCode, businessId, vendorId });
    if (role) {
      await UserRole.deleteMany({ roleId: role._id });
      await role.deleteOne();
    }
  }

  // Manager toggle — grants/revokes the vendor's structural Manager role.
  if (typeof isManager === "boolean") {
    await ensureVendorCoreRoles(vendorId, businessId);
    const managerRole = await Role.findOne({ code: "VENDOR_MANAGER", businessId, vendorId });
    if (managerRole) {
      if (isManager) {
        await UserRole.updateOne(
          { userId, roleId: managerRole._id },
          { $setOnInsert: { userId, roleId: managerRole._id, businessId, assignedBy: grantedBy } },
          { upsert: true }
        );
        await stripFloorRoles(userId);
      } else {
        await UserRole.deleteMany({ userId, roleId: managerRole._id });
      }
    }
  }
}

/** Per-user access map for a vendor's whole team, for the Team & Access UI. */
export async function getVendorStaffAccessMap(
  vendorId: string,
  businessId: string
): Promise<Record<string, { modules: string[]; isManager: boolean }>> {
  const [staffRoles, managerRole] = await Promise.all([
    Role.find({ vendorId, businessId, code: { $regex: `^${STAFF_ROLE_PREFIX}` } }).lean(),
    Role.findOne({ code: "VENDOR_MANAGER", vendorId, businessId }).select("_id").lean(),
  ]);

  const map: Record<string, { modules: string[]; isManager: boolean }> = {};

  for (const role of staffRoles as any[]) {
    const userId = String(role.code).slice(STAFF_ROLE_PREFIX.length).toLowerCase();
    // Recover the module set from the permission codes (MODULE.ACTION).
    const modules = Array.from(
      new Set((role.permissions || []).map((p: string) => p.split(".")[0].toLowerCase()))
    ) as string[];
    map[userId] = { modules, isManager: false };
  }

  if (managerRole) {
    const managerGrants = await UserRole.find({ roleId: (managerRole as any)._id }).select("userId").lean();
    for (const g of managerGrants as any[]) {
      const uid = String(g.userId).toLowerCase();
      if (!map[uid]) map[uid] = { modules: [], isManager: true };
      else map[uid].isManager = true;
    }
  }

  return map;
}

/**
 * Owner-or-Manager resolution for vendor-side management endpoints —
 * structural Owner (VendorProfile.userId) or a real granted
 * VENDOR_MANAGER UserRole. Never the free-text BusinessMember.vendorRole
 * label. Shared here so every vendor management surface uses the same
 * definition.
 */
export async function resolveOwnerOrManagerVendor(userId: string | null) {
  if (!userId) return null;
  const ownedVendor = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
  if (ownedVendor) return ownedVendor;

  const membership = await BusinessMember.findOne({
    userId,
    vendorId: { $ne: null },
    status: "ACTIVE",
  }).lean();
  if (!membership?.vendorId) return null;

  const managerRole = await Role.findOne({
    code: "VENDOR_MANAGER",
    businessId: membership.businessId,
    vendorId: membership.vendorId,
  }).lean();
  if (!managerRole) return null;

  const hasManagerRole = await UserRole.exists({ userId, roleId: (managerRole as any)._id });
  if (!hasManagerRole) return null;

  return VendorProfile.findById(membership.vendorId).lean();
}

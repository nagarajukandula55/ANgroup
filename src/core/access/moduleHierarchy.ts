/**
 * Access Control page hierarchy: Category -> Subcategory -> Module ->
 * Privilege (STANDARD_ACTIONS from ./actions.ts).
 *
 * The module keys here are the CANONICAL, actually-enforced permission
 * module keys -- collected by grepping every `buildPermissionCode("<key>", ...)`
 * call site across src/app/api. This is deliberately NOT the sidebar's
 * NAV_GROUPS module keys (src/components/sidebar.tsx): those are UI routing
 * keys (kebab-case, one per nav link) built for navigation, not access
 * control, and several don't correspond 1:1 to a permission-checked module
 * at all. Using them here would have produced a page full of toggles that
 * looked real but did nothing. The Access Control page previously used a
 * third, hand-typed list (PERMISSION_MATRIX in admin/access/page.tsx) with
 * permission keys like "adjust"/"reports"/"manage" that don't match
 * anything requirePermission() ever checks -- toggling them silently did
 * nothing. This file is the one place that list is now defined, grouped
 * for a UI to render as a real, working access-control tree.
 */

export interface ModuleEntry {
  key: string;
  label: string;
}

export interface Subcategory {
  key: string;
  label: string;
  modules: ModuleEntry[];
}

export interface Category {
  key: string;
  label: string;
  /** Either flat modules directly under the category, or nested subcategories -- never both. */
  modules?: ModuleEntry[];
  subcategories?: Subcategory[];
}

export const ACCESS_HIERARCHY: Category[] = [
  {
    key: "overview",
    label: "Overview",
    modules: [
      { key: "dashboard", label: "Dashboard" },
      { key: "analytics", label: "Analytics" },
      { key: "audit", label: "Audit Log" },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    subcategories: [
      {
        key: "ops-sales",
        label: "Sales",
        modules: [
          { key: "sales", label: "Sales" },
          { key: "reviews", label: "Reviews" },
        ],
      },
      {
        key: "ops-inventory",
        label: "Inventory & Catalog",
        modules: [
          { key: "inventory", label: "Inventory" },
          { key: "products", label: "Products" },
          { key: "product_categories", label: "Product Categories" },
          { key: "materials", label: "Materials" },
          { key: "bom", label: "Bill of Materials" },
          { key: "grn", label: "Goods Receipt (GRN)" },
        ],
      },
      {
        key: "ops-purchase",
        label: "Purchase",
        modules: [
          { key: "purchase", label: "Purchase" },
          { key: "vendor_products", label: "Vendor Products" },
        ],
      },
      {
        key: "ops-assets",
        label: "Assets & Design",
        modules: [
          // Real, enforced modules (requirePermission("assets"/"designs", ...)
          // in api/assets and api/designs) that were never listed here at
          // all -- an audit found these five gaps ("everything should be
          // listed there") alongside crm/solutions below.
          { key: "assets", label: "Assets" },
          { key: "designs", label: "Designs" },
        ],
      },
      {
        key: "ops-logistics",
        label: "Logistics",
        modules: [{ key: "logistics", label: "Logistics" }],
      },
      {
        key: "ops-finance",
        label: "Finance",
        modules: [
          { key: "finance", label: "Finance" },
          { key: "gst", label: "GST" },
        ],
      },
    ],
  },
  {
    key: "business",
    label: "Business & Vendors",
    modules: [
      { key: "businesses", label: "Businesses" },
      { key: "vendors", label: "Vendors" },
      { key: "agreements", label: "Agreements" },
      { key: "banners", label: "Banners" },
    ],
  },
  {
    key: "crm",
    label: "CRM & Support",
    modules: [
      // "crm" itself (the CRM Overview/Dashboard landing page) was missing
      // here even though it's a real seeded ModuleDefinition gated on
      // CRM.VIEW (see seed-modules/route.ts) -- this list is what the Roles
      // & Permissions grid renders checkboxes from, so there was never a
      // way to actually grant CRM.VIEW through the UI. Granting only
      // crm_calls/crm_jobsheets (Appointments/Workorders) left the CRM
      // Dashboard page itself invisible in the sidebar no matter what.
      { key: "crm", label: "CRM Dashboard" },
      { key: "crm_calls", label: "CRM Calls" },
      { key: "crm_jobsheets", label: "CRM Job Sheets" },
      { key: "fault_codes", label: "Fault Codes" },
      { key: "solutions", label: "Solutions" },
      { key: "blog", label: "Blog" },
    ],
  },
  {
    key: "people",
    label: "People & Access",
    modules: [
      { key: "staff", label: "Staff" },
      { key: "employees", label: "Employees" },
      { key: "customers", label: "Customer Data" },
      { key: "users", label: "Users" },
      { key: "roles", label: "Roles" },
      { key: "access", label: "Access Control" },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    modules: [
      { key: "integrations", label: "Integrations" },
      { key: "settings", label: "Settings" },
    ],
  },
];

/** Flat list of every module across the whole hierarchy — used to validate
 * that nothing from the real enforcement list got left out. */
export const ALL_MODULE_KEYS: string[] = ACCESS_HIERARCHY.flatMap((cat) =>
  cat.modules
    ? cat.modules.map((m) => m.key)
    : (cat.subcategories ?? []).flatMap((sc) => sc.modules.map((m) => m.key))
);

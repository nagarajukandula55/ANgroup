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
  /** Plain-language summary of what holding this module's access lets a
   * user do, shown as visible text (not just a hover tooltip) next to the
   * module in Admin > Access while creating/editing a role. */
  description: string;
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
      { key: "dashboard", label: "Dashboard", description: "See the main summary/KPI dashboard." },
      { key: "analytics", label: "Analytics", description: "View sales, traffic and performance reports and charts." },
      { key: "audit", label: "Audit Log", description: "See the history of who changed what, and when." },
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
          { key: "sales", label: "Sales", description: "View and manage sales orders and sales records." },
          { key: "reviews", label: "Reviews", description: "See and moderate customer product/service reviews." },
        ],
      },
      {
        key: "ops-inventory",
        label: "Inventory & Catalog",
        modules: [
          { key: "inventory", label: "Inventory", description: "View and adjust stock levels across warehouses." },
          { key: "products", label: "Products", description: "Create and manage the product catalogue." },
          { key: "product_categories", label: "Product Categories", description: "Organize products into categories." },
          { key: "materials", label: "Materials", description: "Manage raw materials used in manufacturing/repairs." },
          { key: "bom", label: "Bill of Materials", description: "Define which materials/parts make up a product." },
          { key: "grn", label: "Goods Receipt (GRN)", description: "Record incoming stock received from purchase orders." },
        ],
      },
      {
        key: "ops-purchase",
        label: "Purchase",
        modules: [
          { key: "purchase", label: "Purchase", description: "Create and manage purchase orders to suppliers." },
          { key: "vendor_products", label: "Vendor Products", description: "Manage the products a vendor sells/supplies." },
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
          { key: "assets", label: "Assets", description: "Manage uploaded files/media used across the platform." },
          { key: "designs", label: "Designs", description: "Manage design assets/artwork (e.g. product mockups)." },
        ],
      },
      {
        key: "ops-logistics",
        label: "Logistics",
        modules: [{ key: "logistics", label: "Logistics", description: "Manage shipping, delivery and tracking of orders." }],
      },
      {
        key: "ops-finance",
        label: "Finance",
        modules: [
          { key: "finance", label: "Finance", description: "View/manage invoices, payments and financial records." },
          { key: "gst", label: "GST", description: "Manage GST filings and tax-related settings." },
        ],
      },
    ],
  },
  {
    key: "business",
    label: "Business & Vendors",
    modules: [
      { key: "businesses", label: "Businesses", description: "Create and manage tenant businesses on the platform." },
      { key: "vendors", label: "Vendors", description: "Onboard and manage vendor accounts and their approval." },
      { key: "agreements", label: "Agreements", description: "Draft, send and sign business/vendor agreements." },
      { key: "banners", label: "Banners", description: "Manage storefront homepage banners/promotions." },
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
      { key: "crm", label: "CRM Dashboard", description: "See the CRM overview/landing page." },
      { key: "crm_calls", label: "CRM Calls", description: "Manage customer appointment/call requests." },
      { key: "crm_jobsheets", label: "CRM Job Sheets", description: "Manage repair/service workorders end-to-end." },
      { key: "fault_codes", label: "Fault Codes", description: "Manage the list of standard fault/issue codes." },
      { key: "solutions", label: "Solutions", description: "Manage standard fixes/solutions linked to fault codes." },
      { key: "blog", label: "Blog", description: "Write and publish blog posts on the storefront." },
    ],
  },
  {
    key: "people",
    label: "People & Access",
    modules: [
      { key: "staff", label: "Staff", description: "Manage a vendor's own team members and their roles." },
      { key: "employees", label: "Employees", description: "Manage AN Group / business employee records." },
      { key: "customers", label: "Customer Data", description: "View and manage customer accounts and their data." },
      { key: "users", label: "Users", description: "View and manage every user account on the platform." },
      { key: "roles", label: "Roles", description: "Create roles and grant/revoke their permissions." },
      { key: "access", label: "Access Control", description: "Same as Roles -- manage the Access Control screen itself." },
    ],
  },
  {
    key: "platform",
    label: "Platform",
    modules: [
      { key: "integrations", label: "Integrations", description: "Configure third-party integrations (payments, SMS, etc.)." },
      { key: "settings", label: "Settings", description: "Change platform/business-wide configuration." },
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

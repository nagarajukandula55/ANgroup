/* ============================================================
   ERP MODULE REGISTRY
   ------------------------------------------------------------
   Central registry used across the platform.

   Used By
   --------
   • Number Series
   • Permissions
   • Dashboard
   • Navigation
   • Search
   • Reporting
   • Audit
   • Workflow
============================================================ */

export const MODULE_CATEGORIES = {
  MASTER: "MASTER",
  INVENTORY: "INVENTORY",
  PURCHASE: "PURCHASE",
  SALES: "SALES",
  FINANCE: "FINANCE",
  MANUFACTURING: "MANUFACTURING",
  CRM: "CRM",
  HR: "HR",
  SYSTEM: "SYSTEM",
} as const;

export type ModuleCategory =
  (typeof MODULE_CATEGORIES)[keyof typeof MODULE_CATEGORIES];

export interface ERPModule {
  key: string;
  name: string;
  category: ModuleCategory;

  icon: string;

  defaultPrefix: string;

  defaultPadding: number;

  supportsReset: boolean;

  supportsScope: boolean;

  enabled: boolean;
}

export const ERP_MODULES: Record<string, ERPModule> = {
  /* ======================================================
      MASTERS
  ====================================================== */

  ORGANIZATION: {
    key: "ORGANIZATION",
    name: "Organization",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Building2",
    defaultPrefix: "AN",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: false,
    enabled: true,
  },

  BUSINESS: {
    key: "BUSINESS",
    name: "Business",
    category: MODULE_CATEGORIES.MASTER,
    icon: "BriefcaseBusiness",
    defaultPrefix: "BU",
    defaultPadding: 5,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  WAREHOUSE: {
    key: "WAREHOUSE",
    name: "Warehouse",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Warehouse",
    defaultPrefix: "WH",
    defaultPadding: 5,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  USER: {
    key: "USER",
    name: "User",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Users",
    defaultPrefix: "USR",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: false,
    enabled: true,
  },

  EMPLOYEE: {
    key: "EMPLOYEE",
    name: "Employee",
    category: MODULE_CATEGORIES.HR,
    icon: "UserCheck",
    defaultPrefix: "EMP",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  VENDOR: {
    key: "VENDOR",
    name: "Vendor",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Truck",
    defaultPrefix: "VEN",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  CUSTOMER: {
    key: "CUSTOMER",
    name: "Customer",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Handshake",
    defaultPrefix: "CUS",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  MATERIAL: {
    key: "MATERIAL",
    name: "Material",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Package",
    defaultPrefix: "MAT",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  PRODUCT: {
    key: "PRODUCT",
    name: "Product",
    category: MODULE_CATEGORIES.MASTER,
    icon: "Box",
    defaultPrefix: "PRD",
    defaultPadding: 6,
    supportsReset: false,
    supportsScope: true,
    enabled: true,
  },

  /* ======================================================
      PURCHASE
  ====================================================== */

  PURCHASE_REQUEST: {
    key: "PURCHASE_REQUEST",
    name: "Purchase Request",
    category: MODULE_CATEGORIES.PURCHASE,
    icon: "FilePlus",
    defaultPrefix: "PR",
    defaultPadding: 6,
    supportsReset: true,
    supportsScope: true,
    enabled: true,
  },

  PURCHASE_ORDER: {
    key: "PURCHASE_ORDER",
    name: "Purchase Order",
    category: MODULE_CATEGORIES.PURCHASE,
    icon: "ShoppingCart",
    defaultPrefix: "PO",
    defaultPadding: 6,
    supportsReset: true,
    supportsScope: true,
    enabled: true,
  },

  GOODS_RECEIPT: {
    key: "GOODS_RECEIPT",
    name: "Goods Receipt",
    category: MODULE_CATEGORIES.PURCHASE,
    icon: "ClipboardCheck",
    defaultPrefix: "GRN",
    defaultPadding: 6,
    supportsReset: true,
    supportsScope: true,
    enabled: true,
  },

  /* ======================================================
      SALES
  ====================================================== */

  SALES_ORDER: {
    key: "SALES_ORDER",
    name: "Sales Order",
    category: MODULE_CATEGORIES.SALES,
    icon: "Receipt",
    defaultPrefix: "SO",
    defaultPadding: 6,
    supportsReset: true,
    supportsScope: true,
    enabled: true,
  },

  SALES_INVOICE: {
    key: "SALES_INVOICE",
    name: "Sales Invoice",
    category: MODULE_CATEGORIES.SALES,
    icon: "FileText",
    defaultPrefix: "INV",
    defaultPadding: 6,
    supportsReset: true,
    supportsScope: true,
    enabled: true,
  },
};

/* ============================================================
   HELPERS
============================================================ */

export const ERP_MODULE_LIST = Object.values(ERP_MODULES);

export function getModule(key: string): ERPModule | undefined {
  return ERP_MODULES[key];
}

export function getModulesByCategory(category: ModuleCategory) {
  return ERP_MODULE_LIST.filter(
    (module) => module.category === category
  );
}

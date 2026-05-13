import Business from "@/models/Business";

/* ================= DEFAULT MODULES ================= */
const DEFAULT_MODULES = [
  {
    key: "dashboard",
    label: "Dashboard",
    route: "/dashboard",
    enabled: true,
    permissions: ["DASHBOARD_VIEW"],
  },
  {
    key: "orders",
    label: "Orders",
    route: "/orders",
    enabled: true,
    permissions: ["ORDER_VIEW", "ORDER_MANAGE"],
  },
  {
    key: "invoices",
    label: "Invoices",
    route: "/invoices",
    enabled: true,
    permissions: ["INVOICE_VIEW", "INVOICE_CREATE"],
  },
  {
    key: "finance",
    label: "Finance",
    route: "/finance",
    enabled: true,
    permissions: ["FINANCE_VIEW"],
  },
  {
    key: "ai",
    label: "AI Workspace",
    route: "/ai",
    enabled: true,
    permissions: ["AI_ACCESS"],
  },
];

/* ================= BOOTSTRAP BUSINESS ================= */
export async function bootstrapBusiness(payload: any) {
  const businessCode =
    payload.businessCode ||
    `BUS-${Date.now()}`;

  const business = await Business.create({
    name: payload.name,
    legalName: payload.legalName,
    brandName: payload.brandName,

    businessCode,

    industry: payload.industry,
    type: payload.type,

    email: payload.email,
    phone: payload.phone,
    website: payload.website,

    isActive: true,

    modules: DEFAULT_MODULES,

    documents: {
      invoices: {
        enabled: true,
        numbering: {
          prefix: "NA",
          format: "PREFIX-DATE-SEQ-RANDOM",
          sequenceScope: "BUSINESS",
          dateFormat: "YYMMDD",
          padding: 6,
          resetPolicy: "DAILY",
        },
      },

      creditNotes: { enabled: true },
      debitNotes: { enabled: true },
      receipts: { enabled: true },
    },

    compliance: {
      gst: {
        number: payload.gstNumber,
        registered: !!payload.gstNumber,
      },

      pan: payload.pan,
      cin: payload.cin,
      msme: payload.msme,
      iec: payload.iec,
    },

    financial: {
      currency: "INR",
      fiscalYearStart: "04-01",
      accountingMethod: "ACCRUAL",
      costCentersEnabled: false,
      profitTrackingEnabled: true,
    },

    organization: {
      departments: [],
      locations: payload.locations || [],
    },

    roles: [],
  });

  return business;
}

import mongoose from "mongoose";

/* ================= MODULES (DYNAMIC UI + FEATURES) ================= */
const ModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // dashboard, ai, logistics
    label: { type: String, required: true },
    route: { type: String, required: true },
    icon: String,
    enabled: { type: Boolean, default: true },

    permissions: [String], // ROLE-based gating
  },
  { _id: false }
);

/* ================= INVOICE NUMBERING ENGINE CONFIG ================= */
const NumberingSchema = new mongoose.Schema(
  {
    prefix: { type: String, default: "NA" },

    format: {
      type: String,
      default: "PREFIX-DATE-SEQ-RANDOM",
    },

    sequenceScope: {
      type: String,
      enum: ["BUSINESS", "LOCATION", "FINANCIAL_YEAR"],
      default: "BUSINESS",
    },

    dateFormat: {
      type: String,
      default: "YYMMDD",
    },

    padding: { type: Number, default: 6 },

    resetPolicy: {
      type: String,
      enum: ["NEVER", "DAILY", "MONTHLY", "YEARLY"],
      default: "DAILY",
    },
  },
  { _id: false }
);

/* ================= DOCUMENT ENGINE CONFIG ================= */
const DocumentSchema = new mongoose.Schema(
  {
    invoices: {
      enabled: { type: Boolean, default: true },
      templateId: String,
      numbering: NumberingSchema,
    },

    creditNotes: {
      enabled: { type: Boolean, default: true },
      templateId: String,
    },

    debitNotes: {
      enabled: { type: Boolean, default: true },
      templateId: String,
    },

    receipts: {
      enabled: { type: Boolean, default: true },
      templateId: String,
    },
  },
  { _id: false }
);

/* ================= COMPLIANCE LAYER ================= */
const ComplianceSchema = new mongoose.Schema(
  {
    gst: {
      number: String,
      stateCode: String,
      registered: { type: Boolean, default: false },
    },

    pan: String,

    cin: String, // company registration
    msme: String,
    iec: String, // export/import

    taxRegime: {
      type: String,
      enum: ["REGULAR", "COMPOSITION"],
      default: "REGULAR",
    },

    filingCycle: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "ANNUAL"],
      default: "MONTHLY",
    },
  },
  { _id: false }
);

/* ================= FINANCIAL ENGINE ================= */
const FinancialSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "INR" },

    fiscalYearStart: { type: String, default: "04-01" },

    accountingMethod: {
      type: String,
      enum: ["CASH", "ACCRUAL"],
      default: "ACCRUAL",
    },

    costCentersEnabled: { type: Boolean, default: false },

    profitTrackingEnabled: { type: Boolean, default: true },

    taxStandard: {
      type: String,
      default: "GST",
    },
  },
  { _id: false }
);

/* ================= ROLE SYSTEM ================= */
const RoleSchema = new mongoose.Schema(
  {
    name: String,
    level: Number, // 1=admin, 2=manager
    permissions: [String],
  },
  { _id: false }
);

/* ================= ORGANIZATION STRUCTURE ================= */
const OrganizationSchema = new mongoose.Schema(
  {
    departments: [
      {
        name: String,
        headUserId: String,
      },
    ],

    locations: [
      {
        name: String,
        address: String,
        gstApplicable: Boolean,
      },
    ],
  },
  { _id: false }
);

/* ================= MAIN BUSINESS ================= */
const BusinessSchema = new mongoose.Schema(
  {
    /* IDENTITY */
    name: { type: String, required: true },
    legalName: String,
    brandName: String,

    businessCode: {
      type: String,
      unique: true,
      index: true,
    },

    industry: String,
    type: String,

    /* CONTACT */
    email: String,
    phone: String,
    website: String,

    /* CORE FLAGS */
    isActive: { type: Boolean, default: true },

    /* SYSTEM MODULES */
    modules: [ModuleSchema],

    /* ENTERPRISE CONFIGS */
    documents: DocumentSchema,
    compliance: ComplianceSchema,
    financial: FinancialSchema,
    organization: OrganizationSchema,

    roles: [RoleSchema],

    /* FUTURE AI LAYER */
    aiEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Business ||
  mongoose.model("Business", BusinessSchema);

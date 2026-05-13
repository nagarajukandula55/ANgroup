import mongoose from "mongoose";

/* ================= MODULE ================= */
const ModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // ai, logistics, analytics
    label: { type: String, required: true },
    route: { type: String, required: true },
    icon: String,
    enabled: { type: Boolean, default: true },

    // ACCESS BASED CONTROL (NOT ROLE BASED)
    accessKeys: [String], // e.g. ["ADMIN", "INVENTORY_WRITE"]
  },
  { _id: false }
);

/* ================= ACCESS CONTROL (NEW CORE) ================= */
const AccessSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // INVENTORY_READ
    label: String,
    description: String,
  },
  { _id: false }
);

/* ================= NUMBERING ENGINE ================= */
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

    dateFormat: { type: String, default: "YYMMDD" },

    padding: { type: Number, default: 6 },

    resetPolicy: {
      type: String,
      enum: ["NEVER", "DAILY", "MONTHLY", "YEARLY"],
      default: "DAILY",
    },
  },
  { _id: false }
);

/* ================= DOCUMENT ENGINE ================= */
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

/* ================= COMPLIANCE ================= */
const ComplianceSchema = new mongoose.Schema(
  {
    gst: {
      number: String,
      stateCode: String,
      registered: { type: Boolean, default: false },
    },

    pan: String,
    cin: String,
    msme: String,
    iec: String,

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

/* ================= FINANCIAL ================= */
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

    taxStandard: { type: String, default: "GST" },
  },
  { _id: false }
);

/* ================= ORGANIZATION ================= */
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

/* ================= ACCESS ASSIGNMENT (IMPORTANT) ================= */
const AccessAssignmentSchema = new mongoose.Schema(
  {
    userId: String,
    accessKeys: [String], // dynamic access system
    locationIds: [String],
    designation: String,
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

    /* CORE */
    isActive: { type: Boolean, default: true },

    /* ACCESS SYSTEM (NEW CORE) */
    accessCatalog: [AccessSchema],
    userAccess: [AccessAssignmentSchema],

    /* MODULE SYSTEM */
    modules: [ModuleSchema],

    /* ENTERPRISE CONFIG */
    documents: DocumentSchema,
    compliance: ComplianceSchema,
    financial: FinancialSchema,
    organization: OrganizationSchema,

    /* AI LAYER */
    aiEnabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.models.Business ||
  mongoose.model("Business", BusinessSchema);

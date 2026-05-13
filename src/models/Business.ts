import mongoose from "mongoose";

/* ================= ACCESS SYSTEM (NO ROLES, ONLY ACCESS KEYS) ================= */
const AccessSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // e.g. INVOICE_CREATE
    label: String,
    description: String,
  },
  { _id: false }
);

/* ================= MODULE ================= */
const ModuleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true }, // dashboard, orders, finance
    label: String,
    route: String,
    icon: String,
    enabled: { type: Boolean, default: true },

    access: [AccessSchema], // 🔥 ACCESS BASED CONTROL
  },
  { _id: false }
);

/* ================= NUMBERING ENGINE ================= */
const NumberingSchema = new mongoose.Schema(
  {
    prefix: { type: String, default: "NA" }, // NA

    format: {
      type: String,
      default: "PREFIX-DATE-SEQ-RANDOM",
    },

    dateFormat: { type: String, default: "YYMMDD" },

    padding: { type: Number, default: 6 },

    randomLength: { type: Number, default: 6 },

    example: {
      type: String,
      default: "NA-260430-000002-CWDZYA",
    },

    scope: {
      type: String,
      enum: ["BUSINESS", "LOCATION"],
      default: "BUSINESS",
    },
  },
  { _id: false }
);

/* ================= DOCUMENT ENGINE ================= */
const DocumentSchema = new mongoose.Schema(
  {
    invoice: {
      enabled: { type: Boolean, default: true },
      templateId: String,
      numbering: NumberingSchema,
    },

    creditNote: {
      enabled: { type: Boolean, default: true },
      templateId: String,
    },

    debitNote: {
      enabled: { type: Boolean, default: true },
      templateId: String,
    },

    receipt: {
      enabled: { type: Boolean, default: true },
      templateId: String,
      numbering: {
        type: String,
        default: "NA-1778239266354-JRUIUC",
      },
    },
  },
  { _id: false }
);

/* ================= COMPLIANCE ================= */
const ComplianceSchema = new mongoose.Schema(
  {
    gstNumber: String,
    pan: String,
    cin: String,
    msme: String,
    iec: String,
  },
  { _id: false }
);

/* ================= FINANCIAL ================= */
const FinancialSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "INR" },
    fiscalYearStart: { type: String, default: "04-01" },
    taxStandard: { type: String, default: "GST" },
  },
  { _id: false }
);

/* ================= MAIN BUSINESS ================= */
const BusinessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    legalName: String,
    brandName: String,

    businessCode: { type: String, unique: true, index: true },

    industry: String,
    type: String,

    email: String,
    phone: String,
    website: String,

    isActive: { type: Boolean, default: true },

    modules: [ModuleSchema],

    documents: DocumentSchema,
    compliance: ComplianceSchema,
    financial: FinancialSchema,

    aiEnabled: { type: Boolean, default: true },

    // 🔥 MULTI-TENANT KEY
    tenantKey: { type: String, unique: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.models.Business ||
  mongoose.model("Business", BusinessSchema);

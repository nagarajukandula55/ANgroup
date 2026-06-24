import mongoose from "mongoose";

/* ================= ACCESS SYSTEM ================= */
const AccessSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

/* ================= MODULE ================= */
const ModuleSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      required: true,
      trim: true,
    },

    route: {
      type: String,
      default: "",
      trim: true,
    },

    icon: {
      type: String,
      default: "",
    },

    parent: {
      type: String,
      default: null,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    badge: {
      type: String,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: true,
    },

    access: {
      type: [AccessSchema],
      default: [],
    },
  },
  { _id: false }
);

/* ================= NUMBERING ENGINE ================= */
const NumberingSchema = new mongoose.Schema(
  {
    prefix: {
      type: String,
      default: "NA",
    },

    format: {
      type: String,
      default: "PREFIX-DATE-SEQ-RANDOM",
    },

    dateFormat: {
      type: String,
      default: "YYMMDD",
    },

    padding: {
      type: Number,
      default: 6,
    },

    randomLength: {
      type: Number,
      default: 6,
    },

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
      enabled: {
        type: Boolean,
        default: true,
      },

      templateId: String,

      numbering: NumberingSchema,
    },

    creditNote: {
      enabled: {
        type: Boolean,
        default: true,
      },

      templateId: String,
    },

    debitNote: {
      enabled: {
        type: Boolean,
        default: true,
      },

      templateId: String,
    },

    receipt: {
      enabled: {
        type: Boolean,
        default: true,
      },

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
    currency: {
      type: String,
      default: "INR",
    },

    fiscalYearStart: {
      type: String,
      default: "04-01",
    },

    taxStandard: {
      type: String,
      default: "GST",
    },
  },
  { _id: false }
);

/* ================= BUSINESS ================= */
const BusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    legalName: {
      type: String,
      trim: true,
    },

    brandName: {
      type: String,
      trim: true,
    },

    businessCode: {
      type: String,
      unique: true,
      index: true,
      uppercase: true,
      trim: true,
    },

    tenantKey: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    industry: {
      type: String,
      trim: true,
    },

    type: {
      type: String,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    aiEnabled: {
      type: Boolean,
      default: true,
    },

    modules: {
      type: [ModuleSchema],
      default: [],
    },

    documents: {
      type: DocumentSchema,
      default: {},
    },

    compliance: {
      type: ComplianceSchema,
      default: {},
    },

    financial: {
      type: FinancialSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* ================= INDEXES ================= */
BusinessSchema.index({ businessCode: 1 });
BusinessSchema.index({ tenantKey: 1 });
BusinessSchema.index({ isActive: 1 });

export default mongoose.models.Business ||
  mongoose.model("Business", BusinessSchema);

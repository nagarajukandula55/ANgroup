import mongoose from "mongoose";

/* =========================================================
   ACCESS
========================================================= */

const AccessSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
    },

    label: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   MODULE
========================================================= */

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
    },

    icon: {
      type: String,
      default: "",
    },

    parent: {
      type: String,
      default: "",
    },

    badge: {
      type: String,
      default: "",
    },

    sortOrder: {
      type: Number,
      default: 0,
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
  {
    _id: false,
  }
);

/* =========================================================
   NUMBERING
========================================================= */

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

    scope: {
      type: String,
      enum: [
        "BUSINESS",
        "WAREHOUSE",
      ],
      default: "BUSINESS",
    },

    example: {
      type: String,
      default: "",
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   DOCUMENT
========================================================= */

const DocumentItemSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    templateId: {
      type: String,
      default: "",
    },

    numbering: {
      type: NumberingSchema,
      default: {},
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   DOCUMENT ENGINE
========================================================= */

const DocumentSchema = new mongoose.Schema(
  {
    invoice: {
      type: DocumentItemSchema,
      default: {},
    },

    receipt: {
      type: DocumentItemSchema,
      default: {},
    },

    purchaseOrder: {
      type: DocumentItemSchema,
      default: {},
    },

    goodsReceipt: {
      type: DocumentItemSchema,
      default: {},
    },

    salesOrder: {
      type: DocumentItemSchema,
      default: {},
    },

    customerOrder: {
      type: DocumentItemSchema,
      default: {},
    },

    vendorProduct: {
      type: DocumentItemSchema,
      default: {},
    },

    product: {
      type: DocumentItemSchema,
      default: {},
    },

    productVariant: {
      type: DocumentItemSchema,
      default: {},
    },

    stockAdjustment: {
      type: DocumentItemSchema,
      default: {},
    },

    stockTransfer: {
      type: DocumentItemSchema,
      default: {},
    },

    productionOrder: {
      type: DocumentItemSchema,
      default: {},
    },

    batch: {
      type: DocumentItemSchema,
      default: {},
    },

    creditNote: {
      type: DocumentItemSchema,
      default: {},
    },

    debitNote: {
      type: DocumentItemSchema,
      default: {},
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   COMPLIANCE
========================================================= */

const ComplianceSchema = new mongoose.Schema(
  {
    gstNumber: String,
    pan: String,
    cin: String,
    msme: String,
    iec: String,
    fssai: String,
    drugLicense: String,
  },
  {
    _id: false,
  }
);

/* =========================================================
   FINANCIAL
========================================================= */

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

    decimalPlaces: {
      type: Number,
      default: 2,
    },

    priceIncludesTax: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   AI
========================================================= */

const AISettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },

    autoGenerateSEO: {
      type: Boolean,
      default: true,
    },

    autoGenerateDescription: {
      type: Boolean,
      default: true,
    },

    autoGenerateTags: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   MARKETPLACE
========================================================= */

const MarketplaceSchema = new mongoose.Schema(
  {
    enableB2B: {
      type: Boolean,
      default: true,
    },

    enableB2C: {
      type: Boolean,
      default: true,
    },

    enableVendorPortal: {
      type: Boolean,
      default: true,
    },

    enableManufacturing: {
      type: Boolean,
      default: true,
    },

    enableWarehouse: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   BUSINESS
========================================================= */

const BusinessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    legalName: {
      type: String,
      default: "",
      trim: true,
    },

    brandName: {
      type: String,
      default: "",
      trim: true,
    },

    businessCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    tenantKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    industry: {
      type: String,
      default: "",
    },

    type: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    website: {
      type: String,
      default: "",
      trim: true,
    },

    logo: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "India",
    },

    pincode: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
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

    marketplace: {
      type: MarketplaceSchema,
      default: {},
    },

    ai: {
      type: AISettingsSchema,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

BusinessSchema.index({
  businessCode: 1,
});

BusinessSchema.index({
  tenantKey: 1,
});

BusinessSchema.index({
  isActive: 1,
});

BusinessSchema.index({
  email: 1,
});

/* =========================================================
   EXPORT
========================================================= */

export default
  mongoose.models.Business ||
  mongoose.model(
    "Business",
    BusinessSchema
  );

import mongoose from "mongoose";
import { BUSINESS_TYPES, INDUSTRIES } from "@/data/businessConstants";

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
   INVOICING RULES — how a marketplace order gets invoiced when it's
   fulfilled by a vendor. Per explicit user requirement: when a customer
   places an order, generate a B2B invoice (vendor -> this business, at the
   vendor's cost/wholesale basis) and a separate B2C invoice (this business
   -> the customer, at the sale price) rather than only settling the
   vendor's payout. Off by default (dualInvoiceMode: false) so existing
   commission-only settlement behavior (core/payouts/vendorSettlement.service.ts)
   is unchanged unless a business explicitly opts in.

   vendorCostBasis controls how the B2B leg's amount is computed — kept as
   an enum (not hardcoded logic) specifically so more bases can be added
   later without another migration:
     NET_PAYOUT           - vendor's cost = grossAmount minus platform
                            commission (same math vendorSettlement.service.ts
                            already uses for payouts)
     GROSS_AMOUNT         - vendor's cost = full line-item sale value, no
                            commission deducted (platform's margin comes
                            from elsewhere, e.g. a separate fee)
     FIXED_MARGIN_PERCENT - vendor's cost = sale value reduced by a flat
                            markup percent (fixedMarginPercent)
     VENDOR_DECLARED      - vendor's cost = the price the vendor declared
                            for that product (falls back to GROSS_AMOUNT if
                            no declared cost exists on the line item)
========================================================= */

const InvoicingRulesSchema = new mongoose.Schema(
  {
    dualInvoiceMode: {
      type: Boolean,
      default: false,
    },
    vendorCostBasis: {
      type: String,
      enum: ["NET_PAYOUT", "GROSS_AMOUNT", "FIXED_MARGIN_PERCENT", "VENDOR_DECLARED"],
      default: "NET_PAYOUT",
    },
    fixedMarginPercent: {
      type: Number,
      default: 0,
    },
    defaultSupplyType: {
      type: String,
      enum: ["INTRASTATE", "INTERSTATE"],
      default: "INTRASTATE",
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

    // Constrained to INDUSTRIES (src/data/businessConstants.ts) rather than
    // free text — previously any string was accepted here, which meant the
    // same industry could be entered a dozen different ways across
    // businesses (e.g. "IT", "It Services", "software") with no way to
    // filter/report on it reliably.
    industry: {
      type: String,
      enum: [...INDUSTRIES, ""],
      default: "",
    },

    // Constrained to BUSINESS_TYPES (src/data/businessConstants.ts) — same
    // reasoning as `industry` above. Named `type` (not `businessType`) to
    // match the existing field name already used by forms/APIs; the
    // shared constant is still called BUSINESS_TYPES for clarity at the
    // call site.
    type: {
      type: String,
      enum: [...BUSINESS_TYPES, ""],
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

    // e-Invoice (INV-01) readiness: the official e-invoice schema requires
    // the supplier's 2-digit GST state code (e.g. "27" for Maharashtra),
    // which is a distinct enumerated value from the free-text `state` name
    // above — added additively here, same pattern as SalesInvoice.ts's own
    // e-invoice-readiness fields, so this business's data is ready to map
    // into an IRN request once an actual IRP integration is built. See
    // PROGRESS.md's GST section for the decision to target only the
    // official government e-invoice path and hold off on wiring a live
    // integration for now.
    gstStateCode: {
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

    invoicingRules: {
      type: InvoicingRulesSchema,
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

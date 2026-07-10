import mongoose from "mongoose";

const VendorProductSchema = new mongoose.Schema(
{
  /* =========================================================
     CORE RELATIONS
  ========================================================= */

  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Business",
    required: true,
    index: true,
  },

  // Was `ref: "Vendor"` (the legacy, superseded vendor model — see this
  // session's other fixes for the same class of bug) and `required: true`,
  // but the draft-creation route never set it at all -- every single
  // vendor-product draft creation attempt has always failed Mongoose
  // schema validation immediately, regardless of caller/permissions.
  // Points at the canonical VendorProfile model now; no longer required at
  // the schema level since a brand-new draft has no vendor context yet in
  // some admin-initiated flows -- the draft route below now resolves and
  // sets it from the session when a vendor context does exist.
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VendorProfile",
    index: true,
  },

  /* =========================================================
     BASIC PRODUCT INFO (VENDOR INPUT)
  ========================================================= */

  // Not required at the schema level -- a draft starts genuinely empty and
  // gets filled in over the wizard's steps (StepBasicInfo etc.); real
  // completeness is enforced at the submit step, not on every intermediate
  // save. Was required:true, which made the very first, always-empty
  // draft-creation call fail unconditionally.
  productName: {
    type: String,
    default: "",
    trim: true,
  },

  // Same reasoning as productName above.
  variantName: {
    type: String,
    default: "",
    trim: true,
  },

  description: String,

  slug: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
  },

  images: [String],

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductCategory",
  },

  brandId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Brand",
  },

  /* =========================================================
     COMMERCIAL INPUT (VENDOR SIDE)
  ========================================================= */

  vendorSku: {
    type: String,
    trim: true,
  },

  vendorCost: {
    type: Number,
    default: 0,
  },

  mrp: {
    type: Number,
    default: 0,
  },

  suggestedSellingPrice: {
    type: Number,
    default: 0,
  },

  vendorShippingCost: {
    type: Number,
    default: 0,
  },

  shippingCostType: {
    type: String,
    enum: ["INCLUDED", "SEPARATE"],
    default: "SEPARATE",
  },

  minimumOrderQty: {
    type: Number,
    default: 1,
  },

  leadTimeDays: {
    type: Number,
    default: 0,
  },

  availableStock: {
    type: Number,
    default: 0,
  },

  /* =========================================================
     PRODUCT STRUCTURE
  ========================================================= */

  // Same reasoning as productName/variantName above -- not set until the
  // wizard's Structure/Packaging step.
  unit: {
    type: String,
    default: "",
  },

  packSize: {
    type: Number,
    default: 1,
  },

  netWeight: {
    type: Number,
    default: 0,
  },

  grossWeight: {
    type: Number,
    default: 0,
  },

  hsnCode: String,

  gstRate: {
    type: Number,
    default: 0,
  },

  /* =========================================================
     BOM LINK (COST ENGINE INPUT)
  ========================================================= */

  bomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "VendorProductBOM",
  },

  calculatedCost: {
    baseCost: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    overheadCost: { type: Number, default: 0 },
    wastageCost: { type: Number, default: 0 },
    finalCost: { type: Number, default: 0 },
  },

  /* =========================================================
     FMCG / FOOD COMPLIANCE (CRITICAL)
  ========================================================= */

  compliance: {
    ingredients: [String],

    usageInstructions: String,

    storageInstructions: String,

    shelfLifeDays: Number,

    bestBefore: String,

    allergens: [String],

    warnings: [String],

    packagingType: String,

    isFragile: Boolean,

    temperatureSensitive: Boolean,
  },

  nutrition: {
    servingSize: Number,
    energy: Number,
    protein: Number,
    carbs: Number,
    sugars: Number,
    fat: Number,
    sodium: Number,
  },

  /* =========================================================
     SEO (LIGHT WEIGHT - USED AT PUBLISH TIME)
  ========================================================= */

  seo: {
    customTitle: String,
    customDescription: String,
    keywords: [String],
  },

  /* =========================================================
     APPROVAL WORKFLOW
  ========================================================= */

  approvalStatus: {
    type: String,
    enum: [
      "DRAFT",
      "PENDING",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "NEEDS_REVISION",
    ],
    default: "DRAFT",
  },

  status: {
    type: String,
    enum: [
      "DRAFT",
      "PENDING",
      "UNDER_REVIEW",
      "APPROVED",
      "REJECTED",
      "NEEDS_REVISION",
    ],
    default: "DRAFT",
  },

  rejectionReason: String,
  revisionNotes: String,

  submittedAt: Date,

  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  approvedAt: Date,

  /* =========================================================
     LINK TO FINAL SYSTEM CATALOG
  ========================================================= */

  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
  },

  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
  },

  // What the Native storefront actually renders once approved — see
  // api/vendor-products/[id]/approve/route.ts, which upserts this
  // record so the approved product is visible to customers.
  nativeProductId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "NativeProduct",
  },

  /* =========================================================
     INTERNAL CONTROL SYSTEM
  ========================================================= */

  internalSku: {
    type: String,
    unique: true,
    sparse: true,
  },

  priceFrozen: {
    type: Boolean,
    default: false,
  },

  priceVersion: {
    type: Number,
    default: 1,
  },

  active: {
    type: Boolean,
    default: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
},
{
  timestamps: true,
}
);

/* =========================================================
   INDEXES
========================================================= */

VendorProductSchema.index({
  vendorId: 1,
  approvalStatus: 1,
});

VendorProductSchema.index({
  productId: 1,
  variantId: 1,
});

VendorProductSchema.index({
  internalSku: 1,
});

export default mongoose.models.VendorProduct ||
mongoose.model("VendorProduct", VendorProductSchema);

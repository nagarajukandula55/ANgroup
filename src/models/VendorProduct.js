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

  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vendor",
    required: true,
    index: true,
  },

  /* =========================================================
     BASIC PRODUCT INFO (VENDOR INPUT)
  ========================================================= */

  productName: {
    type: String,
    required: true,
    trim: true,
  },

  variantName: {
    type: String,
    required: true,
    trim: true,
  },

  description: String,

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

  unit: {
    type: String,
    required: true,
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

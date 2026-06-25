import mongoose from "mongoose";

const VendorProductSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
      index: true,
    },

    /* ==========================================
       SUBMISSION DETAILS
    ========================================== */

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

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductCategory",
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
    },

    description: String,

    images: [String],

    /* ==========================================
       COMMERCIAL
    ========================================== */

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

    suggestedSellingPrice: {
      type: Number,
      default: 0,
    },

    mrp: {
      type: Number,
      default: 0,
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

    /* ==========================================
       PRODUCT SPECS
    ========================================== */

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

    /* ==========================================
       COSTING SNAPSHOT
    ========================================== */

    calculatedCurrentCost: {
      type: Number,
      default: 0,
    },

    calculatedSafeCost: {
      type: Number,
      default: 0,
    },

    calculatedWorstCost: {
      type: Number,
      default: 0,
    },

    /* ==========================================
       APPROVAL
    ========================================== */

    approvalStatus: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
      ],
      default: "DRAFT",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,

    rejectionReason: String,

    /* ==========================================
       LINKED CATALOG
    ========================================== */

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
    },

    /* ==========================================
       STATUS
    ========================================== */

    active: {
      type: Boolean,
      default: true,
    },

    submittedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

VendorProductSchema.index({
  vendorId: 1,
  approvalStatus: 1,
});

VendorProductSchema.index({
  productId: 1,
  variantId: 1,
});

export default mongoose.models.VendorProduct ||
  mongoose.model(
    "VendorProduct",
    VendorProductSchema
  );

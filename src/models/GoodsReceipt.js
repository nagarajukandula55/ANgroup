import mongoose from "mongoose";

const GoodsReceiptSchema = new mongoose.Schema(
  {
    /* =========================================================
       BUSINESS
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

    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
      index: true,
    },

    /* =========================================================
       DOCUMENT
    ========================================================= */

    grnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    purchaseOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      default: null,
    },

    invoiceNumber: {
      type: String,
      trim: true,
    },

    invoiceDate: Date,

    receiptDate: {
      type: Date,
      default: Date.now,
    },

    /* =========================================================
       SUMMARY
    ========================================================= */

    totalItems: {
      type: Number,
      default: 0,
    },

    totalReceivedQty: {
      type: Number,
      default: 0,
    },

    totalAcceptedQty: {
      type: Number,
      default: 0,
    },

    totalRejectedQty: {
      type: Number,
      default: 0,
    },

    totalValue: {
      type: Number,
      default: 0,
    },

    /* =========================================================
       STATUS
    ========================================================= */

    status: {
      type: String,
      enum: [
        "DRAFT",
        "VERIFIED",
        "POSTED",
        "CANCELLED",
      ],
      default: "DRAFT",
      index: true,
    },

    remarks: {
      type: String,
      trim: true,
    },

    /* =========================================================
       AUDIT
    ========================================================= */

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    verifiedAt: Date,

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    postedAt: Date,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/* =========================================================
   INDEXES
========================================================= */

GoodsReceiptSchema.index({
  warehouseId: 1,
  receiptDate: -1,
});

GoodsReceiptSchema.index({
  vendorId: 1,
  status: 1,
});

GoodsReceiptSchema.index({
  businessId: 1,
  status: 1,
});

export default mongoose.models.GoodsReceipt ||
  mongoose.model("GoodsReceipt", GoodsReceiptSchema);

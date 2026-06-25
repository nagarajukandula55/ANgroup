import mongoose from "mongoose";

const MaterialPriceHistorySchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
        index: true,
      },

      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
      },

      price: {
        type: Number,
        required: true,
        min: 0,
      },

      priceUnit: {
        type: String,
        default: "KG",
      },

      currency: {
        type: String,
        default: "INR",
      },

      effectiveDate: {
        type: Date,
        required: true,
      },

      source: {
        type: String,
        enum: [
          "MANUAL",
          "PURCHASE_ORDER",
          "GOODS_RECEIPT",
          "IMPORT",
          "SYSTEM",
        ],
        default: "MANUAL",
      },

      sourceReferenceId: {
        type: mongoose.Schema.Types.ObjectId,
      },

      sourceReferenceType: {
        type: String,
        enum: [
          "PURCHASE_ORDER",
          "GOODS_RECEIPT",
          "MANUAL",
          "IMPORT",
        ],
      },

      approved: {
        type: Boolean,
        default: true,
      },

      approvedAt: Date,

      remarks: {
        type: String,
        default: "",
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

MaterialPriceHistorySchema.index({
  materialId: 1,
  effectiveDate: -1,
});

MaterialPriceHistorySchema.index({
  materialId: 1,
  vendorId: 1,
  effectiveDate: -1,
});

MaterialPriceHistorySchema.index({
  materialId: 1,
  warehouseId: 1,
  effectiveDate: -1,
});

export default mongoose.models.MaterialPriceHistory ||
  mongoose.model(
    "MaterialPriceHistory",
    MaterialPriceHistorySchema
  );

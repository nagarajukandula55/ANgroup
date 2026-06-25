import mongoose from "mongoose";

const StockAdjustmentItemSchema =
  new mongoose.Schema(
    {
      itemType: {
        type: String,
        enum: [
          "MATERIAL",
          "PRODUCT_VARIANT",
        ],
        required: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
      },

      productVariantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant",
      },

      systemQty: {
        type: Number,
        required: true,
        default: 0,
      },

      physicalQty: {
        type: Number,
        required: true,
        default: 0,
      },

      adjustmentQty: {
        type: Number,
        required: true,
        default: 0,
      },

      unitCost: {
        type: Number,
        default: 0,
      },

      totalCostImpact: {
        type: Number,
        default: 0,
      },

      remarks: String,
    },
    {
      _id: false,
    }
  );

const StockAdjustmentSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },

      adjustmentNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      adjustmentType: {
        type: String,
        enum: [
          "PHYSICAL_COUNT",
          "DAMAGE",
          "EXPIRED",
          "LOSS",
          "THEFT",
          "CORRECTION",
          "OPENING_STOCK",
        ],
        required: true,
      },

      adjustmentDate: {
        type: Date,
        default: Date.now,
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "APPROVED",
          "POSTED",
          "CANCELLED",
        ],
        default: "DRAFT",
      },

      items: [StockAdjustmentItemSchema],

      totalCostImpact: {
        type: Number,
        default: 0,
      },

      remarks: String,

      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },

      approvedAt: Date,

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

StockAdjustmentSchema.index({
  warehouseId: 1,
  adjustmentDate: -1,
});

export default mongoose.models.StockAdjustment ||
  mongoose.model(
    "StockAdjustment",
    StockAdjustmentSchema
  );

import mongoose from "mongoose";

const StockMovementSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      movementType: {
        type: String,
        enum: [
          "PURCHASE",
          "GRN",
          "PRODUCTION_IN",
          "PRODUCTION_OUT",
          "SALES",
          "RETURN",
          "ADJUSTMENT",
          "TRANSFER_IN",
          "TRANSFER_OUT",
        ],
        required: true,
      },

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

      quantity: {
        type: Number,
        required: true,
      },

      unitCost: {
        type: Number,
        default: 0,
      },

      totalCost: {
        type: Number,
        default: 0,
      },

      referenceType: {
        type: String,
        enum: [
          "PURCHASE_ORDER",
          "GOODS_RECEIPT",
          "PRODUCTION_ORDER",
          "SALES_ORDER",
          "MANUAL",
        ],
      },

      referenceId: mongoose.Schema.Types.ObjectId,

      remarks: String,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.StockMovement ||
  mongoose.model(
    "StockMovement",
    StockMovementSchema
  );

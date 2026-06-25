import mongoose from "mongoose";

const ProductionBatchSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },

      batchNumber: {
        type: String,
        required: true,
        unique: true,
      },

      productionOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductionOrder",
        required: true,
      },

      productVariantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant",
        required: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
      },

      productionDate: {
        type: Date,
        default: Date.now,
      },

      manufacturedQuantity: {
        type: Number,
        default: 0,
      },

      rejectedQuantity: {
        type: Number,
        default: 0,
      },

      netQuantity: {
        type: Number,
        default: 0,
      },

      currentCostPerUnit: {
        type: Number,
        default: 0,
      },

      safeCostPerUnit: {
        type: Number,
        default: 0,
      },

      worstCaseCostPerUnit: {
        type: Number,
        default: 0,
      },

      expiryDate: Date,

      remarks: String,

      status: {
        type: String,
        enum: [
          "DRAFT",
          "COMPLETED",
          "CANCELLED",
        ],
        default: "DRAFT",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.ProductionBatch ||
  mongoose.model(
    "ProductionBatch",
    ProductionBatchSchema
  );

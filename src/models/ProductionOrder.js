import mongoose from "mongoose";

const ProductionOrderSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },

      productionNumber: {
        type: String,
        required: true,
        unique: true,
      },

      productVariantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant",
        required: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      bomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "BOM",
      },

      plannedQty: {
        type: Number,
        required: true,
      },

      producedQty: {
        type: Number,
        default: 0,
      },

      startDate: Date,

      endDate: Date,

      status: {
        type: String,
        enum: [
          "DRAFT",
          "PLANNED",
          "IN_PROGRESS",
          "COMPLETED",
          "CANCELLED",
        ],
        default: "DRAFT",
      },

      currentCost: {
        type: Number,
        default: 0,
      },

      safeCost: {
        type: Number,
        default: 0,
      },

      worstCaseCost: {
        type: Number,
        default: 0,
      },

      remarks: String,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.ProductionOrder ||
  mongoose.model(
    "ProductionOrder",
    ProductionOrderSchema
  );

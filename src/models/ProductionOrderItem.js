import mongoose from "mongoose";

const ProductionOrderItemSchema =
  new mongoose.Schema(
    {
      productionOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductionOrder",
        required: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      requiredQty: {
        type: Number,
        required: true,
      },

      consumedQty: {
        type: Number,
        default: 0,
      },

      unit: String,

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
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.ProductionOrderItem ||
  mongoose.model(
    "ProductionOrderItem",
    ProductionOrderItemSchema
  );

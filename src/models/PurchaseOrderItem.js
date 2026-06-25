import mongoose from "mongoose";

const PurchaseOrderItemSchema =
  new mongoose.Schema(
    {
      purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        required: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      unit: {
        type: String,
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
      },

      rate: {
        type: Number,
        required: true,
      },

      taxPercent: {
        type: Number,
        default: 0,
      },

      discountPercent: {
        type: Number,
        default: 0,
      },

      amount: {
        type: Number,
        default: 0,
      },

      receivedQuantity: {
        type: Number,
        default: 0,
      },

      pendingQuantity: {
        type: Number,
        default: 0,
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.PurchaseOrderItem ||
  mongoose.model(
    "PurchaseOrderItem",
    PurchaseOrderItemSchema
  );

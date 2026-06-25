import mongoose from "mongoose";

const PurchaseOrderItemSchema =
  new mongoose.Schema(
    {
      purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
        required: true,
        index: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      quantity: {
        type: Number,
        required: true,
        min: 0,
      },

      unit: String,

      rate: {
        type: Number,
        default: 0,
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

      receivedQty: {
        type: Number,
        default: 0,
      },

      pendingQty: {
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

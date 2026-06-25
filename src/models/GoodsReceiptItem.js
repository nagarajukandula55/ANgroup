import mongoose from "mongoose";

const GoodsReceiptItemSchema =
  new mongoose.Schema(
    {
      goodsReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoodsReceipt",
        required: true,
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      purchaseOrderItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrderItem",
      },

      orderedQty: {
        type: Number,
        default: 0,
      },

      receivedQty: {
        type: Number,
        default: 0,
      },

      acceptedQty: {
        type: Number,
        default: 0,
      },

      rejectedQty: {
        type: Number,
        default: 0,
      },

      rate: {
        type: Number,
        default: 0,
      },

      remarks: String,
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.GoodsReceiptItem ||
  mongoose.model(
    "GoodsReceiptItem",
    GoodsReceiptItemSchema
  );

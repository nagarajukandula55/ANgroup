import mongoose from "mongoose";

const GoodsReceiptItemSchema =
  new mongoose.Schema(
    {
      goodsReceiptId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "GoodsReceipt",
        required: true,
        index: true,
      },

      purchaseOrderItemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrderItem",
      },

      materialId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Material",
        required: true,
      },

      orderedQty: {
        type: Number,
        default: 0,
      },

      receivedQty: {
        type: Number,
        required: true,
      },

      acceptedQty: {
        type: Number,
        default: 0,
      },

      rejectedQty: {
        type: Number,
        default: 0,
      },

      unitCost: {
        type: Number,
        default: 0,
      },

      lotNumber: String,

      expiryDate: Date,

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

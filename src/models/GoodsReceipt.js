import mongoose from "mongoose";

const GoodsReceiptSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },

      grnNumber: {
        type: String,
        required: true,
        unique: true,
      },

      purchaseOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "PurchaseOrder",
      },

      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Vendor",
        required: true,
      },

      warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      receiptDate: {
        type: Date,
        default: Date.now,
      },

      invoiceNumber: String,

      invoiceDate: Date,

      remarks: String,

      status: {
        type: String,
        enum: [
          "DRAFT",
          "RECEIVED",
          "CLOSED",
        ],
        default: "DRAFT",
      },
    },
    {
      timestamps: true,
    }
  );

export default mongoose.models.GoodsReceipt ||
  mongoose.model(
    "GoodsReceipt",
    GoodsReceiptSchema
  );

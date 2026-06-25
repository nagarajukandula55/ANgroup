import mongoose from "mongoose";

const PurchaseOrderSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Business",
      },

      poNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
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

      orderDate: {
        type: Date,
        default: Date.now,
      },

      expectedDate: Date,

      status: {
        type: String,
        enum: [
          "DRAFT",
          "APPROVED",
          "PARTIAL_RECEIVED",
          "RECEIVED",
          "CANCELLED",
        ],
        default: "DRAFT",
      },

      subtotal: {
        type: Number,
        default: 0,
      },

      taxAmount: {
        type: Number,
        default: 0,
      },

      discountAmount: {
        type: Number,
        default: 0,
      },

      totalAmount: {
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

export default mongoose.models.PurchaseOrder ||
  mongoose.model(
    "PurchaseOrder",
    PurchaseOrderSchema
  );

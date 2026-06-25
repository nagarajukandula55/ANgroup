import mongoose from "mongoose";

const StockTransferSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
      },

      transferNumber: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
      },

      fromWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      toWarehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
      },

      transferDate: {
        type: Date,
        default: Date.now,
      },

      status: {
        type: String,
        enum: [
          "DRAFT",
          "APPROVED",
          "IN_TRANSIT",
          "RECEIVED",
          "CANCELLED",
        ],
        default: "DRAFT",
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

export default mongoose.models.StockTransfer ||
  mongoose.model(
    "StockTransfer",
    StockTransferSchema
  );

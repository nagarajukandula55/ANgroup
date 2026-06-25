import mongoose from "mongoose";

const GRNSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
    },

    grnNumber: {
      type: String,
      required: true,
      unique: true,
    },

    poId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: true,
      index: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: true,
    },

    receivedDate: {
      type: Date,
      default: Date.now,
    },

    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: true,
        },
        receivedQty: Number,
        rejectedQty: {
          type: Number,
          default: 0,
        },
        unitPrice: Number,
      },
    ],

    status: {
      type: String,
      enum: ["DRAFT", "POSTED", "CANCELLED"],
      default: "POSTED",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.models.GRN || mongoose.model("GRN", GRNSchema);

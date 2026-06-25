import mongoose from "mongoose";

const SalesInvoiceSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },

    customerName: String,

    items: [
      {
        materialId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Material",
          required: true,
        },

        quantity: Number,

        rate: Number,

        total: Number,
      },
    ],

    totalAmount: {
      type: Number,
      default: 0,
    },

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

export default mongoose.models.SalesInvoice ||
  mongoose.model("SalesInvoice", SalesInvoiceSchema);

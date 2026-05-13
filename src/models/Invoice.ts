import mongoose from "mongoose";

const InvoiceItemSchema =
  new mongoose.Schema(
    {
      productId: String,

      name: String,

      hsn: String,

      qty: Number,

      price: Number,

      taxableValue: Number,

      gstPercent: Number,

      cgst: Number,

      sgst: Number,

      igst: Number,

      total: Number,
    },
    {
      _id: false,
    }
  );

const InvoiceSchema =
  new mongoose.Schema(
    {
      businessId: {
        type: String,
        required: true,
        index: true,
      },

      orderId: {
        type: String,
        index: true,
      },

      invoiceNumber: {
        type: String,
        unique: true,
        required: true,
        index: true,
      },

      invoiceType: {
        type: String,
        default: "TAX",
      },

      financialYear: String,

      customer: {
        name: String,

        phone: String,

        email: String,

        gstNumber: String,

        address: String,

        city: String,

        state: String,

        pincode: String,
      },

      items: [InvoiceItemSchema],

      subtotal: Number,

      discount: Number,

      taxableAmount: Number,

      cgst: Number,

      sgst: Number,

      igst: Number,

      grandTotal: Number,

      paymentStatus: {
        type: String,
        default: "PENDING",
      },

      status: {
        type: String,
        default: "GENERATED",
      },

      generatedAt: {
        type: Date,
        default: Date.now,
      },

      locked: {
        type: Boolean,
        default: true,
      },

      pdfUrl: String,

      irn: String,

      ackNo: String,

      ackDate: Date,
    },
    {
      timestamps: true,
    }
  );

export default
  mongoose.models.Invoice ||
  mongoose.model(
    "Invoice",
    InvoiceSchema
  );

import mongoose from "mongoose";

/* ================= SAFE NUMBER ================= */
const safeNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ================= ITEM SNAPSHOT ================= */
const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    name: String,
    sku: String,
    image: String,
    variant: String,

    price: { type: Number, required: true, set: safeNumber },
    qty: { type: Number, required: true, set: safeNumber },

    gstPercent: { type: Number, default: 0 },

    hsn: { type: String, default: "NA" },

    baseAmount: Number,
    taxableAmount: Number,

    cgst: Number,
    sgst: Number,
    igst: Number,

    total: Number,

    snapshot: {
      brand: String,
      category: String,
      weight: Number,
    },
  },
  { _id: false }
);

/* ================= ADDRESS ================= */
const AddressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,

    address: String,
    city: String,
    state: String,
    country: { type: String, default: "India" },
    pincode: String,

    gstNumber: String,
    gstType: {
      type: String,
      enum: ["B2C", "B2B"],
      default: "B2C",
    },
  },
  { _id: false }
);

/* ================= BILLING ================= */
const BillingSchema = new mongoose.Schema(
  {
    currency: { type: String, default: "INR" },

    subtotal: Number,
    discount: Number,

    taxableAmount: Number,

    cgst: Number,
    sgst: Number,
    igst: Number,

    totalGST: Number,

    roundOff: Number,

    grandTotal: Number,

    locked: { type: Boolean, default: true },
  },
  { _id: false }
);

/* ================= PAYMENT ================= */
const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["RAZORPAY", "UPI", "COD"],
      default: "RAZORPAY",
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED", "REFUNDED"],
      default: "PENDING",
    },

    amountPaid: Number,

    razorpay_order_id: String,
    razorpay_payment_id: String,
    razorpay_signature: String,

    utr: String,

    paidAt: Date,
  },
  { _id: false }
);

/* ================= INVOICE ================= */
const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, unique: true, index: true },

    generatedAt: Date,

    invoiceUrl: String,
    pdfUrl: String,

    billingSnapshot: Object,
  },
  { _id: false }
);

/* ================= RECEIPT ================= */
const ReceiptSchema = new mongoose.Schema(
  {
    receiptNumber: { type: String, unique: true, index: true },

    generatedAt: Date,

    amountPaid: Number,
    paymentMode: String,

    receiptUrl: String,
    pdfUrl: String,
  },
  { _id: false }
);

/* ================= SHIPPING ================= */
const ShippingSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["NEW", "PACKED", "SHIPPED", "DELIVERED"],
      default: "NEW",
    },

    courier: String,
    awbNumber: String,

    trackingUrl: String,
    shippedAt: Date,
    deliveredAt: Date,
  },
  { _id: false }
);

/* ================= MAIN ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      index: true,
    },

    userId: String,

    items: [OrderItemSchema],

    billing: BillingSchema,

    amount: {
      type: Number,
      required: true,
      set: safeNumber,
    },

    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "PAID",
        "PROCESSING",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "FAILED",
        "REFUNDED",
      ],
      default: "PENDING_PAYMENT",
    },

    address: AddressSchema,

    payment: PaymentSchema,

    invoice: InvoiceSchema,

    receipt: ReceiptSchema,

    shipping: ShippingSchema,

    coupon: String,

    discount: Number,

    gstType: {
      type: String,
      enum: ["B2C", "B2B"],
      default: "B2C",
    },

    gstMode: {
      type: String,
      enum: ["IGST", "CGST_SGST"],
    },

    events: [
      {
        type: String,
        data: Object,
        at: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/* ================= INDEXES ================= */
OrderSchema.index({ "payment.razorpay_payment_id": 1 });
OrderSchema.index({ "invoice.invoiceNumber": 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

const Order =
  mongoose.models.Order || mongoose.model("Order", OrderSchema);

export default Order;

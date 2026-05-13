import mongoose from "mongoose";

/* ================= ORDER ITEMS ================= */
const OrderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: String,
    qty: { type: Number, required: true },
    price: { type: Number, required: true },
    variant: String,
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
    pincode: String,
    gstNumber: String,
  },
  { _id: false }
);

/* ================= INVOICE ================= */
const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: String,
    invoiceUrl: String,
    generatedAt: Date,
  },
  { _id: false }
);

/* ================= PAYMENT (FIXED STATE MACHINE) ================= */
const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["RAZORPAY", "UPI", "COD"],
    },

    status: {
      type: String,
      enum: [
        "NOT_INITIATED",
        "INITIATED",
        "SUCCESS",
        "FAILED",
        "REFUNDED",
      ],
      default: "NOT_INITIATED",
    },

    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { _id: false }
);

/* ================= ORDER ================= */
const OrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, index: true },

    businessId: { type: String, index: true },
    userId: { type: String, index: true },

    cart: [OrderItemSchema],

    address: AddressSchema,

    amount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    coupon: String,

    taxItems: Array,
    gstType: String,
    gstMode: String,

    /* ================= ORDER LIFECYCLE ================= */
    status: {
      type: String,
      enum: [
        "CREATED",
        "PENDING_PAYMENT",
        "PAID",
        "FAILED",
        "CANCELLED",
        "SHIPPED",
      ],
      default: "CREATED",
    },

    payment: PaymentSchema,
    invoice: InvoiceSchema,
  },
  { timestamps: true }
);

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

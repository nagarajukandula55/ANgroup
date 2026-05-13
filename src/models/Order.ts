import mongoose from "mongoose";

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

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: String,
    invoiceUrl: String,
    generatedAt: Date,
  },
  { _id: false }
);

const PaymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: ["RAZORPAY", "UPI", "COD"],
    },
    status: {
      type: String,
      enum: [
        "CREATED",
        "PENDING_PAYMENT",
        "PAID",
        "FAILED",
        "CANCELLED",
        "REFUNDED"
      ],
      default: "CREATED",
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { _id: false }
);

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

    status: {
      type: String,
      enum: ["CREATED", "PROCESSING", "PAID", "FAILED", "SHIPPED"],
      default: "CREATED",
    },

    payment: PaymentSchema,

    invoice: InvoiceSchema,
  },
  { timestamps: true }
);

export default mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

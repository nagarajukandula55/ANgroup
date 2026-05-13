import mongoose, { Schema, Document, Model } from "mongoose";

/* ================= ORDER ITEM ================= */
export interface IOrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  variant?: string;
}

/* ================= ORDER ================= */
export interface IOrder extends Document {
  orderId: string;

  businessId?: string;

  userId?: string;

  items: IOrderItem[];

  address: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    gstNumber?: string;
  };

  pricing: {
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
  };

  payment: {
    method: "RAZORPAY" | "UPI" | "COD";
    status: "PENDING" | "PAID" | "FAILED" | "REFUNDED";

    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  };

  gst: {
    type: "B2B" | "B2C";
    mode: "IGST" | "CGST_SGST";
    gstNumber?: string;
  };

  invoice: {
    invoiceNumber?: string;
    invoiceUrl?: string;
  };

  status:
    | "CREATED"
    | "CONFIRMED"
    | "PACKED"
    | "SHIPPED"
    | "DELIVERED"
    | "CANCELLED";

  createdAt: Date;
  updatedAt: Date;
}

/* ================= ORDER SCHEMA ================= */
const OrderSchema = new Schema<IOrder>(
  {
    orderId: { type: String, required: true, unique: true, index: true },

    businessId: { type: String, index: true },
    userId: { type: String, index: true },

    items: [
      {
        productId: { type: String, required: true },
        name: String,
        qty: Number,
        price: Number,
        variant: String,
      },
    ],

    address: {
      name: String,
      phone: String,
      email: String,
      address: String,
      city: String,
      state: String,
      pincode: String,
      gstNumber: String,
    },

    pricing: {
      subtotal: Number,
      tax: Number,
      discount: Number,
      total: Number,
    },

    payment: {
      method: {
        type: String,
        enum: ["RAZORPAY", "UPI", "COD"],
        default: "UPI",
      },
      status: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
        default: "PENDING",
      },
      razorpayOrderId: String,
      razorpayPaymentId: String,
    },

    gst: {
      type: { type: String, enum: ["B2B", "B2C"], default: "B2C" },
      mode: { type: String, enum: ["IGST", "CGST_SGST"], default: "CGST_SGST" },
      gstNumber: String,
    },

    invoice: {
      invoiceNumber: String,
      invoiceUrl: String,
    },

    status: {
      type: String,
      enum: [
        "CREATED",
        "CONFIRMED",
        "PACKED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
      ],
      default: "CREATED",
    },
  },
  {
    timestamps: true,
  }
);

/* ================= SAFE EXPORT ================= */
const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;

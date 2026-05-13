import mongoose from "mongoose";

/* =========================================================
   ORDER ITEMS
========================================================= */

const OrderItemSchema =
  new mongoose.Schema(
    {
      productId: {
        type: String,
        required: true,
        index: true,
      },

      sku: String,

      name: {
        type: String,
        required: true,
      },

      variant: String,

      hsn: String,

      qty: {
        type: Number,
        required: true,
        min: 1,
      },

      price: {
        type: Number,
        required: true,
      },

      mrp: Number,

      taxableValue: Number,

      gstPercent: {
        type: Number,
        default: 0,
      },

      cgst: {
        type: Number,
        default: 0,
      },

      sgst: {
        type: Number,
        default: 0,
      },

      igst: {
        type: Number,
        default: 0,
      },

      total: Number,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   CUSTOMER ADDRESS
========================================================= */

const AddressSchema =
  new mongoose.Schema(
    {
      name: String,

      phone: String,

      email: String,

      companyName: String,

      gstNumber: String,

      address: String,

      landmark: String,

      city: String,

      district: String,

      state: String,

      country: {
        type: String,
        default: "India",
      },

      pincode: String,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   PAYMENT
========================================================= */

const PaymentSchema =
  new mongoose.Schema(
    {
      method: {
        type: String,

        enum: [
          "RAZORPAY",
          "UPI",
          "COD",
          "BANK_TRANSFER",
          "CASH",
        ],

        default: "UPI",
      },

      status: {
        type: String,

        enum: [
          "NOT_INITIATED",
          "INITIATED",
          "PENDING",
          "SUCCESS",
          "FAILED",
          "REFUNDED",
          "PARTIAL_REFUND",
        ],

        default: "NOT_INITIATED",
      },

      amountPaid: {
        type: Number,
        default: 0,
      },

      transactionId: String,

      utr: String,

      gateway: String,

      gatewayOrderId: String,

      gatewayPaymentId: String,

      gatewaySignature: String,

      paidAt: Date,

      refundedAt: Date,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   INVOICE
========================================================= */

const InvoiceSchema =
  new mongoose.Schema(
    {
      invoiceId: String,

      invoiceNumber: String,

      invoiceType: {
        type: String,

        enum: [
          "TAX",
          "B2B",
          "B2C",
          "POS",
          "PROFORMA",
          "CN",
          "DN",
        ],

        default: "TAX",
      },

      financialYear: String,

      invoiceUrl: String,

      generatedAt: Date,

      pdfGenerated: {
        type: Boolean,
        default: false,
      },

      locked: {
        type: Boolean,
        default: true,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   SHIPPING
========================================================= */

const ShippingSchema =
  new mongoose.Schema(
    {
      dispatchType: {
        type: String,

        enum: [
          "COURIER",
          "BY_HAND",
          "LOCAL_DELIVERY",
        ],
      },

      courierPartner: String,

      courierId: String,

      awbNumber: String,

      trackingUrl: String,

      trackingStatus: String,

      labelUrl: String,

      shippedAt: Date,

      deliveredAt: Date,
    },
    {
      _id: false,
    }
  );

/* =========================================================
   ORDER EVENTS / AUDIT TRAIL
========================================================= */

const EventSchema =
  new mongoose.Schema(
    {
      type: String,

      message: String,

      by: String,

      data: Object,

      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
    {
      _id: false,
    }
  );

/* =========================================================
   MAIN ORDER
========================================================= */

const OrderSchema =
  new mongoose.Schema(
    {
      /* ================= IDs ================= */

      orderId: {
        type: String,
        unique: true,
        required: true,
        index: true,
      },

      businessId: {
        type: String,
        index: true,
      },

      branchId: {
        type: String,
        index: true,
      },

      userId: {
        type: String,
        index: true,
      },

      customerId: {
        type: String,
        index: true,
      },

      /* ================= CART ================= */

      cart: [OrderItemSchema],

      /* ================= CUSTOMER ================= */

      address: AddressSchema,

      /* ================= MONEY ================= */

      subtotal: {
        type: Number,
        default: 0,
      },

      discount: {
        type: Number,
        default: 0,
      },

      taxableAmount: {
        type: Number,
        default: 0,
      },

      cgst: {
        type: Number,
        default: 0,
      },

      sgst: {
        type: Number,
        default: 0,
      },

      igst: {
        type: Number,
        default: 0,
      },

      gstTotal: {
        type: Number,
        default: 0,
      },

      shippingCharges: {
        type: Number,
        default: 0,
      },

      roundOff: {
        type: Number,
        default: 0,
      },

      amount: {
        type: Number,
        required: true,
      },

      /* ================= GST ================= */

      gstType: {
        type: String,

        enum: [
          "B2B",
          "B2C",
          "EXPORT",
        ],

        default: "B2C",
      },

      gstMode: {
        type: String,

        enum: [
          "CGST_SGST",
          "IGST",
        ],

        default: "CGST_SGST",
      },

      taxItems: {
        type: Array,
        default: [],
      },

      /* ================= COUPON ================= */

      coupon: String,

      /* ================= STATUS ================= */

      status: {
        type: String,

        enum: [
          "CREATED",

          "PENDING_PAYMENT",

          "PAID",

          "PROCESSING",

          "PACKED",

          "DISPATCHED",

          "DELIVERED",

          "COMPLETED",

          "FAILED",

          "CANCELLED",

          "RETURNED",

          "REFUNDED",
        ],

        default: "CREATED",

        index: true,
      },

      /* ================= PAYMENT ================= */

      payment: PaymentSchema,

      /* ================= INVOICE ================= */

      invoice: InvoiceSchema,

      /* ================= SHIPPING ================= */

      shipping: ShippingSchema,

      /* ================= ERP FLAGS ================= */

      source: {
        type: String,

        enum: [
          "WEB",
          "NATIVE",
          "POS",
          "ADMIN",
          "MOBILE_APP",
          "API",
        ],

        default: "NATIVE",
      },

      paymentVerified: {
        type: Boolean,
        default: false,
      },

      stockReserved: {
        type: Boolean,
        default: false,
      },

      invoiceGenerated: {
        type: Boolean,
        default: false,
      },

      shipmentCreated: {
        type: Boolean,
        default: false,
      },

      locked: {
        type: Boolean,
        default: false,
      },

      /* ================= EVENTS ================= */

      events: {
        type: [EventSchema],
        default: [],
      },

      /* ================= NOTES ================= */

      internalNotes: String,

      customerNotes: String,
    },
    {
      timestamps: true,
    }
  );

/* =========================================================
   INDEXES
========================================================= */

OrderSchema.index({
  createdAt: -1,
});

OrderSchema.index({
  businessId: 1,
  status: 1,
});

OrderSchema.index({
  "payment.status": 1,
});

OrderSchema.index({
  "shipping.awbNumber": 1,
});

/* =========================================================
   EXPORT
========================================================= */

export default
  mongoose.models.Order ||
  mongoose.model(
    "Order",
    OrderSchema
  );

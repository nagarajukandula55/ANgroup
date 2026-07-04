import mongoose from "mongoose";

/* =========================================================
   ORDER ITEMS
========================================================= */

const OrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      index: true,
    },

    /* Vendor fulfilment linkage — which vendor supplies this line item.
       Stamped from the approved vendor product at order time so the order
       can be routed to the vendor for confirmation (B2B/B2C invoice flow). */
    vendorId: {
      type: String,
      index: true,
      default: null,
    },

    sku: {
      type: String,
      default: "",
    },

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

    /* ================= PRICING ================= */

    price: {
      type: Number,
      required: true,
    },

    sellingPrice: Number,

    mrp: Number,

    baseTotal: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    taxableValue: {
      type: Number,
      default: 0,
    },

    /* ================= GST ================= */

    gstRate: {
      type: Number,
      default: 0,
    },

    gstPercent: {
      type: Number,
      default: 0,
    },

    gstAmount: {
      type: Number,
      default: 0,
    },

    cgstAmount: {
      type: Number,
      default: 0,
    },

    sgstAmount: {
      type: Number,
      default: 0,
    },

    igstAmount: {
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

    lineTotal: {
      type: Number,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   CUSTOMER ADDRESS
========================================================= */

const AddressSchema = new mongoose.Schema(
  {
    name: String,

    phone: {
      type: String,
      index: true,
    },

    email: String,

    companyName: String,

    gstNumber: String,

    address: String,

    addressLine1: String,

    addressLine2: String,

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

const PaymentSchema = new mongoose.Schema(
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

    gateway: {
      type: String,
      default: "RAZORPAY",
    },

    gatewayOrderId: {
      type: String,
      index: true,
    },

    gatewayPaymentId: {
      type: String,
      index: true,
      sparse: true,
    },

    gatewaySignature: String,

    rawWebhook: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

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

const InvoiceSchema = new mongoose.Schema(
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
      default: false,
    },
  },
  {
    _id: false,
  }
);

/* =========================================================
   SHIPPING
========================================================= */

const ShippingSchema = new mongoose.Schema(
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

   shipmentCreated: {
     type: Boolean,
     default: false,
   },

   manifestId: String,

   shipmentId: String,
   
   shippingCost: Number,
   
   rtoStatus: String,
   
   rtoDeliveredAt: Date,
  },
  {
    _id: false,
  }
);

/* =========================================================
   EVENTS
========================================================= */

const EventSchema = new mongoose.Schema(
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

const OrderSchema = new mongoose.Schema(
  {
    /* ================= IDS ================= */

    orderId: {
      type: String,
      required: true,
      unique: true,
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

   project: {
     code: {
       type: String,
       default: "NATIVE",
       index: true,
     },
   
     name: {
       type: String,
       default: "Native",
     },
   },

    userId: {
      type: String,
      index: true,
    },

   customerId: {
     type: String,
     index: true,
   },
   
   customer: {
     name: String,
     phone: String,
     email: String,
   },

   packageDetails: {
     weight: {
       type: Number,
       default: 0,
     },
   
     length: {
       type: Number,
       default: 0,
     },
   
     breadth: {
       type: Number,
       default: 0,
     },
   
     height: {
       type: Number,
       default: 0,
     },
   
     packageType: {
       type: String,
       default: "BOX",
     },
   },

    /* ================= CART ================= */

    cart: {
      type: [OrderItemSchema],
      default: [],
    },

    /* ================= ADDRESS ================= */

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
      enum: ["B2B", "B2C", "EXPORT"],
      default: "B2C",
    },

    gstMode: {
      type: String,
      enum: ["CGST_SGST", "IGST"],
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
        "PAYMENT_FAILED",
        "CANCELLED",
        "RETURNED",
        "REFUNDED",
        "EXPIRED",
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

    /* ================= FLAGS ================= */

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

    expiresAt: {
      type: Date,
      index: true,
    },

    orderHash: String,

    /* ================= EVENTS ================= */

    events: {
      type: [EventSchema],
      default: [],
    },

   timeline: [
     {
       status: String,
   
       note: String,
   
       by: String,
   
       role: String,
   
       at: {
         type: Date,
         default: Date.now,
       },
     },
   ],

   notes: {
        type: Array,
        default: [],
      },

   statusHistory: [
     {
       from: String,
       to: String,
       by: String,
       at: {
         type: Date,
         default: Date.now,
       },
     },
   ],

   processingLocked: {
     type: Boolean,
     default: false,
   },
   
   priorityOrder: {
     type: Boolean,
     default: false,
   },
   
   fraudFlag: {
     type: Boolean,
     default: false,
   },

   assignedTo: {
     userId: String,
     name: String,
     role: String,
   },

   warehouse: {
     warehouseId: String,
     warehouseName: String,
   },

   sla: {
     dispatchBy: Date,
     deliverBy: Date,
     priority: String,
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

OrderSchema.index({ createdAt: -1 });

OrderSchema.index({
  businessId: 1,
  status: 1,
});

OrderSchema.index({
  "payment.status": 1,
});

OrderSchema.index({
  "payment.gatewayPaymentId": 1,
});

OrderSchema.index({
  "shipping.awbNumber": 1,
});

OrderSchema.index({
  expiresAt: 1,
});

OrderSchema.index({
  "address.phone": 1,
  status: 1,
});

OrderSchema.index({
  project: 1,
  createdAt: -1,
});

OrderSchema.index({
  status: 1,
  createdAt: -1,
});

OrderSchema.index({
  "shipping.awbNumber": 1,
  status: 1,
});

/* =========================================================
   EXPORT
========================================================= */

const Order =
  mongoose.models.Order ||
  mongoose.model("Order", OrderSchema);

export default Order;

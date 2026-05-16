import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { connectNativeDB } from "@/lib/native-mongodb";
import { getProductModel } from "@/models/Product";
import { validateCoupon } from "@/lib/coupon";
import crypto from "crypto";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

const nativeConn = await connectNativeDB();
const Product = getProductModel(nativeConn);

/* =========================================================
   CORS (ERP SAFE)
 ========================================================= */

const allowedOrigins = [
  "https://shopnative.in",
  "https://www.shopnative.in",
];

const corsHeaders = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const getCorsHeaders = (origin?: string | null) => ({
  ...corsHeaders,
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin)
      ? origin
      : "https://shopnative.in",
});

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return NextResponse.json(
    {},
    {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin":
          origin && allowedOrigins.includes(origin)
            ? origin
            : "https://shopnative.in",
      },
    }
  );
}

/* =========================================================
   ORDER ID
========================================================= */

async function generateOrderId() {
  const now = new Date();

  const ts =
    now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  const random = Math.floor(Math.random() * 9000 + 1000);

  return `NA-ORD-${ts}-${random}`;
}

/* =========================================================
   HASH
========================================================= */

function stableHash(obj: any) {
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash("sha256").update(sorted).digest("hex");
}
   
const money = (v: number) =>
  Number(v.toFixed(2));

/* =========================================================
   MAIN API
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      source = "NATIVE",
      cart,
      address,
      paymentMethod,
      coupon = "",
      gstType = "B2C",
    } = body;

     console.log(
        "INCOMING CART:",
        JSON.stringify(cart, null, 2)
      );

    const origin = req.headers.get("origin");

   const isAllowedOrigin =
     !origin || allowedOrigins.includes(origin);

    if (!isAllowedOrigin) {
      return NextResponse.json(
        { success: false, message: "Unauthorized origin" },
        { status: 403, headers: getCorsHeaders(origin) }
      );
    }

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart empty" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    const pincodeRegex = /^\d{6}$/;

    if (
      !address?.name ||
      !address?.phone ||
      !address?.address ||
      !address?.city ||
      !address?.state ||
      !address?.pincode
    ) {
      return NextResponse.json(
        { success: false, message: "Incomplete address" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }
     const COMPANY_STATE = "Andhra Pradesh";

     const allowedGstModes = [
        "CGST_SGST",
        "IGST",
      ];

      const isInterState =
        address.state?.trim()?.toLowerCase() !==
        COMPANY_STATE.toLowerCase();
      
      const resolvedGstMode =
        isInterState
          ? "IGST"
          : "CGST_SGST";

    if (!phoneRegex.test(address.phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    if (!pincodeRegex.test(address.pincode)) {
      return NextResponse.json(
        { success: false, message: "Invalid pincode" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

    const allowedPaymentMethods = ["RAZORPAY", "UPI"];

    if (!allowedPaymentMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment method" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

/* =========================================================
   GST MODE VALIDATION
========================================================= */

const gstMode = resolvedGstMode;

if (!allowedGstModes.includes(gstMode)) {
  throw new Error("Invalid GST mode");
}

/* =========================================================
   PROCESS CART
========================================================= */

const processedCartRaw = await Promise.all(
  cart.map(async (item: any) => {
    const qty = Number(item.qty);

    if (!item.productId) throw new Error("Invalid product");
    if (!qty || qty <= 0) throw new Error("Invalid quantity");

    const searchConditions: any[] = [];

    const id = item.productId || item._id;

    let product = null;
    
    const id = item.productId || item._id;
    
    // 1. ObjectId match
    if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
      product = await Product.findById(id).lean();
    }
    
    // 2. productKey match (YOUR PRIMARY KEY)
    if (!product && item.productKey) {
      product = await Product.findOne({
        productKey: item.productKey,
        isActive: true,
        isDeleted: false,
      }).lean();
    }
    
    // 3. fallback: treat id as productKey
    if (!product && typeof id === "string") {
      product = await Product.findOne({
        productKey: id,
        isActive: true,
        isDeleted: false,
      }).lean();
    }
    
    if (!product) {
      console.log("PRODUCT NOT FOUND:", item);
      throw new Error("Product not found");
    }

    console.log("FOUND PRODUCT:", product);

    return {
      productId: product._id.toString(),
      productKey: product.productKey,
      name: product.name,
    
      qty,
    
      // ❌ WRONG (does not exist in your DB)
      // sellingPrice: product.price
    
      // ✅ CORRECT (from your structure)
      sellingPrice: product.primaryVariant?.price 
        || product.pricing?.sellingPrice 
        || 0,
    
      mrp: product.primaryVariant?.mrp 
        || product.pricing?.mrp 
        || 0,
    
      gstRate: product.tax ?? 0,
    
      baseTotal: money(
        (product.primaryVariant?.price || 0) * qty
      ),
    };
  })
);
const subtotalBeforeDiscount =
  processedCartRaw.reduce(
    (sum, item) => sum + item.baseTotal,
    0
  );

/* =========================================================
   DISTRIBUTE DISCOUNT
========================================================= */

let couponDiscount = 0;

if (coupon) {
  const result = await validateCoupon(
    coupon,
    subtotalBeforeDiscount
  );

  if (!result?.valid) {
    return NextResponse.json(
      {
        success: false,
        message: "Invalid coupon",
      },
      {
        status: 400,
        headers: getCorsHeaders(origin),
      }
    );
  }

  couponDiscount = Number(
    result.discount || 0
  );
}

const finalDiscount = Math.min(
  couponDiscount,
  subtotalBeforeDiscount
);

let distributedDiscount = 0;

const processedCart = processedCartRaw.map(
  (item, index) => {
    const ratio =
      subtotalBeforeDiscount > 0
        ? item.baseTotal /
          subtotalBeforeDiscount
        : 0;

    let itemDiscount = 0;

    if (
      index ===
      processedCartRaw.length - 1
    ) {
      itemDiscount = money(
        finalDiscount -
        distributedDiscount
      );
    } else {
      itemDiscount = money(
        finalDiscount * ratio
      );

      distributedDiscount +=
        itemDiscount;
    }

   const taxableValue = money(
     item.baseTotal - itemDiscount
   );
   
   const gstAmount = money(
     taxableValue * (item.gstRate / 100)
   );

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (gstMode === "CGST_SGST") {
      cgstAmount = money(gstAmount / 2);
      sgstAmount = money(
        gstAmount - cgstAmount
      );
    } else {
      igstAmount = gstAmount;
    }

    const lineTotal = money(
      taxableValue + gstAmount
    );

    return {
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      qty: item.qty,
      price: item.sellingPrice,
      gstRate: item.gstRate,
      baseTotal: item.baseTotal,
      discount: itemDiscount,
      taxableValue,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      lineTotal,
    };
  }
);

/* =========================================================
   TOTALS
========================================================= */

const subtotal = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.baseTotal,
    0
  )
);

const taxableAmount = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.taxableValue,
    0
  )
);

const gstTotal = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.gstAmount,
    0
  )
);

const cgst = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.cgstAmount,
    0
  )
);

const sgst = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.sgstAmount,
    0
  )
);

const igst = money(
  processedCart.reduce(
    (sum, item) =>
      sum + item.igstAmount,
    0
  )
);

    /* =========================================================
       FINAL AMOUNT
    ========================================================= */

    const shippingCharges = 0;
    const roundOff = 0;

   const amount = money(
     Math.max(
       1,
       taxableAmount +
       gstTotal +
       shippingCharges +
       roundOff
     )
   );

    /* =========================================================
       ORDER ID
    ========================================================= */

    let orderId = "";
    let exists = true;

    while (exists) {
      orderId = await generateOrderId();

      exists = !!(await Order.findOne({ orderId }));
    }

    /* =========================================================
       PAYMENT STATE
    ========================================================= */

    const orderStatus = "PENDING_PAYMENT";

    let paymentStatus = "NOT_INITIATED";

    if (paymentMethod === "RAZORPAY") paymentStatus = "INITIATED";
    if (paymentMethod === "UPI") paymentStatus = "PENDING";

    const invoiceType = gstType === "B2B" ? "B2B" : "TAX";

    /* =========================================================
       DUPLICATE ORDER CHECK
    ========================================================= */

    const existingPending = await Order.findOne({
      "address.phone": address.phone,
      status: "PENDING_PAYMENT",
      createdAt: {
        $gte: new Date(Date.now() - 15 * 60 * 1000),
      },
    });

    if (existingPending) {
      return NextResponse.json(
        {
          success: false,
          message: "You already have a pending payment order",
          orderId: existingPending.orderId,
        },
        { status: 409, headers: getCorsHeaders(origin) }
      );
    }

    /* =========================================================
       RAZORPAY
    ========================================================= */

    let razorpayOrder = null;
    let gatewayOrderId = "";

    if (paymentMethod === "RAZORPAY") {
      const Razorpay = (await import("razorpay")).default;

      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
      });

      razorpayOrder = await razorpay.orders.create({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: orderId,
        notes: { orderId },
      });

      gatewayOrderId = razorpayOrder.id;
    }

    /* =========================================================
       ORDER HASH
    ========================================================= */

   const orderHash = stableHash({
     source,
   
     orderId,
   
     cart: processedCart,
   
     address,
   
     subtotal,
   
     discount: finalDiscount,
   
     taxableAmount,
   
     cgst,
     sgst,
     igst,
   
     gstTotal,
   
     shippingCharges,
   
     roundOff,
   
     amount,
   
     coupon,
   
     gstType,
   
     gstMode,
   
     paymentMethod,
   });
    /* =========================================================
       CREATE ORDER
    ========================================================= */

    const order = await Order.create({
      source,
      orderId,

      cart: processedCart,
      address,

      subtotal,
      discount: finalDiscount,
      taxableAmount,

      cgst,
      sgst,
      igst,
      gstTotal,

      shippingCharges,
      roundOff,
      amount,

      coupon,
      gstType,
      gstMode,

      taxItems: processedCart.map((item) => ({
        productId: item.productId,
        name: item.name,
        sku: item.sku,
      
        qty: item.qty,
      
        price: item.price,
      
        gstRate: item.gstRate,
      
        baseTotal: item.baseTotal,
      
        discount: item.discount,
      
        taxableValue: item.taxableValue,
      
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount,
        igstAmount: item.igstAmount,
      
        gstAmount: item.gstAmount,
      
        lineTotal: item.lineTotal,
      })),

      status: orderStatus,

      payment: {
        method: paymentMethod,
      
        status: paymentStatus,
      
        amountPaid: 0,
      
        gatewayOrderId: razorpayOrder?.id || null,
      
        gatewayPaymentId: null,
      
        gatewaySignature: null,
      
        paidAt: null,
      },

      orderHash,

      invoice: {
        invoiceType,
      
        invoiceNumber: null,
      
        financialYear: getFinancialYear(),
      
        pdfGenerated: false,
      
        generatedAt: null,
      
        locked: false,
      },

      paymentVerified: false,
      stockReserved: false,
      invoiceGenerated: false,
      shipmentCreated: false,
      locked: false,

      expiresAt: new Date(Date.now() + 15 * 60 * 1000),

      events: [
        {
          type: "ORDER_CREATED",
          message: "Order created successfully",
          createdAt: new Date(),
        },
      ],
    });

    return NextResponse.json(
      {
        success: true,
        orderId,
        amount,
        razorpayOrder,
        summary: {
          subtotal,
          discount: finalDiscount,
          taxableAmount,
          cgst,
          sgst,
          igst,
          gstTotal,
          shippingCharges,
          roundOff,
          grandTotal: amount,
          gstMode,
          items: processedCart,
        },
      },
      {
        headers: getCorsHeaders(origin),
      }
    );

  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

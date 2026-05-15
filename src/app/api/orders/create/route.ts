import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { connectNativeDB } from "@/lib/native-mongodb";
import { getProductModel } from "@/models/Product";
import { validateCoupon } from "@/lib/coupon";
import crypto from "crypto";

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
      gstMode = "CGST_SGST",
    } = body;

    const origin = req.headers.get("origin");

    const isAllowedOrigin =
      !!origin && allowedOrigins.includes(origin);

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
      !address?.addressLine1 ||
      !address?.city ||
      !address?.state ||
      !address?.pincode
    ) {
      return NextResponse.json(
        { success: false, message: "Incomplete address" },
        { status: 400, headers: getCorsHeaders(origin) }
      );
    }

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
       PROCESS CART + GST (SOURCE OF TRUTH)
    ========================================================= */

    const processedCart = await Promise.all(
      cart.map(async (item: any) => {
        const qty = Number(item.qty);

        const product = await Product.findOne({
          _id: item.productId,
        }).lean<any>();

        if (!product) throw new Error("Product not found");

        const price = Number(product.sellingPrice ?? product.price ?? 0);
        const gstRate = Number(product.gstRate ?? 0);

        const baseTotal = price * qty;
        const gstAmount = (baseTotal * gstRate) / 100;

        return {
          productId: String(product._id),
          name: product.name,
          qty,
          price,
          gstRate,
          baseTotal,
          gstAmount,
          taxableValue: baseTotal,
          totalBeforeDiscount: baseTotal + gstAmount,
        };
      })
    );

    const subtotal = processedCart.reduce(
      (a, i) => a + i.totalBeforeDiscount,
      0
    );

    const totalGST = processedCart.reduce(
      (a, i) => a + i.gstAmount,
      0
    );

    /* =========================================================
       COUPON (APPLIED BEFORE GST BREAKUP FINALIZATION)
    ========================================================= */

    let couponDiscount = 0;

    if (coupon) {
      const result = await validateCoupon(coupon, subtotal);

      if (!result?.valid) {
        return NextResponse.json(
          { success: false, message: "Invalid coupon" },
          { status: 400, headers: getCorsHeaders(origin) }
        );
      }

      couponDiscount = Number(result.discount || 0);
    }

    const finalDiscount = Math.min(couponDiscount, subtotal);
    const taxableAmount = subtotal - finalDiscount;

    /* =========================================================
       GST DISTRIBUTION (AFTER DISCOUNT LOGIC)
    ========================================================= */

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (gstMode === "CGST_SGST") {
      cgst = totalGST / 2;
      sgst = totalGST / 2;
    } else {
      igst = totalGST;
    }

    const gstTotal = totalGST;

    /* =========================================================
       FINAL AMOUNT
    ========================================================= */

    const shippingCharges = 0;
    const roundOff = 0;

    const amount = Math.max(
      1,
      taxableAmount + gstTotal + shippingCharges + roundOff
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
      cart: processedCart.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        price: i.price,
        total: i.totalBeforeDiscount,
      })),
      subtotal,
      discount: finalDiscount,
      taxableAmount,
      gstTotal,
      amount,
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

      taxItems: processedCart,

      status: orderStatus,

      payment: {
        method: paymentMethod,
        status: paymentStatus,
        amountPaid: 0,
        gatewayOrderId,
      },

      orderHash,

      invoice: {
        invoiceType,
        pdfGenerated: false,
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
      },
      { headers: getCorsHeaders(origin) }
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

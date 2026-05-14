import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { calculateGST } from "@/lib/gst";
import Order from "@/models/Order";

/* =========================================================
   CORS (PRODUCTION SAFE)
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shopnative.in",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/* =========================================================
   ORDER ID (ERP SAFE UNIQUE FORMAT)
========================================================= */

async function generateOrderId() {
  const now = new Date();
  const year = now.getFullYear();
  const fy = `${String(year).slice(-2)}${String(year + 1).slice(-2)}`;

  const count = await Order.countDocuments();
  const serial = String(count + 1).padStart(6, "0");

  return `NA-ORD-${fy}-${serial}`;
}

/* =========================================================
   SAFE NUMBER UTILITY
========================================================= */

const n = (v: any, f = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : f;
};

/* =========================================================
   MAIN ROUTE
========================================================= */

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      source = "NATIVE",
      cart,
      address,
      paymentMethod = "COD",
      coupon = "",
      discount = 0,
      gstType = "B2C",
      gstMode = "CGST_SGST",
    } = body;

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (!Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart empty" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!address?.name || !address?.phone) {
      return NextResponse.json(
        { success: false, message: "Invalid customer info" },
        { status: 400, headers: corsHeaders }
      );
    }

    /* =========================================================
       CART NORMALIZATION (CRITICAL FIX LAYER)
    ========================================================= */

    const processedCart = cart.map((item: any) => {
      const qty = Math.max(n(item.qty, 1), 1);

      // 🔴 FIX: NEVER FAIL on missing frontend field
      const priceSource =
        item.sellingPrice ??
        item.price ??
        item.mrp ??
        0;

      if (!priceSource) {
        throw new Error(
          `Missing price for productId: ${item.productId}`
        );
      }

      const sellingPrice = n(priceSource);

      const gstPercent = n(item.gstPercent, 18);

      const gst = calculateGST(sellingPrice, gstPercent);

      return {
        productId: item.productId,
        sku: item.sku || "",
        name: item.name,
        variant: item.variant || "",
        hsn: item.hsn || "",

        qty,

        sellingPrice,

        mrp: n(item.mrp, sellingPrice),

        taxableValue: gst.taxableValue,
        gstPercent,

        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,

        lineTotal: Number((gst.total * qty).toFixed(2)),
      };
    });

    /* =========================================================
       GST TOTALS (ERP ACCURATE)
    ========================================================= */

    const subtotal = Number(
      processedCart.reduce(
        (a, i) => a + i.taxableValue * i.qty,
        0
      ).toFixed(2)
    );

    const cgst = Number(
      processedCart.reduce(
        (a, i) => a + i.cgst * i.qty,
        0
      ).toFixed(2)
    );

    const sgst = Number(
      processedCart.reduce(
        (a, i) => a + i.sgst * i.qty,
        0
      ).toFixed(2)
    );

    const igst = Number(
      processedCart.reduce(
        (a, i) => a + i.igst * i.qty,
        0
      ).toFixed(2)
    );

    const gstTotal = Number((cgst + sgst + igst).toFixed(2));

    const shippingCharges = 0;
    const roundOff = 0;

    const amount = Number(
      (
        subtotal +
        gstTotal +
        shippingCharges -
        n(discount, 0) +
        roundOff
      ).toFixed(2)
    );

    /* =========================================================
       ORDER ID
    ========================================================= */

    const orderId = await generateOrderId();

    /* =========================================================
       PAYMENT STATE MACHINE
    ========================================================= */

    let paymentStatus: any = "NOT_INITIATED";

    if (paymentMethod === "RAZORPAY") paymentStatus = "INITIATED";
    if (paymentMethod === "UPI") paymentStatus = "PENDING";
    if (paymentMethod === "COD") paymentStatus = "PENDING";

    const invoiceType = gstType === "B2B" ? "B2B" : "TAX";

    /* =========================================================
       CREATE ORDER (SOURCE OF TRUTH)
    ========================================================= */

    const order = await Order.create({
      source,
      orderId,

      cart: processedCart,
      address,

      subtotal,
      discount: n(discount, 0),
      taxableAmount: subtotal,

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

      status: "PENDING_PAYMENT",

      payment: {
        method: paymentMethod,
        status: paymentStatus,
        amountPaid: 0,
      },

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

      events: [
        {
          type: "ORDER_CREATED",
          message: "Order created successfully",
          createdAt: new Date(),
        },
      ],
    });

    /* =========================================================
       RAZORPAY (HARDENED + SAFE FAILOVER)
    ========================================================= */

    let razorpayOrder = null;

    if (paymentMethod === "RAZORPAY") {
      try {
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

        order.payment.gatewayOrderId = razorpayOrder.id;
        await order.save();
      } catch (err) {
        console.error("RAZORPAY INIT ERROR:", err);
      }
    }

    /* =========================================================
       RESPONSE
    ========================================================= */

    return NextResponse.json(
      {
        success: true,
        orderId,
        amount,
        razorpayOrder,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("ORDER CREATE ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message || "Internal Server Error",
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

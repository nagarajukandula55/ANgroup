import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { calculateGST } from "@/lib/gst";
import Order from "@/models/Order";

/* =========================================================
   CORS (ERP SAFE)
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://shopnative.in",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/* =========================================================
   ERP-GRADE ORDER ID (NO COLLISION RISK)
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
   CART NORMALIZER (ERP LAYER)
========================================================= */

function normalizeItem(item: any) {
  const qty = Number(item.qty || 1);

  const sellingPriceRaw =
    item.sellingPrice ??
    item.price ??
    item.mrp ??
    0;

  if (
     sellingPriceRaw === undefined ||
     sellingPriceRaw === null ||
     isNaN(Number(sellingPriceRaw))
   ) {
    throw new Error(
      `Invalid sellingPrice for productId: ${item.productId}`
    );
  }

  const sellingPrice = Number(sellingPriceRaw);

  return {
    ...item,
    qty,
    sellingPrice,
  };
}

/* =========================================================
   CREATE ORDER
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
       PROCESS CART (ERP SAFE LAYER)
    ========================================================= */

    console.log("INCOMING CART:", cart);

    console.log(
        "FIRST ITEM:",
        JSON.stringify(cart[0], null, 2)
      );

    const processedCart = cart.map((raw: any) => {
      const item = normalizeItem(raw);

      const gstPercent = Number(item.gstPercent || 18);

      const gst = calculateGST(item.sellingPrice, gstPercent);

      return {
        productId: item.productId,
        sku: item.sku || "",
        name: item.name,
        variant: item.variant || "",
        hsn: item.hsn || "",
        qty: item.qty,

        sellingPrice: item.sellingPrice,
        mrp: Number(item.mrp || item.sellingPrice),

        taxableValue: gst.taxableValue,
        gstPercent,

        cgst: gst.cgst,
        sgst: gst.sgst,
        igst: gst.igst,

        total: +(gst.total * item.qty).toFixed(2),
      };
    });

    /* =========================================================
       TOTAL CALCULATION (AUDIT SAFE)
    ========================================================= */

    const subtotal = processedCart.reduce(
      (a, i) => a + i.taxableValue * i.qty,
      0
    );

    const cgst = processedCart.reduce(
      (a, i) => a + i.cgst * i.qty,
      0
    );

    const sgst = processedCart.reduce(
      (a, i) => a + i.sgst * i.qty,
      0
    );

    const igst = processedCart.reduce(
      (a, i) => a + i.igst * i.qty,
      0
    );

    const gstTotal = cgst + sgst + igst;

    const shippingCharges = 0;
    const roundOff = 0;

    const amount =
      subtotal + gstTotal + shippingCharges - discount + roundOff;

    /* =========================================================
       ORDER ID
    ========================================================= */

    const orderId = await generateOrderId();

    /* =========================================================
       PAYMENT STATE MACHINE
    ========================================================= */

    let paymentStatus = "NOT_INITIATED";

    if (paymentMethod === "RAZORPAY") paymentStatus = "INITIATED";
    if (paymentMethod === "UPI") paymentStatus = "PENDING";
    if (paymentMethod === "COD") paymentStatus = "PENDING";

    const invoiceType = gstType === "B2B" ? "B2B" : "TAX";

    /* =========================================================
       ORDER CREATE (IMMUTABLE SNAPSHOT)
    ========================================================= */

    const order = await Order.create({
      source,
      orderId,
      cart: processedCart,

      address,

      subtotal,
      discount,
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
       RAZORPAY (HARDENED INIT)
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
      } 

      catch (err: any) {

        console.error(
          "RAZORPAY ERROR:",
          err
        );
      
        return NextResponse.json(
          {
            success: false,
            message:
              "Unable to initialize payment gateway",
            error: err?.message,
          },
          {
            status: 500,
            headers: corsHeaders,
          }
        );
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
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

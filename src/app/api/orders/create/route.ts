import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import crypto from "crypto";

/* =========================================================
   CORS
========================================================= */

const corsHeaders = {
  "Access-Control-Allow-Origin":
    "https://shopnative.in",

  "Access-Control-Allow-Methods":
    "POST, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type, Authorization",
};

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: corsHeaders,
    }
  );
}

/* =========================================================
   ORDER ID
========================================================= */

function generateOrderId() {
  const ts = Date.now();

  const rand =
    crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

  return `ORD-${ts}-${rand}`;
}

/* =========================================================
   MAIN
========================================================= */

export async function POST(
  req: Request
) {
  try {
    await connectDB();

    const body =
      await req.json();

    const {
      cart,

      address,

      paymentMethod =
        "UPI",

      subtotal = 0,

      discount = 0,

      amount,

      cgst = 0,

      sgst = 0,

      igst = 0,

      gstTotal = 0,

      shippingCharges = 0,

      taxItems = [],

      coupon = null,

      gstType = "B2C",

      gstMode =
        "CGST_SGST",

      businessId =
        "NATIVE",

      userId = null,
    } = body;

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (
      !cart ||
      !Array.isArray(cart) ||
      cart.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cart is empty",
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      );
    }

    if (
      !address?.name ||
      !address?.phone
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Customer details missing",
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      );
    }

    if (
      !amount ||
      Number(amount) <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid amount",
        },
        {
          status: 400,
          headers:
            corsHeaders,
        }
      );
    }

    /* =========================================================
       ORDER ID
    ========================================================= */

    const orderId =
      generateOrderId();

    /* =========================================================
       CART TRANSFORM
    ========================================================= */

    const items = cart.map(
      (item: any) => {
        const qty =
          Number(item.qty || 1);

        const price =
          Number(
            item.price || 0
          );

        const taxableValue =
          qty * price;

        const gstPercent =
          Number(
            item.gstPercent ||
              0
          );

        return {
          productId:
            item.productId,

          sku:
            item.sku || "",

          name:
            item.name ||
            "Unnamed Product",

          variant:
            item.variant ||
            "default",

          hsn:
            item.hsn || "",

          qty,

          price,

          mrp:
            item.mrp ||
            price,

          taxableValue,

          gstPercent,

          cgst:
            item.cgst || 0,

          sgst:
            item.sgst || 0,

          igst:
            item.igst || 0,

          total:
            taxableValue +
            (item.gstTotal ||
              0),
        };
      }
    );

    /* =========================================================
       ORDER CREATE
    ========================================================= */

    const order =
      await Order.create({
        /* ================= IDs ================= */

        orderId,

        businessId,

        userId,

        source: "WEB",

        /* ================= CART ================= */

        cart: items,

        /* ================= ADDRESS ================= */

        address,

        /* ================= AMOUNTS ================= */

        subtotal:
          Number(subtotal),

        discount:
          Number(discount),

        taxableAmount:
          Number(subtotal),

        cgst:
          Number(cgst),

        sgst:
          Number(sgst),

        igst:
          Number(igst),

        gstTotal:
          Number(gstTotal),

        shippingCharges:
          Number(
            shippingCharges
          ),

        roundOff: 0,

        amount:
          Number(amount),

        /* ================= GST ================= */

        gstType,

        gstMode,

        taxItems,

        /* ================= PAYMENT ================= */

        payment: {
          method:
            paymentMethod,

          status:
            paymentMethod ===
            "COD"
              ? "PENDING"
              : "INITIATED",

          amountPaid: 0,

          gateway:
            paymentMethod ===
            "RAZORPAY"
              ? "RAZORPAY"
              : "MANUAL",
        },

        /* ================= ORDER STATUS ================= */

        status:
          paymentMethod ===
          "COD"
            ? "PAID"
            : "PENDING_PAYMENT",

        /* ================= COUPON ================= */

        coupon,

        /* ================= ERP FLAGS ================= */

        paymentVerified: false,

        stockReserved: false,

        invoiceGenerated: false,

        shipmentCreated: false,

        locked: false,

        /* ================= EVENTS ================= */

        events: [
          {
            type:
              "ORDER_CREATED",

            message:
              "Order created successfully",

            data: {
              amount,

              paymentMethod,

              gstType,
            },
          },
        ],
      });

    /* =========================================================
       RAZORPAY
    ========================================================= */

    let razorpayOrder =
      null;

    if (
      paymentMethod ===
      "RAZORPAY"
    ) {
      try {
        const Razorpay =
          (
            await import(
              "razorpay"
            )
          ).default;

        if (
          !process.env
            .RAZORPAY_KEY_ID ||
          !process.env
            .RAZORPAY_KEY_SECRET
        ) {
          throw new Error(
            "Razorpay env missing"
          );
        }

        const razorpay =
          new Razorpay({
            key_id:
              process.env
                .RAZORPAY_KEY_ID,

            key_secret:
              process.env
                .RAZORPAY_KEY_SECRET,
          });

        razorpayOrder =
          await razorpay.orders.create(
            {
              amount:
                Math.round(
                  Number(
                    amount
                  ) * 100
                ),

              currency:
                "INR",

              receipt:
                orderId,

              notes: {
                orderId,
              },
            }
          );

        order.payment.gateway =
          "RAZORPAY";

        order.payment.gatewayOrderId =
          razorpayOrder.id;

        await order.save();
      } catch (err) {
        console.error(
          "RAZORPAY ERROR:",
          err
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

        razorpayOrder,

        order: {
          id: order._id,

          orderId:
            order.orderId,

          status:
            order.status,
        },
      },
      {
        headers:
          corsHeaders,
      }
    );
  } catch (err: any) {
    console.error(
      "ORDER CREATE ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err.message ||
          "Internal Server Error",
      },
      {
        status: 500,

        headers:
          corsHeaders,
      }
    );
  }
}

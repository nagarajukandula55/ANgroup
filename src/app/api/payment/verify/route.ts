export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import Coupon from "@/models/Coupon";
import { sendOrderNotification }
from "@/lib/telegram/sendOrderNotification";
import { sendInvoiceEmail }
from "@/services/email/resend.service";

/* =========================================================
   CORS
========================================================= */

const allowedOrigins = [
  "https://shopnative.in",
  "https://www.shopnative.in",
  "https://angroup.in",
  "https://www.angroup.in",
];

function getCorsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin":
      origin && allowedOrigins.includes(origin)
        ? origin
        : "",

    "Access-Control-Allow-Methods":
      "GET, POST, OPTIONS",

    "Access-Control-Allow-Headers":
      "Content-Type, Authorization",
  };
}

/* =========================================================
   OPTIONS
========================================================= */

export async function OPTIONS(req: Request) {
  const origin = req.headers.get("origin");

  return new NextResponse(null, {
    status: 200,
    headers: getCorsHeaders(origin),
  });
}

/* =========================================================
   VERIFY PAYMENT API
========================================================= */

export async function POST(req: Request) {
  const origin = req.headers.get("origin");

  try {
    await connectDB();

    if (!process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "Missing RAZORPAY_KEY_SECRET"
      );
    }

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    console.log(
      "VERIFY PAYMENT BODY:",
      body
    );

    /* =========================================================
       VALIDATION
    ========================================================= */

    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !orderId
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Missing payment verification fields",
        },
        {
          status: 400,
          headers: getCorsHeaders(origin),
        }
      );
    }

    /* =========================================================
       FIND ORDER
    ========================================================= */

    const order =
      await Order.findOne({
        orderId,
      });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message: "Order not found",
        },
        {
          status: 404,
          headers: getCorsHeaders(origin),
        }
      );
    }

    console.log(
      "ORDER FOUND:",
      {
        orderId:
          order.orderId,

        storedGatewayOrderId:
          order.payment
            ?.gatewayOrderId,

        receivedGatewayOrderId:
          razorpay_order_id,
      }
    );

    /* =========================================================
       ALREADY VERIFIED
    ========================================================= */

    if (
      order.paymentVerified === true
    ) {
      return NextResponse.json(
        {
          success: true,
          duplicate: true,
          orderId,
        },
        {
          headers: getCorsHeaders(origin),
        }
      );
    }

    /* =========================================================
       VERIFY ORDER ID
    ========================================================= */

    console.log("COMPARE:", {
      frontend:
        razorpay_order_id,

      database:
        order.payment
          ?.gatewayOrderId,
    });

    console.log("TYPES:", {
      frontendType:
        typeof razorpay_order_id,

      databaseType:
        typeof order.payment
          ?.gatewayOrderId,
    });

    if (
      String(
        razorpay_order_id
      ).trim() !==
      String(
        order.payment
          ?.gatewayOrderId
      ).trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Gateway order mismatch",
        },
        {
          status: 400,
          headers: getCorsHeaders(origin),
        }
      );
    }

    /* =========================================================
       VERIFY SIGNATURE
    ========================================================= */

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env
            .RAZORPAY_KEY_SECRET
        )
        .update(
          `${razorpay_order_id}|${razorpay_payment_id}`
        )
        .digest("hex");

    const isValidSignature =
      generatedSignature ===
      razorpay_signature;

    console.log(
      "SIGNATURE CHECK:",
      {
        generatedSignature,
        razorpay_signature,
        isValidSignature,
      }
    );

    /* =========================================================
       INVALID SIGNATURE
    ========================================================= */

    if (!isValidSignature) {
      order.payment.status =
        "FAILED";

      order.status =
        "PAYMENT_FAILED";

      await order.save();

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid payment signature",
        },
        {
          status: 400,
          headers: getCorsHeaders(origin),
        }
      );
    }

    /* =========================================================
       PAYMENT SUCCESS
    ========================================================= */

    order.paymentVerified = true;

    order.status = "PAID";

    order.payment.status =
      "SUCCESS";

    order.payment.gatewayPaymentId =
      razorpay_payment_id;

    order.payment.gatewaySignature =
      razorpay_signature;

    order.payment.paidAt =
      new Date();

    order.payment.amountPaid =
      order.amount;

    await order.save();

   /* ==========================================
      UPDATE COUPON USAGE
   ========================================== */
      
      if (order.couponCode) {
        try {
          await Coupon.updateOne(
            {
              code:
                order.couponCode.toUpperCase(),
            },
            {
              $inc: {
                usedCount: 1,
              },
      
              $push: {
                usedBy: order.orderId,
              },
            }
          );
      
          console.log(
            "COUPON USAGE UPDATED:",
            order.couponCode
          );
        } catch (couponErr) {
          console.error(
            "COUPON UPDATE FAILED:",
            couponErr
          );
        }
      }
      
      await sendOrderNotification(order);

           try {
        await sendInvoiceEmail({
          to: order?.customer?.email ||
              order?.email ||
              order?.address?.email,
      
          customerName:
            order?.address?.name ||
            order?.customer?.name ||
            "Customer",
      
          invoiceNumber:
            order?.invoice?.invoiceNumber ||
            order.orderId,
      
          pdfUrl:
            order?.invoice?.invoiceUrl ||
            "",
      
          grandTotal:
            order.amount || 0,
      
          orderId:
            order.orderId,
        });
      
        console.log(
          "CUSTOMER EMAIL SENT:",
          order.orderId
        );
      
      } catch (emailErr) {
      
        console.error(
          "EMAIL FAILED:",
          emailErr
        );
      
      }

    console.log(
      "PAYMENT VERIFIED:",
      orderId
    );

    /* =========================================================
       SUCCESS RESPONSE
    ========================================================= */

    return NextResponse.json(
      {
        success: true,

        message:
          "Payment verified successfully",

        orderId,
      },
      {
        headers: getCorsHeaders(origin),
      }
    );

  } catch (err: any) {
    console.error(
      "PAYMENT VERIFY ERROR:",
      err
    );

    return NextResponse.json(
      {
        success: false,

        message:
          err?.message ||
          "Payment verification failed",
      },
      {
        status: 500,
        headers: getCorsHeaders(origin),
      }
    );
  }
}

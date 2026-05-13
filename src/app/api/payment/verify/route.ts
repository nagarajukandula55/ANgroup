import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import crypto from "crypto";
import Order from "@/models/Order";
import { processOrderAfterPayment } from "@/services/orderPipeline.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = body;

    const secret = process.env.RAZORPAY_SECRET!;

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    /* ================= VERIFY ================= */
    if (generatedSignature !== razorpay_signature) {
      await Order.updateOne(
        { orderId },
        {
          $push: {
            events: {
              type: "PAYMENT_VERIFIED",
              data: {
                status: "FAILED",
                razorpay_payment_id,
              },
              at: new Date(),
            },
          },
        }
      );

      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 }
      );
    }

    /* ================= UPDATE ORDER ================= */
    const order = await Order.findOneAndUpdate(
      { orderId },
      {
        $set: {
          "payment.status": "SUCCESS",
          "payment.razorpay_payment_id":
            razorpay_payment_id,
          "payment.razorpay_order_id":
            razorpay_order_id,
          "payment.razorpay_signature":
            razorpay_signature,
          "payment.paidAt": new Date(),
          status: "PAID",
          "statusTimeline.paidAt": new Date(),
        },
        $push: {
          events: {
            type: "PAYMENT_VERIFIED",
            data: {
              razorpay_payment_id,
              razorpay_order_id,
            },
            at: new Date(),
          },
        },
      },
      { new: true }
    );

    /* ================= PIPELINE ================= */
    const result = await processOrderAfterPayment({
      orderId,
      payment: {
        method: "RAZORPAY",
        amount: order?.amount,
        razorpay_payment_id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Payment verified",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

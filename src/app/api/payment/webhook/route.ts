import { NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.text();

    const signature =
      req.headers.get("x-razorpay-signature") || "";

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (signature !== expectedSignature) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    /* ================= PAYMENT SUCCESS ================= */

    if (event.event === "payment.captured") {
      const payment = event.payload.payment.entity;

      const orderId = payment.notes?.orderId;

      const order = await Order.findOne({ orderId });

      if (!order) {
        return NextResponse.json({ success: false });
      }

      if (order.payment?.status === "SUCCESS") {
        return NextResponse.json({ success: true });
      }

      order.payment.status = "SUCCESS";
      order.payment.gatewayPaymentId = payment.id;
      order.payment.paidAt = new Date();
      order.payment.amountPaid = payment.amount / 100;
      order.paymentVerified = true;

      order.status = "PAID";

      order.events.push({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        message: "Payment confirmed via Razorpay webhook",
        data: payment,
        createdAt: new Date(),
      });

      await order.save();
    }

    /* ================= PAYMENT FAILED ================= */

    if (event.event === "payment.failed") {
      const payment = event.payload.payment.entity;

      const orderId = payment.notes?.orderId;

      const order = await Order.findOne({ orderId });

      if (order) {
        order.payment.status = "FAILED";

        order.events.push({
          type: "PAYMENT_FAILED",
          message: "Payment failed via webhook",
          data: payment,
          createdAt: new Date(),
        });

        await order.save();
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WEBHOOK ERROR", err);

    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import crypto from "crypto";
import Order from "@/models/Order";
import { createInvoiceForOrder } from "@/lib/invoice/createInvoice";
import { logAction } from "@/lib/audit/logAction";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET!;

    /* =========================================================
       VERIFY SIGNATURE (CRITICAL SECURITY STEP)
    ========================================================= */

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { success: false, message: "Invalid signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(body);

    /* =========================================================
       HANDLE PAYMENT SUCCESS ONLY
    ========================================================= */

    if (event.event !== "payment.captured") {
      return NextResponse.json({ success: true });
    }

    const paymentEntity = event.payload.payment.entity;

    const razorpayOrderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    /* =========================================================
       FIND ORDER
    ========================================================= */

    const order = await Order.findOne({
      "payment.gatewayOrderId": razorpayOrderId,
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    /* =========================================================
       IDEMPOTENCY CHECK (VERY IMPORTANT)
    ========================================================= */

    if (order.status === "PAID" && order.invoice?.invoiceNumber) {
      return NextResponse.json({ success: true });
    }

    /* =========================================================
       UPDATE PAYMENT STATUS
    ========================================================= */

    order.status = "PAID";
    order.payment.status = "SUCCESS";
    order.payment.amountPaid = paymentEntity.amount / 100;
    order.payment.paymentId = paymentId;

    /* =========================================================
       CREATE INVOICE (YOUR EXISTING MODULE)
    ========================================================= */

    const invoice =
      await createInvoiceForOrder(order.orderId);

    /* =========================================================
       ATTACH INVOICE
    ========================================================= */

    order.invoice = {
      invoiceType: order.gstType === "B2B" ? "B2B" : "TAX",
      invoiceNumber: invoice.invoiceNumber,
      fiscalYear: invoice.fiscalYear,
      sequence: invoice.sequence,
      pdfGenerated: false,
      locked: true,
    };

    /* =========================================================
       FINAL SAVE
    ========================================================= */

    order.events.push({
      type: "PAYMENT_SUCCESS",
      message: "Payment captured and invoice generated",
      createdAt: new Date(),
    });

    await order.save();

    logAction({
      action: "VERIFY",
      entity: "Order",
      entityId: order._id?.toString(),
      after: { status: order.status, payment: order.payment, invoice: order.invoice },
      req,
      actor: { businessId: order?.businessId?.toString() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("WEBHOOK ERROR:", err);

    return NextResponse.json(
      { success: false, message: "Webhook failed" },
      { status: 500 }
    );
  }
}

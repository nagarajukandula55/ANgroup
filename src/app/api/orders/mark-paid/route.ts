import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Order from "@/models/Order";
import { generateInvoiceNumber } from "@/lib/numbering/invoiceNumber";

export async function POST(req: Request) {
  await connectDB();

  const { orderId } = await req.json();

  const order = await Order.findOne({ orderId });

  if (!order) {
    return NextResponse.json({ success: false, message: "Order not found" });
  }

  const seq = Math.floor(Math.random() * 999999); // replace later with atomic counter

  const invoiceNumber = await generateInvoiceNumber(
    order.businessId,
    seq
  );

  order.status = "PAID";

  order.invoice = {
    invoiceNumber,
    generatedAt: new Date(),
    billingSnapshot: order.billing,
  };

  await order.save();

  return NextResponse.json({
    success: true,
    invoiceNumber,
  });
}

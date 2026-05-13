import Order from "@/models/Order";
import { generateInvoiceNumber } from "./generateInvoiceNumber";

export async function createInvoiceForOrder(orderId: string) {
  const order = await Order.findOne({ orderId });

  if (!order) throw new Error("Order not found");

  if (order.invoice?.invoiceNumber) {
    return order.invoice; // already generated (idempotent safety)
  }

  const invoiceNumber = await generateInvoiceNumber(order.businessId);

  order.invoice = {
    invoiceNumber,
    generatedAt: new Date(),
    billingSnapshot: order.billing,
  };

  order.events.push({
    type: "INVOICE_GENERATED",
    data: { invoiceNumber },
    at: new Date(),
  });

  await order.save();

  return order.invoice;
}

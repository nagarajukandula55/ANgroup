import Order from "@/models/Order";
import { generateInvoiceNumber } from "./numbering.service";

export async function generateInvoice(orderId: string) {
  const order = await Order.findById(orderId).populate(
    "business"
  );

  if (!order) throw new Error("Order not found");

  if (order.invoice?.invoiceNumber) {
    return order.invoice;
  }

  const invoiceNumber = await generateInvoiceNumber(
    order.business
  );

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

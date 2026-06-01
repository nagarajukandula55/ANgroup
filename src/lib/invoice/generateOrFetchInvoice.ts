import Invoice from "@/models/Invoice";
import { createInvoiceForOrder } from "./createInvoice";

export async function generateOrFetchInvoice(order: any) {
  const existing = await Invoice.findOne({
    orderId: order.orderId,
  });

  if (existing) {
    return { invoice: existing, isNew: false };
  }

  const invoice = await createInvoiceForOrder(order.orderId);

  return { invoice, isNew: true };
}

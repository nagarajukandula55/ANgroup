import Order from "@/models/Order";
import { generateInvoiceNumber } from "./generateInvoiceNumber";

export async function createInvoiceForOrder(orderId: string) {
  const order = await Order.findOne({ orderId })
    .lean()
    .exec() as any;

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const invoiceNumber = await generateInvoiceNumber(
    order.businessId
  );

  return {
    invoiceNumber,
    order,
  };
}

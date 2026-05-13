import { createInvoiceDocument } from "@/lib/document/documentService";
import Business from "@/models/Business";
import Order from "@/models/Order";

const SELLER_STATE = "Andhra Pradesh";

export async function attachInvoice(orderId: string, businessId: string) {
  const order = await Order.findById(orderId);
  const business = await Business.findById(businessId);

  const invoice = await createInvoiceDocument({
    business,
    order,
    sellerState: SELLER_STATE,
  });

  order.invoice = invoice;
  order.status = "PAID";

  await order.save();

  return invoice;
}

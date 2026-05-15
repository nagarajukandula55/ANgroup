import Order from "@/models/Order";
import { generateInvoiceNumber } from "./generateInvoiceNumber";

type CreateInvoiceInput = {
  orderId: string;
  gstType?: string;
  stateCode?: string;
};

export async function createInvoice(
  input: string | CreateInvoiceInput
) {
  const resolvedOrderId =
    typeof input === "string"
      ? input
      : input.orderId;

  const order = await Order.findOne({
    orderId: resolvedOrderId,
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  if (order.invoice?.invoiceNumber) {
    return {
      invoiceNumber:
        order.invoice.invoiceNumber,
      alreadyExists: true,
      order,
    };
  }

  const invoiceNumber =
    await generateInvoiceNumber(
      order.businessId || "NATIVE"
    );

  order.invoice = {
    ...order.invoice,

    invoiceNumber,

    invoiceType:
      input &&
      typeof input !== "string"
        ? input.gstType || "TAX"
        : order.gstType || "TAX",

    financialYear: "2026-27",

    generatedAt: new Date(),

    pdfGenerated: false,

    locked: true,
  };

  order.invoiceGenerated = true;

  order.events.push({
    type: "INVOICE_GENERATED",

    message:
      "Invoice generated successfully",

    createdAt: new Date(),
  });

  await order.save();

  return {
    invoiceNumber,
    order,
  };
}

export const createInvoiceForOrder =
  createInvoice;

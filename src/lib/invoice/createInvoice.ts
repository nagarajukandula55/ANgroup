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

  /* =========================================================
     ALREADY GENERATED
  ========================================================= */

  if (order.invoice?.invoiceNumber) {
    return {
      invoiceNumber:
        order.invoice.invoiceNumber,

      fiscalYear:
        order.invoice.financialYear,

      sequence: 0,

      alreadyExists: true,

      order,
    };
  }

  /* =========================================================
     GENERATE NUMBER
  ========================================================= */

  const invoiceNumber =
    await generateInvoiceNumber(
      order.businessId || "NATIVE"
    );

  /* =========================================================
     FINANCIAL YEAR
  ========================================================= */

  const fiscalYear = "2026-27";

  /* =========================================================
     OPTIONAL SEQUENCE
  ========================================================= */

  const sequence = Number(
    invoiceNumber
      ?.split("-")
      ?.pop() || 0
  );

  /* =========================================================
     SAVE
  ========================================================= */

  order.invoice = {
    ...order.invoice,

    invoiceNumber,

    invoiceType:
      typeof input !== "string"
        ? input.gstType || "TAX"
        : order.gstType || "TAX",

    financialYear: fiscalYear,

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

    fiscalYear,

    sequence,

    order,
  };
}

export const createInvoiceForOrder =
  createInvoice;

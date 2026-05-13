import Order from "@/models/Order";

/**
 * Enterprise-safe invoice sequence generator
 * Scope: business-wide (can be upgraded later to financial-year scoped)
 */
export async function getNextInvoiceSequence(prefix = "NA") {
  const count = await Order.countDocuments({
    "invoice.invoiceNumber": { $exists: true },
  });

  const next = count + 1;

  const padded = String(next).padStart(6, "0");

  return `${prefix}-${padded}`;
}

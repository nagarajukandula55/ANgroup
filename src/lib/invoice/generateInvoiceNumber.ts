import Business from "@/models/Business";
import Invoice from "@/models/Invoice";
import { getFinancialYear } from "@/lib/invoice/getFinancialYear";

/**
 * 🏛️ GST-COMPLIANT INVOICE NUMBER GENERATOR
 * FORMAT: NA-2627-000001
 */

export async function generateInvoiceNumber(businessId: string) {
  const business = (await Business.findById(businessId)
    .lean()
    .exec()) as any;

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const prefix =
    business?.documents?.invoices?.numbering?.prefix ?? "NA";

  // Financial year: 2026-27 → 2627
  const fy = getFinancialYear(); // "2026-27"
  const fyCode = fy.replace("-", "").slice(2); // "2627"

  // yearly sequence (ERP-safe)
  const count = await Invoice.countDocuments({
    businessId,
    financialYear: fy,
  });

  const sequence = String(count + 1).padStart(6, "0");

  return `${prefix}-${fyCode}-${sequence}`;
}

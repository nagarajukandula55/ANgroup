import Business from "@/models/Business";
import { getNextInvoiceSequence } from "./getNextInvoiceSequence";

function formatDateKey() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

function randomSuffix(len = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + len)
    .toUpperCase();
}

export async function generateInvoiceNumber(businessId: string) {
  const business = await Business.findById(businessId)
    .lean()
    .exec() as any;

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const prefix =
    business?.documents?.invoices?.numbering?.prefix || "NA";

  const dateKey = formatDateKey();

  const seq = await getNextInvoiceSequence(businessId, dateKey);

  const paddedSeq = String(seq).padStart(6, "0");

  const random = randomSuffix(6);

  return `${prefix}-${dateKey}-${paddedSeq}-${random}`;
}

import Business from "@/models/Business";

function randomString(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

function formatDate() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function generateInvoiceNumber(businessId: string, seq: number) {
  const business = await Business.findById(businessId).lean();

  const prefix = business?.documents?.invoice?.numbering?.prefix || "NA";

  const date = formatDate();

  const paddedSeq = String(seq).padStart(6, "0");

  const random = randomString(6);

  return `${prefix}-${date}-${paddedSeq}-${random}`;
}

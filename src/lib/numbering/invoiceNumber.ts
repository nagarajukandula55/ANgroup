import Business from "@/models/Business";

function formatDate() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function getInvoiceNumberPrefix(businessId: string) {
  const business = await Business.findById(businessId)
    .lean()
    .exec() as any;

  if (!business) {
    throw new Error("BUSINESS_NOT_FOUND");
  }

  const prefix =
    business?.documents?.invoices?.numbering?.prefix || "NA";

  const date = formatDate();

  return {
    prefix,
    date,
  };
}

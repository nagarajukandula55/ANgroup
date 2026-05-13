import Sequence from "@/models/Sequence";

/* ================= RANDOM GENERATOR ================= */
function randomString(length = 6) {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

/* ================= DATE FORMAT ================= */
function getDateCode() {
  const d = new Date();

  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yy}${mm}${dd}`;
}

/* ================= INVOICE NUMBER ================= */
export async function generateInvoiceNumber(
  business: any
) {
  const prefix = business?.documents?.invoices?.numbering?.prefix || "NA";

  const dateKey = getDateCode();

  const seq = await Sequence.findOneAndUpdate(
    {
      businessId: business._id,
      type: "INVOICE",
      dateKey,
    },
    {
      $inc: { value: 1 },
      $setOnInsert: {
        businessId: business._id,
        type: "INVOICE",
        dateKey,
      },
    },
    { upsert: true, new: true }
  );

  const sequence = String(seq.value).padStart(6, "0");

  const random = randomString(6);

  return `${prefix}-${dateKey}-${sequence}-${random}`;
}

/* ================= RECEIPT NUMBER ================= */
export async function generateReceiptNumber(
  business: any
) {
  const prefix = business?.documents?.receipts?.numbering?.prefix || "NA";

  const timestamp = Date.now();
  const random = randomString(6);

  return `${prefix}-${timestamp}-${random}`;
}

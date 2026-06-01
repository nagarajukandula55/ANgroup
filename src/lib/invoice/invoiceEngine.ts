import Invoice from "@/models/Invoice";
import crypto from "crypto";

/**
 * MAIN INVOICE ENGINE (AUDIT SAFE)
 */
export async function generateOrFetchInvoice(order: any) {
  try {
    if (!order) throw new Error("Order required");

    /* ================= 1. IDENTITY ================= */
    const orderId = order._id.toString();

    /* ================= 2. CHECK EXISTING (IMPORTANT) ================= */
    const existing = await Invoice.findOne({ orderId });

    if (existing) {
      return {
        invoice: existing,
        isNew: false,
      };
    }

    /* ================= 3. INVOICE NUMBER ================= */
    const invoiceNumber =
      "INV-" +
      new Date().getFullYear() +
      "-" +
      crypto.randomBytes(4).toString("hex").toUpperCase();

    /* ================= 4. GST ENGINE ================= */
    const isB2B = order.customerType === "B2B";

    const companyState = order.companyState || "DEFAULT_STATE";
    const customerState = order.customerState;

    const sameState = companyState === customerState;

    const baseAmount = order.totalAmount;

    let gstMode = "INCLUSIVE";
    let cgst = 0,
      sgst = 0,
      igst = 0,
      totalGST = 0;

    if (isB2B) {
      const rate = 0.18;
      totalGST = baseAmount * rate;

      if (sameState) {
        gstMode = "CGST_SGST";
        cgst = totalGST / 2;
        sgst = totalGST / 2;
      } else {
        gstMode = "IGST";
        igst = totalGST;
      }
    }

    const grandTotal = isB2B ? baseAmount + totalGST : baseAmount;

    /* ================= 5. CREATE INVOICE ================= */
    const invoice = await Invoice.create({
      invoiceNumber,
      orderId,
      type: isB2B ? "B2B" : "B2C",
      gstMode,

      taxableAmount: baseAmount,

      cgst,
      sgst,
      igst,
      totalGST,

      total: grandTotal,

      status: "GENERATED",

      audit: {
        createdAt: new Date(),
        source: "AUTO_ORDER_SUCCESS",
      },
    });

    return {
      invoice,
      isNew: true,
    };
  } catch (err: any) {
    throw new Error("Invoice Engine Error: " + err.message);
  }
}

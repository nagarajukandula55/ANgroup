export function buildInvoiceTemplate(order: any) {
  const isB2B = order?.customerType === "B2B";

  /* ================= SAFE HELPERS ================= */
  const safeStr = (v: any) =>
    v === undefined || v === null ? "" : String(v);

  const safeNum = (v: any) =>
    Number.isFinite(Number(v)) ? Number(v) : 0;

  const items = Array.isArray(order?.items) ? order.items : [];

  /* ================= BUSINESS ================= */
  const businessLocation =
    order?.business?.organization?.locations?.[0];

  const businessAddress =
    typeof businessLocation === "string"
      ? businessLocation
      : businessLocation?.address || "";

  const businessState = safeStr(order?.business?.state);

  const customerState = safeStr(order?.address?.state);

  /* ================= TEMPLATE ================= */
  return {
    invoiceNumber: safeStr(order?.invoice?.invoiceNumber) || "N/A",
    orderId: safeStr(order?.orderId || order?._id),

    /* ================= BUSINESS ================= */
    business: {
      name: safeStr(order?.business?.name) || "Native",
      gst: safeStr(order?.business?.compliance?.gst?.number),
      state: businessState,
      address: safeStr(businessAddress),
    },

    /* ================= CUSTOMER ================= */
    customer: {
      name: safeStr(order?.address?.name) || "N/A",
      phone: safeStr(order?.address?.phone),
      email: safeStr(order?.address?.email),
      gstNumber: safeStr(order?.address?.gstNumber),
      address:
        safeStr(order?.address?.line1 || order?.address?.address),
      city: safeStr(order?.address?.city),
      state: customerState,
      pincode: safeStr(order?.address?.pincode),
    },

    /* ================= ITEMS ================= */
    items: items.map((i: any) => {
      const qty = safeNum(i?.qty || 1);
      const price = safeNum(i?.price || 0);
      const gstPercent = safeNum(i?.gstPercent || 0);

      const taxableValue = qty * price;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      let total = taxableValue;

      if (isB2B) {
        const gstAmount = (taxableValue * gstPercent) / 100;

        const sameState =
          customerState &&
          businessState &&
          customerState === businessState;

        if (sameState) {
          cgst = gstAmount / 2;
          sgst = gstAmount / 2;
        } else {
          igst = gstAmount;
        }

        total = taxableValue + gstAmount;
      }

      return {
        name: safeStr(i?.name),
        hsn: safeStr(i?.snapshot?.hsn || i?.hsn),
        qty,
        price,
        gstPercent,
        taxableValue,
        cgst,
        sgst,
        igst,
        total,
      };
    }),

    /* ================= TOTALS ================= */
    totals: {
      subtotal: safeNum(order?.billing?.subtotal),
      cgst: safeNum(order?.billing?.cgst),
      sgst: safeNum(order?.billing?.sgst),
      igst: safeNum(order?.billing?.igst),
      grandTotal: safeNum(order?.billing?.grandTotal),
    },

    /* ================= META ================= */
    meta: {
      generatedAt: new Date(),
      currency: safeStr(order?.billing?.currency) || "INR",
      invoiceType: isB2B ? "B2B_TAX" : "B2C_RETAIL",
    },
  };
}

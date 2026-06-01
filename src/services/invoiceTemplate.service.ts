export function buildInvoiceTemplate(order: any) {
  const isB2B = order.customerType === "B2B";

  const businessLocation =
    order.business?.organization?.locations?.[0] || {};

  const items = Array.isArray(order.items) ? order.items : [];

  return {
    invoiceNumber: order.invoice?.invoiceNumber || "N/A",
    orderId: order.orderId || order._id,

    /* ================= BUSINESS ================= */
    business: {
      name: order.business?.name || "Native",
      gst: order.business?.compliance?.gst?.number || "",
      address:
        typeof businessLocation === "string"
          ? businessLocation
          : businessLocation?.address || "",
    },

    /* ================= CUSTOMER ================= */
    customer: {
      name: order.address?.name || "N/A",
      phone: order.address?.phone || "",
      email: order.address?.email || "",
      gstNumber: order.address?.gstNumber || "",
      address: order.address?.line1 || order.address?.address || "",
      city: order.address?.city || "",
      state: order.address?.state || "",
      pincode: order.address?.pincode || "",
    },

    /* ================= ITEMS ================= */
    items: items.map((i: any) => {
      const qty = i.qty || 1;
      const price = i.price || 0;
      const gstPercent = i.gstPercent || 0;

      const taxableValue = qty * price;

      let cgst = 0,
        sgst = 0,
        igst = 0,
        total = taxableValue;

      if (isB2B) {
        const gstAmount = (taxableValue * gstPercent) / 100;

        const sameState =
          order.address?.state &&
          order.business?.state &&
          order.address.state === order.business.state;

        if (sameState) {
          cgst = gstAmount / 2;
          sgst = gstAmount / 2;
        } else {
          igst = gstAmount;
        }

        total = taxableValue + gstAmount;
      }

      return {
        name: i.name,
        hsn: i.snapshot?.hsn || i.hsn || "",
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
      subtotal: order.billing?.subtotal || 0,
      cgst: order.billing?.cgst || 0,
      sgst: order.billing?.sgst || 0,
      igst: order.billing?.igst || 0,
      grandTotal: order.billing?.grandTotal || 0,
    },

    /* ================= META ================= */
    meta: {
      generatedAt: new Date(),
      currency: order.billing?.currency || "INR",
      invoiceType: isB2B ? "B2B_TAX" : "B2C_RETAIL",
    },
  };
}

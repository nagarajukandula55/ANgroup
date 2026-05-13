export function buildInvoiceTemplate(order: any) {
  return {
    invoiceNumber: order.invoice?.invoiceNumber,
    orderId: order.orderId,

    business: {
      name: order.business?.name,
      gst: order.business?.compliance?.gst?.number,
      address: order.business?.organization?.locations?.[0],
    },

    customer: order.address,

    items: order.items.map((i: any) => ({
      name: i.name,
      hsn: i.snapshot?.hsn,
      qty: i.qty,
      price: i.price,
      gst: i.gstPercent,
      total: i.total,
    })),

    totals: {
      subtotal: order.billing.subtotal,
      cgst: order.billing.cgst,
      sgst: order.billing.sgst,
      igst: order.billing.igst,
      grandTotal: order.billing.grandTotal,
    },

    meta: {
      generatedAt: new Date(),
      currency: order.billing.currency,
    },
  };
}

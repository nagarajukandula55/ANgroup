import type { DocumentRenderData } from "./renderData";

const fmtDate = (d?: string | Date) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/** Business.logo unless the issuing service center (Warehouse) has its own
 * logoUrl set, in which case that takes precedence — the "based on SC
 * selection" override. */
export function resolveCompanyLogo(business: any, warehouse: any): string | undefined {
  return warehouse?.logoUrl || business?.logo || undefined;
}

export function businessToCompany(business: any, warehouse: any) {
  return {
    name: business?.name || business?.brandName || "",
    address: [business?.address, business?.city, business?.state].filter(Boolean).join(", "),
    gstin: business?.gstNumber || undefined,
    logoUrl: resolveCompanyLogo(business, warehouse),
    termsAndConditions: business?.termsAndConditions || undefined,
  };
}

/** Maps a CrmJobSheet document into the generic render shape for a
 * workorder or estimate print (same underlying data, different label +
 * footer disclaimer text). */
export function jobSheetToRenderData(
  jobSheet: any,
  docType: "WORK_ORDER" | "ESTIMATE",
  company: DocumentRenderData["company"]
): DocumentRenderData {
  const lineItems = (jobSheet.lineItems || []).filter((l: any) => l.description?.trim());
  const subtotal = lineItems.reduce((s: number, l: any) => s + (l.quantity || 0) * (l.unitPrice || 0), 0);
  const tax = lineItems.reduce(
    (s: number, l: any) => s + (l.quantity || 0) * (l.unitPrice || 0) * ((l.taxRate || 0) / 100),
    0
  );
  const brandName = typeof jobSheet.brandId === "object" ? jobSheet.brandId?.name : undefined;
  const device = [jobSheet.product, brandName, jobSheet.deviceModel].filter(Boolean).join(" · ");

  return {
    docTypeLabel: docType === "ESTIMATE" ? "ESTIMATE" : "WORK ORDER",
    docNumber: jobSheet.jobSheetNumber,
    date: fmtDate(jobSheet.createdAt),
    status: jobSheet.status?.replace(/_/g, " "),
    company,
    party: {
      name: jobSheet.customerName,
      address: [jobSheet.address, jobSheet.city, jobSheet.state, jobSheet.pincode].filter(Boolean).join(", "),
      phone: jobSheet.phone,
      email: jobSheet.email,
    },
    items: lineItems.map((l: any) => ({
      description: l.description,
      hsnCode: l.hsnCode,
      qty: l.quantity || 0,
      unit: l.unit,
      unitPrice: l.unitPrice || 0,
      taxRate: l.taxRate || 0,
      amount: (l.quantity || 0) * (l.unitPrice || 0) * (1 + (l.taxRate || 0) / 100),
    })),
    totals: { subtotal, tax, grandTotal: subtotal + tax },
    notes: [device && `Device: ${device}`, jobSheet.issueDescription && `Issue: ${jobSheet.issueDescription}`, jobSheet.workPerformed && `Work performed: ${jobSheet.workPerformed}`]
      .filter(Boolean)
      .join("\n"),
    footerText:
      docType === "ESTIMATE"
        ? "This is an estimate, not a final invoice. Prices are subject to change based on actual repair findings."
        : "This is a service work order and not a tax invoice.",
  };
}

/** Maps a SalesInvoice document into the generic render shape. */
export function salesInvoiceToRenderData(
  invoice: any,
  company: DocumentRenderData["company"]
): DocumentRenderData {
  return {
    docTypeLabel: "TAX INVOICE",
    docNumber: invoice.invoiceNumber,
    date: fmtDate(invoice.issueDate || invoice.createdAt),
    status: invoice.status,
    company,
    party: {
      name: invoice.customer?.name || "",
      address: invoice.customer?.address,
      phone: invoice.customer?.phone,
      email: invoice.customer?.email,
      gstin: invoice.customer?.gstin,
    },
    items: (invoice.items || []).map((item: any) => ({
      description: item.description,
      hsnCode: item.hsnCode,
      qty: item.quantity || 0,
      unit: item.unit,
      unitPrice: item.unitPrice || 0,
      taxRate: item.taxRate || 0,
      amount: item.total ?? (item.quantity || 0) * (item.unitPrice || 0) + (item.taxAmount || 0),
    })),
    totals: {
      subtotal: invoice.subtotal || 0,
      tax: invoice.taxTotal || 0,
      discount: invoice.discountAmount || 0,
      grandTotal: invoice.grandTotal || 0,
    },
    notes: invoice.notes,
  };
}

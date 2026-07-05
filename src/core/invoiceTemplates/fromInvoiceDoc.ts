/**
 * Maps a saved Invoice document (+ its Order + Business) into the shared
 * InvoiceRenderData shape every layout renders from. This is the SAME
 * shape api/invoice/view/[invoiceNumber]/route.ts builds inline for the
 * live view page — pulled out here so api/invoice/generate/route.ts (the
 * Cloudinary-snapshot-at-checkout path) can build the exact same data and
 * render through the exact same layout registry, instead of the old
 * separate buildInvoiceTemplate()/generateInvoiceHTML() pair that used a
 * different, simpler shape and never reflected an admin's chosen template.
 */

import { getStateCode } from "@/core/gst/stateCodes";
import type { InvoiceRenderData } from "./types";

/**
 * models/Invoice.ts exports no typed interface (a plain untyped Mongoose
 * schema, unlike models/SalesInvoice.ts's ISalesInvoice) — this loose shape
 * covers exactly the fields this mapper actually reads.
 */
interface InvoiceDocLike {
  invoiceNumber: string;
  invoiceType?: string;
  generatedAt?: Date;
  createdAt?: Date;
  paymentStatus?: string;
  subtotal?: number;
  discount?: number;
  taxableAmount?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  grandTotal?: number;
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstNumber?: string;
  };
  items?: Array<{
    name?: string;
    hsn?: string;
    qty?: number;
    price?: number;
    discount?: number;
    taxableValue?: number;
    gstPercent?: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    total?: number;
  }>;
}

export function buildRenderDataFromInvoice(
  invoice: InvoiceDocLike,
  order: { createdAt?: Date; orderId?: string; payment?: { method?: string; razorpayPaymentId?: string; paymentId?: string; transactionId?: string } } | null,
  business: { name?: string; legalName?: string; address?: string; city?: string; state?: string; phone?: string; logo?: string; compliance?: { gstNumber?: string } } | null
): InvoiceRenderData {
  const stateCode = getStateCode(invoice.customer?.state);

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.generatedAt || invoice.createdAt || new Date(),
    orderDate: order?.createdAt,
    orderId: order?.orderId,
    type: invoice.invoiceType,
    company: {
      name: business?.name || business?.legalName || process.env.COMPANY_NAME || "Business",
      tagline: process.env.COMPANY_TAGLINE || "",
      address1: business?.address || process.env.COMPANY_ADDRESS1 || "",
      address2: process.env.COMPANY_ADDRESS2 || "",
      city: business?.city || process.env.COMPANY_CITY || "",
      state: business?.state || process.env.COMPANY_STATE || "",
      gstin: business?.compliance?.gstNumber || process.env.COMPANY_GSTIN || "",
      phone: business?.phone || process.env.COMPANY_PHONE || "",
      logoUrl: business?.logo || "",
    },
    customer: {
      name: invoice.customer?.name,
      phone: invoice.customer?.phone,
      address: invoice.customer?.address,
      city: invoice.customer?.city,
      state: invoice.customer?.state,
      pincode: invoice.customer?.pincode,
      gstin: invoice.customer?.gstNumber,
      stateCode,
    },
    shipping: {
      name: invoice.customer?.name,
      phone: invoice.customer?.phone,
      address: invoice.customer?.address,
      city: invoice.customer?.city,
      state: invoice.customer?.state,
      pincode: invoice.customer?.pincode,
    },
    payment: {
      method: order?.payment?.method || "ONLINE",
      status: invoice.paymentStatus,
      transactionId:
        order?.payment?.razorpayPaymentId ||
        order?.payment?.paymentId ||
        order?.payment?.transactionId ||
        "",
    },
    items: (invoice.items || []).map((item: any) => ({
      name: item.name,
      hsn: item.hsn,
      qty: item.qty,
      rate: item.price,
      discount: item.discount || 0,
      taxable: item.taxableValue || 0,
      gstPercent: item.gstPercent || 0,
      cgst: item.cgst || 0,
      sgst: item.sgst || 0,
      igst: item.igst || 0,
      total: item.total || 0,
    })),
    summary: {
      subtotal: invoice.subtotal || 0,
      discount: invoice.discount || 0,
      taxable: invoice.taxableAmount || 0,
      cgst: invoice.cgst || 0,
      sgst: invoice.sgst || 0,
      igst: invoice.igst || 0,
      grandTotal: invoice.grandTotal || 0,
    },
    placeOfSupply: invoice.customer?.state,
    stateCode,
    supplyType: invoice.invoiceType === "B2B" ? "Business" : "Consumer",
  };
}

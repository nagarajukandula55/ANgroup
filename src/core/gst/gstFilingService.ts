/**
 * GST filing service — the business-logic layer between API routes/ANu and
 * the GstFiling/GstPortalConfig models + the pushToPortal() adapter.
 *
 * Kept separate from the route file (same pattern as numberingService.ts,
 * anuService.ts) so both the HTTP route and ANu's tool-calling can share
 * one implementation instead of the route owning logic ANu would otherwise
 * have to duplicate.
 */

import { Types } from "mongoose";
import GstFiling, { IGstFiling } from "@/models/GstFiling";
import GstPortalConfig from "@/models/GstPortalConfig";
import SalesInvoice from "@/models/SalesInvoice";
import { pushToPortal } from "./gstPortalAdapter";

export interface QueueFilingInput {
  businessId: string;
  invoiceId: string;
  returnType: "GSTR1" | "GSTR3B" | "IFF";
  period: string;
  submittedBy?: string;
}

/**
 * Create a PENDING GstFiling row for an invoice, or return the existing one
 * for the same (invoiceId, returnType, period) if already queued — avoids
 * duplicate filings for the same invoice/period/return-type combination.
 */
export async function queueFiling(input: QueueFilingInput): Promise<IGstFiling> {
  const existing = await GstFiling.findOne({
    invoiceId: new Types.ObjectId(input.invoiceId),
    returnType: input.returnType,
    period: input.period,
  });
  if (existing) return existing;

  const invoice = await SalesInvoice.findById(input.invoiceId).lean();
  if (!invoice) {
    throw new Error(`Invoice ${input.invoiceId} not found`);
  }

  return GstFiling.create({
    businessId: new Types.ObjectId(input.businessId),
    invoiceId: new Types.ObjectId(input.invoiceId),
    invoiceNumber: invoice.invoiceNumber,
    returnType: input.returnType,
    period: input.period,
    status: "PENDING",
    submittedBy: input.submittedBy,
  });
}

/**
 * Push a PENDING (or previously FAILED) filing to the portal via the
 * adapter, updating status/portal reference/response payload accordingly.
 */
export async function submitFiling(filingId: string): Promise<IGstFiling> {
  const filing = await GstFiling.findById(filingId);
  if (!filing) throw new Error(`GST filing ${filingId} not found`);

  const config = await GstPortalConfig.findOne({ businessId: filing.businessId });
  if (!config) {
    throw new Error("No GST portal configuration found for this business. Configure it in Settings > GST Filing.");
  }

  const invoice = await SalesInvoice.findById(filing.invoiceId).lean();
  if (!invoice) throw new Error(`Invoice ${filing.invoiceId} not found`);

  const result = await pushToPortal(config, {
    gstin: config.gstin,
    returnType: filing.returnType,
    period: filing.period,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: (invoice.issueDate ?? invoice.createdAt).toISOString(),
    customerGstin: invoice.customer?.gstin,
    taxableValue: invoice.subtotal ?? 0,
    cgstAmount: invoice.cgstTotal ?? 0,
    sgstAmount: invoice.sgstTotal ?? 0,
    igstAmount: invoice.igstTotal ?? 0,
    grandTotal: invoice.grandTotal ?? 0,
  });

  filing.status = result.status;
  filing.portalReferenceId = result.portalReferenceId;
  filing.lastRequestPayload = result.requestPayload;
  filing.lastResponsePayload = result.responsePayload;
  filing.submittedAt = new Date();
  if (!result.ok) {
    filing.rejectionReason = result.errorMessage;
  }
  await filing.save();
  return filing;
}

/**
 * Everything not yet ACCEPTED — the "pendings" ANu is meant to help with,
 * per the user's explicit request. Ordered oldest-first so the longest-
 * outstanding filings surface first.
 */
export async function listPendingFilings(businessId: string) {
  return GstFiling.find({
    businessId: new Types.ObjectId(businessId),
    status: { $in: ["PENDING", "SUBMITTED", "FAILED", "REJECTED"] },
  })
    .sort({ createdAt: 1 })
    .lean();
}

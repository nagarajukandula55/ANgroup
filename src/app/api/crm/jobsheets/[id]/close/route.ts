/**
 * POST /api/crm/jobsheets/[id]/close — the final hinge of the CRM lifecycle:
 * marks a job sheet COMPLETED/INVOICED, generates a SalesInvoice from its
 * line items (reusing the canonical SalesInvoice model + numbering engine —
 * same GST-split logic as app/api/sales/invoices/route.ts, not a second
 * parallel invoicing path), and closes the originating call as CLOSED_WON.
 *
 * This is deliberately idempotent-safe: if the job sheet already has an
 * invoiceId, it returns the existing invoice rather than creating a
 * duplicate on a repeated call.
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CrmJobSheet from "@/models/CrmJobSheet";
import CrmCall from "@/models/CrmCall";
import SalesInvoice from "@/models/SalesInvoice";
import { generateDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";
import { notify } from "@/lib/notify";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    // Closing generates a SalesInvoice, so gate on the edit permission for
    // jobsheets (the resource being mutated) -- invoice creation itself is
    // an implicit side effect of this specific, already-gated action.
    try {
      requirePermission(session as any, buildPermissionCode("crm_jobsheets", "edit"));
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }
    const userId = session.user.id;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid job sheet id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { supplyType = "INTRASTATE", placeOfSupply, discountAmount = 0, workPerformed, materialsUsed } = body;

    await connectDB();

    const jobSheet = await CrmJobSheet.findOne({ _id: id, isDeleted: false });
    if (!jobSheet) {
      return NextResponse.json({ success: false, message: "Job sheet not found" }, { status: 404 });
    }

    // Idempotent: already closed with an invoice — return what exists
    // instead of erroring or double-billing the customer.
    if (jobSheet.invoiceId) {
      const existingInvoice = await SalesInvoice.findById(jobSheet.invoiceId).lean();
      return NextResponse.json({
        success: true,
        message: "Job sheet was already closed.",
        jobSheet,
        invoice: existingInvoice,
      });
    }

    if (!jobSheet.lineItems || jobSheet.lineItems.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cannot close a job sheet with no line items — add at least one before closing." },
        { status: 400 }
      );
    }

    /* ── Build invoice items with the same GST-split logic as
       app/api/sales/invoices/route.ts, so CRM-originated invoices are
       structurally identical to manually-created ones. ────────────── */
    let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0;

    const invoiceItems = jobSheet.lineItems.map((item: any) => {
      const lineAmt = (item.quantity || 1) * (item.unitPrice || 0);
      const totalGST = lineAmt * ((item.taxRate || 0) / 100);

      let cgstRate = 0, cgstAmount = 0, sgstRate = 0, sgstAmount = 0;
      let igstRate = 0, igstAmount = 0;

      if (supplyType === "INTERSTATE") {
        igstRate = item.taxRate || 0;
        igstAmount = totalGST;
        igstTotal += igstAmount;
      } else {
        cgstRate = (item.taxRate || 0) / 2;
        sgstRate = cgstRate;
        cgstAmount = totalGST / 2;
        sgstAmount = totalGST / 2;
        cgstTotal += cgstAmount;
        sgstTotal += sgstAmount;
      }

      subtotal += lineAmt;

      return {
        description: item.description || "",
        quantity: item.quantity || 1,
        unit: item.unit || "pcs",
        unitPrice: item.unitPrice || 0,
        taxRate: item.taxRate || 0,
        taxAmount: totalGST,
        cgstRate, cgstAmount,
        sgstRate, sgstAmount,
        igstRate, igstAmount,
        total: lineAmt + totalGST,
      };
    });

    const taxTotal = cgstTotal + sgstTotal + igstTotal;
    const grandTotal = subtotal + taxTotal - (discountAmount || 0);

    // GST-bearing invoices and non-GST (zero-tax/exempt) invoices get their
    // own separate running number series -- a business needs its
    // GST-taxable invoice numbers to be their own consecutive sequence for
    // filing purposes, not interleaved with zero-GST bills. Determined by
    // whether ANY line item actually carries GST, not the job sheet's
    // overall total (a single taxed line is enough to make this a GST
    // invoice even if others are zero-rated).
    const isGstInvoice = jobSheet.lineItems.some((item: any) => (item.taxRate || 0) > 0);
    const { value: invoiceNumber } = await generateDocumentNumber(
      jobSheet.businessId.toString(),
      isGstInvoice ? "INVOICE" : "NON_GST_INVOICE"
    );

    const invoice = await SalesInvoice.create({
      invoiceNumber,
      businessId: jobSheet.businessId,
      createdBy: new mongoose.Types.ObjectId(userId),
      invoiceType: "B2C",
      sourceOrderId: `CRM_JOBSHEET:${jobSheet._id}`,
      customer: {
        name: jobSheet.customerName,
        email: jobSheet.email,
        phone: jobSheet.phone,
        address: jobSheet.address,
      },
      supplyType,
      placeOfSupply,
      items: invoiceItems,
      subtotal,
      cgstTotal,
      sgstTotal,
      igstTotal,
      taxTotal,
      discountAmount,
      grandTotal,
      notes: `Generated from Job Sheet ${jobSheet.jobSheetNumber}`,
      status: "SENT",
    });

    jobSheet.status = "INVOICED";
    jobSheet.completedAt = jobSheet.completedAt || new Date();
    jobSheet.invoiceId = invoice._id as any;
    jobSheet.invoiceNumber = invoice.invoiceNumber;
    if (workPerformed !== undefined) jobSheet.workPerformed = workPerformed;
    if (materialsUsed !== undefined) jobSheet.materialsUsed = materialsUsed;
    await jobSheet.save();

    // No document is generated or stored here on purpose -- per explicit
    // direction, an invoice/estimate document should never be persisted as
    // a stored file; it's rendered fresh from the SalesInvoice record every
    // time someone actually wants it. /invoice/[invoiceNumber] (backed by
    // GET /api/invoice/view/[invoiceNumber]) already does exactly this: it
    // reads this SalesInvoice live and renders it through the same
    // template registry, with a "Print / Download PDF" button that uses
    // the browser's own print-to-PDF -- nothing to upload or keep in sync
    // here. That view route already handles this invoice's synthetic
    // "CRM_JOBSHEET:<id>" sourceOrderId correctly (see its own comment).

    // Close the originating call, if any, as CLOSED_WON — the call's whole
    // point was to arrive here.
    let closedCall = null;
    if (jobSheet.callId) {
      closedCall = await CrmCall.findOneAndUpdate(
        { _id: jobSheet.callId, isDeleted: false },
        {
          $set: { status: "CLOSED_WON", closedAt: new Date(), closedReason: "Job completed and invoiced" },
        },
        { new: true }
      );
    }

    logAction({
      action: "CLOSE",
      entity: "CrmJobSheet",
      entityId: id,
      after: { invoiceId: invoice._id, invoiceNumber: invoice.invoiceNumber },
      req,
      actor: { id: userId, businessId: jobSheet.businessId.toString() },
    });
    logAction({
      action: "CREATE",
      entity: "SalesInvoice",
      entityId: invoice._id?.toString(),
      after: invoice,
      req,
      actor: { id: userId, businessId: jobSheet.businessId.toString() },
    });

    notify({
      event: "CRM_JOB_CLOSED",
      message: `✅ Job ${jobSheet.jobSheetNumber} closed. Invoice ${invoice.invoiceNumber} generated for ${jobSheet.customerName} (₹${grandTotal.toLocaleString("en-IN")})`,
    }).catch(() => {});

    return NextResponse.json(
      { success: true, jobSheet, invoice, call: closedCall },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("CRM jobsheet close error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

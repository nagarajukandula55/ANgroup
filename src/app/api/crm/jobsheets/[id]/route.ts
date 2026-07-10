/**
 * CRM Job Sheet Detail
 * GET    /api/crm/jobsheets/[id]  — full job sheet detail
 * PATCH  /api/crm/jobsheets/[id]  — update job sheet (line items, status,
 *                                   work performed, materials, etc.)
 * DELETE /api/crm/jobsheets/[id]  — soft delete
 */

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import CrmJobSheet from "@/models/CrmJobSheet";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";
// Required for .populate(...) below -- model must be registered before populate can resolve it.
import "@/models/User";
import "@/models/CrmCall";

function permissionErrorResponse(err: any) {
  return NextResponse.json(
    { success: false, message: err.message },
    { status: err.code === "FORBIDDEN" ? 403 : 401 }
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("crm_jobsheets", "view"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid job sheet id" }, { status: 400 });
    }

    await connectDB();

    const jobSheet = await CrmJobSheet.findOne({ _id: id, isDeleted: false })
      .populate("assignedTo", "name email")
      .populate("callId", "callNumber status")
      .lean();

    if (!jobSheet) {
      return NextResponse.json({ success: false, message: "Job sheet not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, jobSheet });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  "title",
  "description",
  "scheduledAt",
  "completedAt",
  "assignedTo",
  "status",
  "lineItems",
  "materialsUsed",
  "workPerformed",
  "customerSignatureUrl",
  "internalNotes",
  "customerName",
  "company",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "pincode",
  "brandId",
  "imeiOrSerialNumber",
  "issueDescription",
  "faultCodeId",
  "remark",
  "brandJobNoForPartOrder",
];

// Statuses that mean a SalesInvoice already exists — job sheet content
// (especially lineItems, which the invoice was built FROM) must not change
// underneath an invoice that's already been issued to the customer.
const LOCKED_AFTER_INVOICE = new Set(["INVOICED"]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("crm_jobsheets", "edit"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }
    const userId = session.user.id;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid job sheet id" }, { status: 400 });
    }

    await connectDB();

    const existing = await CrmJobSheet.findOne({ _id: id, isDeleted: false }).lean();
    if (!existing) {
      return NextResponse.json({ success: false, message: "Job sheet not found" }, { status: 404 });
    }

    const body = await req.json();
    const updates: any = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (LOCKED_AFTER_INVOICE.has((existing as any).status) && updates.lineItems) {
      return NextResponse.json(
        { success: false, message: "Line items cannot be changed after the job has been invoiced." },
        { status: 409 }
      );
    }

    if (updates.status === "COMPLETED" && !updates.completedAt) {
      updates.completedAt = new Date();
    }

    const jobSheet = await CrmJobSheet.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { $set: updates },
      { new: true, runValidators: true }
    );

    logAction({
      action: "UPDATE",
      entity: "CrmJobSheet",
      entityId: id,
      after: updates,
      req,
      actor: { id: userId },
    });

    return NextResponse.json({ success: true, jobSheet });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("crm_jobsheets", "delete"));
    } catch (err: any) {
      return permissionErrorResponse(err);
    }
    const userId = session.user.id;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, message: "Invalid job sheet id" }, { status: 400 });
    }

    await connectDB();

    const jobSheet = await CrmJobSheet.findOne({ _id: id, isDeleted: false });
    if (!jobSheet) {
      return NextResponse.json({ success: false, message: "Job sheet not found" }, { status: 404 });
    }
    if (jobSheet.status === "INVOICED") {
      return NextResponse.json(
        { success: false, message: "An invoiced job sheet cannot be deleted — cancel the invoice first." },
        { status: 409 }
      );
    }

    jobSheet.isDeleted = true;
    await jobSheet.save();

    logAction({
      action: "DELETE",
      entity: "CrmJobSheet",
      entityId: id,
      req,
      actor: { id: userId },
    });

    return NextResponse.json({ success: true, message: "Job sheet deleted" });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import { BusinessService } from "@/services/business.service";
import Business from "@/models/Business";

export async function GET(req: Request, context: any) {
  try {
    await connectDB();

    const id = context?.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing business id" },
        { status: 400 }
      );
    }

    const business = await BusinessService.getBusinessById(id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

// PATCH /api/businesses/[id] — update editable business-profile fields.
// Added to back the new admin Settings hub (src/app/admin/settings)'s
// "Business Profile" tab — this endpoint didn't exist before (only GET
// did). Deliberately allow-lists which fields can be edited here (name/
// legalName/brandName/financial/compliance) rather than accepting an
// arbitrary partial Business document, so this can't be used to smuggle in
// changes to modules[]/accessCatalog/isActive or other fields that have
// their own dedicated, more carefully-guarded flows elsewhere.
const EDITABLE_FIELDS = [
  "name",
  "legalName",
  "brandName",
  "businessCode",
  "financial",
  "compliance",
  // e-Invoice (INV-01) readiness — see models/Business.ts's comment on this
  // field. Added here so it's actually editable through the Settings UI,
  // not just present on the schema with no way to set it.
  "gstStateCode",
] as const;

export async function PATCH(req: Request, context: any) {
  try {
    await connectDB();

    const id = context?.params?.id;
    if (!id) {
      return NextResponse.json({ success: false, message: "Missing business id" }, { status: 400 });
    }

    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};
    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No editable fields provided" }, { status: 400 });
    }

    const business = await Business.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
    if (!business) {
      return NextResponse.json({ success: false, message: "Business not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, business });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

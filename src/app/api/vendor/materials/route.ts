import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Material from "@/models/Material";
import MaterialCategory from "@/models/MaterialCategory";
import { resolveVendorContext } from "@/lib/auth/vendorContext";
import { generateScopedDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";

/**
 * POST /api/vendor/materials — lets a vendor add a new material directly
 * from the product wizard's BOM step, instead of being stuck waiting on a
 * Super Admin to add it via Admin > Materials first (materials:create is
 * deliberately admin-only on /api/materials -- this is a separate,
 * narrower vendor-facing path that only lets them create materials
 * attributed to themselves, not edit/delete the shared catalog).
 *
 * materialCode is auto-generated as "<VendorProfile.vendorId>-MAT-00001"
 * (vendor code, literal "MAT", 5-digit serial that increments per vendor)
 * via the same atomic per-scope counter every other auto-numbered entity
 * in this codebase uses -- never left for the vendor to type themselves,
 * so it can never collide or drift in format.
 */
export async function POST(req: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // resolveVendorContext already covers both the vendor Owner
    // (User.role === "VENDOR") AND vendor-team staff/Managers (added via
    // BusinessMember, whose User.role is never actually "VENDOR") -- a
    // blunt `x-user-role !== "VENDOR"` check here used to reject every
    // Manager/staff member outright before this even ran, so only the
    // literal account owner could ever add a material inline.
    const ctx = await resolveVendorContext(userId);
    if (!ctx) {
      return NextResponse.json({ success: false, message: "Vendor profile not found" }, { status: 404 });
    }
    const vendor = ctx.vendor as any;
    if (!vendor.businessId) {
      return NextResponse.json({ success: false, message: "Vendor has no business assigned" }, { status: 400 });
    }

    const body = await req.json();
    const materialName = String(body.materialName || "").trim();
    const unit = String(body.unit || "").trim();

    if (!materialName) {
      return NextResponse.json({ success: false, message: "Material name is required" }, { status: 400 });
    }
    if (!unit) {
      return NextResponse.json({ success: false, message: "Unit is required" }, { status: 400 });
    }

    // A vendor adding a material inline doesn't know (or need to know) the
    // business's material-category taxonomy -- find-or-create a single
    // "General" bucket per business rather than blocking creation on a
    // required field the vendor has no way to fill correctly. An admin can
    // always re-categorize it later from Admin > Materials.
    let generalCategory = await MaterialCategory.findOne({
      businessId: vendor.businessId,
      name: "General",
      isDeleted: { $ne: true },
    });
    if (!generalCategory) {
      generalCategory = await MaterialCategory.create({
        businessId: vendor.businessId,
        name: "General",
        description: "Default category for vendor-added materials, pending admin review.",
      });
    }

    const { sequence } = await generateScopedDocumentNumber(
      String(vendor._id),
      "MATERIAL",
      String(vendor.businessId),
      { vendorId: vendor.vendorId || "" }
    );
    const materialCode = `${vendor.vendorId}-MAT-${String(sequence).padStart(5, "0")}`;

    const material = await Material.create({
      businessId: vendor.businessId,
      materialCode,
      materialName,
      categoryId: generalCategory._id,
      purchaseUnit: unit,
      stockUnit: unit,
      consumptionUnit: unit,
      notes: `Added by vendor ${vendor.vendorId} (${vendor.companyName}) via the product wizard.`,
    });

    logAction({
      action: "CREATE",
      entity: "Material",
      entityId: material._id?.toString(),
      after: material,
      req,
      actor: { id: userId, businessId: String(vendor.businessId) },
    });

    return NextResponse.json({
      success: true,
      data: {
        _id: material._id,
        materialName: material.materialName,
        materialCode: material.materialCode,
        unit: material.stockUnit,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

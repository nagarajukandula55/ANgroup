import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProfile from "@/models/VendorProfile";
import Business from "@/models/Business";
import { Types } from "mongoose";
import { generateGlobalDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";

/**
 * POST /api/vendors/apply — PUBLIC vendor application.
 *
 * Admin shares the form link (/vendor-apply?businessId=...) with a
 * prospective vendor. The vendor fills in company, contact, GST/without-GST
 * compliance, address and bank details. The application lands in status
 * APPLIED for admin review — no login is created at this stage.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    const {
      businessId,
      companyName,
      contactPerson,
      email,
      phone,
      gstRegistered,
      gstNumber,
      panNumber,
      category,
      businessType,
      address,
      bankDetails,
      notes,
    } = body;

    if (!businessId || !Types.ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { success: false, message: "A valid businessId is required — use the exact link shared by the admin" },
        { status: 400 }
      );
    }
    if (!companyName || !contactPerson || !email || !phone) {
      return NextResponse.json(
        { success: false, message: "Company name, contact person, email and phone are required" },
        { status: 400 }
      );
    }

    // GST rule: a GST-registered vendor must supply a GSTIN; a without-GST
    // vendor must supply PAN instead.
    if (gstRegistered && !gstNumber) {
      return NextResponse.json(
        { success: false, message: "GSTIN is required for GST-registered vendors" },
        { status: 400 }
      );
    }
    if (!gstRegistered && !panNumber) {
      return NextResponse.json(
        { success: false, message: "PAN is required for vendors without GST registration" },
        { status: 400 }
      );
    }

    const business = await (Business as any)
      .findOne({ _id: businessId, isActive: true })
      .select("_id name brandName")
      .lean();
    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found or inactive" },
        { status: 404 }
      );
    }

    // One live application per email per business
    const existing = await VendorProfile.findOne({
      businessId: new Types.ObjectId(businessId),
      email: String(email).toLowerCase().trim(),
      isDeleted: false,
      status: { $nin: ["REJECTED", "INACTIVE"] },
    }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, message: "An application with this email already exists for this business" },
        { status: 409 }
      );
    }

    // vendorId is globally unique (see VendorProfile.ts) — was
    // countDocuments()-based (race-prone; two of the three vendor-ID
    // generators found across this codebase used this exact pattern with
    // different padding, see vendors/route.ts's comment for the full
    // history). Now uses the canonical numbering engine's global-scope
    // variant, same as vendors/route.ts, so vendor IDs created via either
    // path share the same atomic counter and never collide.
    const { value: vendorId } = await generateGlobalDocumentNumber("VENDOR", businessId);

    const vendor = await VendorProfile.create({
      businessId: new Types.ObjectId(businessId),
      vendorId,
      companyName: String(companyName).trim(),
      contactPerson: String(contactPerson).trim(),
      email: String(email).toLowerCase().trim(),
      phone: String(phone).trim(),
      gstRegistered: !!gstRegistered,
      gstNumber: gstNumber ? String(gstNumber).toUpperCase().trim() : undefined,
      panNumber: panNumber ? String(panNumber).toUpperCase().trim() : undefined,
      category,
      businessType,
      address,
      bankDetails,
      notes,
      status: "APPLIED",
      isApproved: false,
    });

    logAction({
      action: "CREATE",
      entity: "VendorProfile",
      entityId: vendor._id?.toString(),
      after: vendor,
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Application submitted successfully. The team will review your details and contact you for the partner agreement.",
        applicationId: vendor.vendorId,
        business: business.brandName || business.name,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

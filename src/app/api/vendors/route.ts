import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import VendorProfile from "@/models/VendorProfile";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";

/* =========================================================
 * GET /api/vendors?businessId=...&search=...&page=&limit=
 * Vendors are always scoped to a business (multi-tenant).
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    // Prefer the explicit query param, fall back to the active business
    // injected by the auth middleware.
    const businessId =
      searchParams.get("businessId") || h.get("x-active-business-id");
    const search = searchParams.get("search");
    const status = searchParams.get("status");

    if (!businessId || !Types.ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { success: false, error: "A valid businessId is required" },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    };

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { vendorId: { $regex: search, $options: "i" } },
      ];
    }

    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") || "100"))
    );

    const [vendors, total] = await Promise.all([
      VendorProfile.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      VendorProfile.countDocuments(query),
    ]);

    // `vendors` is what the admin vendors page reads; `data` kept for
    // any older consumers.
    return NextResponse.json({ success: true, vendors, data: vendors, total, page, limit });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* =========================================================
 * POST /api/vendors — onboard a vendor under a business
 * Accepts the full onboarding payload from the admin UI:
 * company, contact, compliance (GST/PAN), commercial terms,
 * address and bank details.
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const businessId = body.businessId || h.get("x-active-business-id");
    const {
      companyName,
      businessType,
      contactPerson,
      email,
      phone,
      gstNumber,
      panNumber,
      category,
      paymentTerms,
      creditLimit,
      address,
      bankDetails,
      notes,
    } = body;

    if (!businessId || !Types.ObjectId.isValid(businessId)) {
      return NextResponse.json(
        { success: false, error: "A valid businessId is required — every vendor belongs to a business" },
        { status: 400 }
      );
    }
    if (!companyName || !String(companyName).trim()) {
      return NextResponse.json(
        { success: false, error: "companyName is required" },
        { status: 400 }
      );
    }

    // Prevent obvious duplicates within the same business
    if (email) {
      const dup = await VendorProfile.findOne({
        businessId: new Types.ObjectId(businessId),
        email: String(email).toLowerCase().trim(),
        isDeleted: false,
      }).lean();
      if (dup) {
        return NextResponse.json(
          { success: false, error: "A vendor with this email already exists in this business" },
          { status: 409 }
        );
      }
    }

    // vendorId is GLOBALLY unique in the schema, so count globally.
    // (Counting per business made every business's first vendor VND-0001
    // and the second create crashed with a duplicate-key error.)
    const count = await VendorProfile.countDocuments();
    const vendorId = `VND-${String(count + 1).padStart(4, "0")}`;

    const vendor = await VendorProfile.create({
      businessId: new Types.ObjectId(businessId),
      vendorId,
      companyName: String(companyName).trim(),
      businessType,
      contactPerson,
      email: email ? String(email).toLowerCase().trim() : undefined,
      phone,
      gstNumber: gstNumber ? String(gstNumber).toUpperCase().trim() : undefined,
      panNumber: panNumber ? String(panNumber).toUpperCase().trim() : undefined,
      category,
      paymentTerms,
      creditLimit: typeof creditLimit === "number" ? creditLimit : undefined,
      address,
      bankDetails,
      notes,
      status: "PENDING",
      isApproved: false,
    });

    return NextResponse.json({ success: true, vendor, data: vendor }, { status: 201 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

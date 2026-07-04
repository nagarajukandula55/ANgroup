import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import VendorProfile from "@/models/VendorProfile";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";

/* =========================================================
 * GET VENDORS
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
    const businessId = searchParams.get("businessId");
    const search = searchParams.get("search");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const query: Record<string, unknown> = {
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    };

    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const vendors = await VendorProfile.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: vendors });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

/* =========================================================
 * CREATE VENDOR
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
    const { businessId, companyName, email, phone, address, gstNumber } = body;

    if (!businessId || !companyName) {
      return NextResponse.json(
        { error: "businessId and companyName are required" },
        { status: 400 }
      );
    }

    // Generate a unique vendorId. NOTE: the schema declares vendorId as
    // GLOBALLY unique, so the count must be global too — counting per
    // business made every business's first vendor "VND-0001" and the
    // second business's create call crashed with a duplicate-key error.
    const count = await VendorProfile.countDocuments();
    const vendorId = `VND-${String(count + 1).padStart(4, "0")}`;

    const vendor = await VendorProfile.create({
      businessId: new Types.ObjectId(businessId),
      vendorId,
      companyName,
      email,
      phone,
      address,
      gstNumber,
    });

    return NextResponse.json({ success: true, data: vendor });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

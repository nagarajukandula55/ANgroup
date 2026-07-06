import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import VendorProfile from "@/models/VendorProfile";

// GET /api/warehouses — previously returned EVERY warehouse across every
// business/vendor with no scoping at all. Now scoped:
//  - a VENDOR caller only ever sees warehouses under their own vendorId
//  - everyone else (business staff/admin) is scoped to their active
//    business, same pattern used across the rest of the app
//  - optional ?vendorId=... lets a business admin filter to one vendor's
//    warehouses specifically (e.g. from a vendor detail screen)
export async function GET(req) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = {};

    const callerVendorProfile = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
    if (callerVendorProfile) {
      // A vendor-side caller (owner or staff, once vendor staff exist) is
      // always locked to their own vendor's warehouses — they should never
      // see another vendor's or the business's own warehouses.
      query.vendorId = callerVendorProfile._id;
    } else {
      const activeBusinessId = h.get("x-active-business-id");
      if (activeBusinessId) query.businessId = activeBusinessId;
      const vendorIdFilter = searchParams.get("vendorId");
      if (vendorIdFilter) query.vendorId = vendorIdFilter;
    }

    const warehouses = await Warehouse.find(query).sort({ warehouseName: 1 });

    return NextResponse.json({
      success: true,
      data: warehouses,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // If the caller is a vendor, force the warehouse under their own
    // vendorId regardless of what the request body says — a vendor cannot
    // create a warehouse for the business or for another vendor.
    const callerVendorProfile = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
    if (callerVendorProfile) {
      body.vendorId = callerVendorProfile._id;
      body.businessId = callerVendorProfile.businessId;
    }

    const warehouse = await Warehouse.create(body);

    return NextResponse.json({
      success: true,
      data: warehouse,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

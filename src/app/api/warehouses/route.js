import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import { resolveVendorContext } from "@/lib/auth/vendorContext";

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

    // A vendor-side caller (owner OR staff — see lib/auth/vendorContext.ts)
    // is always locked to their own vendor's warehouses — they should
    // never see another vendor's or the business's own warehouses.
    const callerVendorCtx = await resolveVendorContext(userId);
    if (callerVendorCtx) {
      query.vendorId = callerVendorCtx.vendor._id;
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
    const callerVendorCtx = await resolveVendorContext(userId);
    if (callerVendorCtx) {
      body.vendorId = callerVendorCtx.vendor._id;
      body.businessId = callerVendorCtx.vendor.businessId;
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

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import Warehouse from "@/models/Warehouse";
import VendorProfile from "@/models/VendorProfile";

/** A vendor caller may only touch their own warehouse. Business staff/admin
 * are not restricted here (broader business-level auth already gates access
 * to this route at all) — this only exists to stop vendor A from editing
 * vendor B's warehouse, or a business's own, via a guessed/known ID. */
async function assertVendorOwnsWarehouseOrNotVendor(userId, warehouse) {
  if (!warehouse) return true;
  const callerVendorProfile = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
  if (!callerVendorProfile) return true; // not a vendor caller — no extra restriction here
  return String(warehouse.vendorId || "") === String(callerVendorProfile._id);
}

export async function GET(req, { params }) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const warehouse = await Warehouse.findById(params.id);
    if (!(await assertVendorOwnsWarehouseOrNotVendor(userId, warehouse))) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

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

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const existing = await Warehouse.findById(params.id);
    if (!(await assertVendorOwnsWarehouseOrNotVendor(userId, existing))) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    // A vendor caller cannot reassign their warehouse to a different
    // vendor/business via this endpoint.
    const callerVendorProfile = await VendorProfile.findOne({ userId, isDeleted: { $ne: true } }).lean();
    if (callerVendorProfile) {
      delete body.vendorId;
      delete body.businessId;
    }

    const warehouse = await Warehouse.findByIdAndUpdate(params.id, body, { new: true });

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

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const existing = await Warehouse.findById(params.id);
    if (!(await assertVendorOwnsWarehouseOrNotVendor(userId, existing))) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    await Warehouse.findByIdAndDelete(params.id);

    return NextResponse.json({
      success: true,
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

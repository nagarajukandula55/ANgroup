import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { requirePermission } from "@/middleware/permission.guard";
import Vendor from "@/models/Vendor";
import { Types } from "mongoose";

/* =========================================================
 * GET VENDORS
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    requirePermission(session, "vendor.view");

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const vendors = await Vendor.find({
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: vendors,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================================================
 * CREATE VENDOR
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    requirePermission(session, "vendor.manage");

    const body = await req.json();

    const {
      businessId,
      name,
      email,
      phone,
      address,
      gstNumber,
    } = body;

    if (!businessId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const vendor = await Vendor.create({
      businessId: new Types.ObjectId(businessId),
      name,
      email,
      phone,
      address,
      gstNumber,
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: vendor,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

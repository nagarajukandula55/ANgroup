import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { requirePermission } from "@/middleware/permission.guard";
import PurchaseOrder from "@/models/PurchaseOrder";
import { Types } from "mongoose";

/* =========================================================
 * GET PURCHASE ORDERS
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

    requirePermission(session, "purchase.view");

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );
    }

    const orders = await PurchaseOrder.find({
      businessId: new Types.ObjectId(businessId),
      isDeleted: false,
    }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: orders,
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
 * CREATE PURCHASE ORDER
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

    requirePermission(session, "purchase.create");

    const body = await req.json();

    const {
      businessId,
      vendorId,
      items,
      expectedDate,
    } = body;

    if (!businessId || !vendorId || !items?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const order = await PurchaseOrder.create({
      businessId: new Types.ObjectId(businessId),
      vendorId: new Types.ObjectId(vendorId),
      items,
      expectedDate,
      status: "DRAFT",
      createdBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: order,
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

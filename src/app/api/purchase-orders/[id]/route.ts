import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getPurchaseOrderById,
  updatePurchaseOrder,
  approvePurchaseOrder,
} from "@/services/purchaseOrder.service";

/* =========================================================
GET PURCHASE ORDER
========================================================= */

export async function GET(_: Request, { params }: any) {
  try {
    await connectDB();

    const data = await getPurchaseOrderById(params.id);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
UPDATE PURCHASE ORDER
========================================================= */

export async function PUT(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();

    const data = await updatePurchaseOrder(params.id, body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

/* =========================================================
APPROVAL WORKFLOW
========================================================= */

export async function PATCH(req: Request, { params }: any) {
  try {
    await connectDB();

    const body = await req.json();

    const { action, userId } = body;

    const data = await approvePurchaseOrder({
      id: params.id,
      action,
      userId: userId || "ADMIN",
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  getPurchaseOrderById,
  updatePurchaseOrder,
  approvePurchaseOrder,
} from "@/services/purchaseOrder.service";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";


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
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("purchase", "edit"));
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const data = await updatePurchaseOrder(params.id, body);

    logAction({
      action: "UPDATE",
      entity: "PurchaseOrder",
      entityId: params.id,
      after: data,
      req,
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

/* =========================================================
APPROVAL WORKFLOW
========================================================= */

export async function PATCH(req: Request, { params }: any) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("purchase", "approve"));
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const { action, userId } = body;

    const data = await approvePurchaseOrder({
      id: params.id,
      action,
      userId: userId || "ADMIN",
    });

    logAction({
      action: action || "UPDATE",
      entity: "PurchaseOrder",
      entityId: params.id,
      after: data,
      req,
      actor: { id: userId },
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

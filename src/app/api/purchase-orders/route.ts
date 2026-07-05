import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
} from "@/services/purchaseOrder.service";
import { logAction } from "@/lib/audit/logAction";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const data = await createPurchaseOrder(body);

    logAction({
      action: "CREATE",
      entity: "PurchaseOrder",
      entityId: (data as any)?._id?.toString?.() ?? (data as any)?._id,
      after: data,
      req,
      actor: { businessId: body?.businessId },
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const data = await getAllPurchaseOrders();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

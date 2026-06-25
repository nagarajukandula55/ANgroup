import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createPurchaseOrder,
  getAllPurchaseOrders,
} from "@/services/purchaseOrder.service";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const body = await req.json();
    const data = await createPurchaseOrder(body);

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
    await dbConnect();

    const data = await getAllPurchaseOrders();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

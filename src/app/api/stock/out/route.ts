import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { stockOut } from "@/services/stock.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const data = await stockOut(body);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 400 }
    );
  }
}

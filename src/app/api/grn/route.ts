import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import {
  createGRN,
  getAllGRNs,
} from "@/services/grn.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();
    const data = await createGRN(body);

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

    const data = await getAllGRNs();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

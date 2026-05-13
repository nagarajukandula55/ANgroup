import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { assignAccess } from "@/services/access.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const result = await assignAccess(body);

    return NextResponse.json({
      success: true,
      access: result,
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

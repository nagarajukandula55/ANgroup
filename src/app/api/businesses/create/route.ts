import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { bootstrapBusiness } from "@/services/businessBootstrap.service";

export async function POST(req: Request) {
  try {
    await connectDB();

    const body = await req.json();

    const business = await bootstrapBusiness(body);

    return NextResponse.json({
      success: true,
      business,
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

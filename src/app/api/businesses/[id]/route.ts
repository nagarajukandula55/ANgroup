import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { BusinessService } from "@/services/business.service";

export async function GET(req: Request, context: any) {
  try {
    await connectDB();

    const id = context?.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing business id" },
        { status: 400 }
      );
    }

    const business = await BusinessService.getBusinessById(id);

    if (!business) {
      return NextResponse.json(
        { success: false, message: "Business not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      business,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

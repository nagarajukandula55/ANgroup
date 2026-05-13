import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { BusinessService } from "@/services/business.service";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectDB();

  const business = await BusinessService.getBusinessById(
    params.id
  );

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
}

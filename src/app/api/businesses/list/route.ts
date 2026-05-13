import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { BusinessService } from "@/services/business.service";

export async function GET() {
  await connectDB();

  const businesses = await BusinessService.listBusinesses();

  return NextResponse.json({
    success: true,
    businesses,
  });
}

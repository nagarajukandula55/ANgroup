import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { BusinessService } from "@/services/business.service";
import { getOrCreateANGroupBusinessId } from "@/core/access/anGroupBusiness.service";

export async function GET() {
  await connectDB();

  // Ensures the real "AN Group" business record exists before any consumer
  // of this list (business switchers/dropdowns platform-wide) renders --
  // AN Group is meant to always appear as a real, selectable business, not
  // something that only shows up after some other feature happens to
  // create it first.
  await getOrCreateANGroupBusinessId();

  const businesses = await BusinessService.listBusinesses();

  return NextResponse.json({
    success: true,
    businesses,
  });
}

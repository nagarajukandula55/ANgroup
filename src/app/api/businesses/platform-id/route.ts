/**
 * GET /api/businesses/platform-id — PUBLIC. Returns AN Group's own platform
 * businessId, so a public link that doesn't specify ?businessId=/?code=
 * (e.g. the homepage's plain "Book an Appointment" CTA) still has a real
 * business to submit against instead of failing with "missing business
 * reference" -- it defaults to AN Group's own service business rather than
 * requiring every public link to know/embed a specific id.
 */
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { getOrCreateANGroupBusinessId } from "@/core/access/anGroupBusiness.service";

export async function GET() {
  try {
    await connectDB();
    const businessId = await getOrCreateANGroupBusinessId();
    return NextResponse.json({ success: true, businessId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

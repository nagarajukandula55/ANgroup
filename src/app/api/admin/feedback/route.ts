import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";

/**
 * GET /api/admin/feedback — list customer feedback / contact-us submissions
 * for the active business (same x-active-business-id convention as
 * app/api/crm/calls/route.ts). Falls back to the query-string businessId
 * for super-admin "all businesses" browsing.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const h = req.headers;
    const bizId = h.get("x-active-business-id") || req.nextUrl.searchParams.get("businessId");
    const status = req.nextUrl.searchParams.get("status");

    const query: Record<string, unknown> = {};
    if (bizId) query.businessId = bizId;
    if (status && status !== "ALL") query.status = status;

    const items = await Feedback.find(query).sort({ createdAt: -1 }).limit(500).lean();

    return NextResponse.json({ success: true, items });
  } catch (err: any) {
    console.error("Admin feedback GET error:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

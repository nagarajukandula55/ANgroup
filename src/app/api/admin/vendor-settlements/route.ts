import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import VendorSettlement from "@/models/VendorSettlement";

/* =========================================================
 * GET /api/admin/vendor-settlements?businessId=&status=
 * Admin visibility into vendor payout settlements — what's owed, what's
 * been transferred, and what failed/pending, per business.
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || h.get("x-active-business-id");
    const status = searchParams.get("status");

    if (!businessId) {
      return NextResponse.json({ success: false, error: "businessId is required" }, { status: 400 });
    }

    const query: Record<string, unknown> = { businessId };
    if (status) query.status = status;

    const settlements = await VendorSettlement.find(query)
      .populate("vendorId", "companyName vendorId")
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const totals = settlements.reduce(
      (acc, s: any) => {
        acc.gross += s.grossAmount;
        acc.commission += s.platformCommissionAmount;
        acc.net += s.netPayoutAmount;
        if (s.status === "PENDING" || s.status === "FAILED") acc.outstanding += s.netPayoutAmount;
        return acc;
      },
      { gross: 0, commission: 0, net: 0, outstanding: 0 }
    );

    return NextResponse.json({ success: true, settlements, data: settlements, totals });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

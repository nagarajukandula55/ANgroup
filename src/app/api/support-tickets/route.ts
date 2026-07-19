import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

// GET /api/support-tickets?businessId=&status=
export async function GET(req: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("support_tickets", "view"));
    } catch (err: any) {
      return NextResponse.json({ success: false, message: err.message }, { status: err.code === "FORBIDDEN" ? 403 : 401 });
    }

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const status = searchParams.get("status");
    if (!businessId) {
      return NextResponse.json({ success: false, message: "businessId is required" }, { status: 400 });
    }

    await connectDB();
    const query: Record<string, unknown> = { businessId };
    if (status) query.status = status;

    const tickets = await SupportTicket.find(query).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, tickets });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

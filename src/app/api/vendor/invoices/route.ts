import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import SalesInvoice from "@/models/SalesInvoice";
import { resolveVendorContext } from "@/lib/auth/vendorContext";

/**
 * GET /api/vendor/invoices — the vendor's own B2B invoices (vendor -> this
 * business, generated automatically by dualInvoiceService.ts whenever one
 * of their products sells). /vendor/page.tsx has linked to /vendor/invoices
 * since it was built, but neither this route nor the page it points to
 * ever existed — a real dead link on the vendor's own dashboard.
 */
export async function GET(req: NextRequest) {
  try {
    const headersList = await headers();
    const userId = headersList.get("x-user-id");
    const userRole = headersList.get("x-user-role");

    if (!userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (userRole !== "VENDOR") {
      return NextResponse.json({ success: false, message: "Vendor access required" }, { status: 403 });
    }

    await connectDB();

    const ctx = await resolveVendorContext(userId);
    if (!ctx) {
      return NextResponse.json({ success: false, message: "Vendor profile not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const filter: Record<string, unknown> = {
      vendorId: (ctx.vendor as any)._id,
      invoiceType: "B2B",
    };
    if (status) filter.status = status;

    const invoices = await SalesInvoice.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    const summary = invoices.reduce(
      (acc, inv: any) => {
        acc.totalInvoiced += inv.grandTotal || 0;
        if (inv.status === "PAID") acc.totalPaid += inv.grandTotal || 0;
        else if (inv.status !== "CANCELLED") acc.outstanding += inv.grandTotal || 0;
        return acc;
      },
      { totalInvoiced: 0, totalPaid: 0, outstanding: 0 }
    );

    return NextResponse.json({ success: true, invoices, summary });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

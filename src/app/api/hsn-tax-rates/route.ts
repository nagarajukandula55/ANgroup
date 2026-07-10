/**
 * GET /api/hsn-tax-rates?businessId=...&hsnCode=...
 * Simple HSN -> GST rate lookup used by the Workorder line-item UI to
 * auto-fill tax% when a part is picked by its HSN code. Auto-seeds
 * DEFAULT_HSN_TAX_RATES (global) on first call if nothing exists yet.
 * No POST/PUT here by design -- keep this minimal per spec scope; editing
 * can be added later if the business needs to override rates per HSN.
 */

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Types } from "mongoose";
import HsnTaxRate, { DEFAULT_HSN_TAX_RATES } from "@/models/HsnTaxRate";
import { getEnrichedSession } from "@/lib/auth/session-enriched";

async function ensureSeeded() {
  const count = await HsnTaxRate.countDocuments({});
  if (count === 0) {
    await HsnTaxRate.insertMany(DEFAULT_HSN_TAX_RATES.map((r) => ({ ...r, businessId: null })));
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    await ensureSeeded();

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    const hsnCode = searchParams.get("hsnCode");

    const query: Record<string, unknown> = {};
    if (businessId && Types.ObjectId.isValid(businessId)) {
      query.$or = [{ businessId: new Types.ObjectId(businessId) }, { businessId: null }];
    }
    if (hsnCode) query.hsnCode = hsnCode.trim();

    const rates = await HsnTaxRate.find(query).sort({ hsnCode: 1 }).lean();

    // If a specific hsnCode was requested, prefer a business-specific
    // override over the global default when both exist.
    if (hsnCode && rates.length > 1) {
      const businessSpecific = rates.find((r) => r.businessId);
      return NextResponse.json({ success: true, rate: businessSpecific || rates[0], rates });
    }

    return NextResponse.json({ success: true, rate: rates[0] || null, rates });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

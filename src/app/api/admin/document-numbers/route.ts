import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectDB } from "@/lib/mongodb";
import DocumentNumberConfig, {
  DOCUMENT_TYPES,
} from "@/models/DocumentNumberConfig";
// Was @/lib/accounting/getFinancialYear — one of 3 duplicate FY calculators
// that didn't even agree on output format with each other (see
// core/numbering/financialYear.ts's top comment). Now uses the canonical one.
import { getFinancialYear } from "@/core/numbering/financialYear";
import { DEFAULT_PREFIXES } from "@/core/numbering/types";
import { logAction } from "@/lib/audit/logAction";

/* helper: build the format preview string from config fields */
function buildPreview(
  prefix: string,
  separator: string,
  includeFinancialYear: boolean,
  includeMonth: boolean,
  sequenceLength: number,
  suffix: string
): string {
  const parts: string[] = [];
  if (prefix) parts.push(prefix);
  if (includeFinancialYear) parts.push(getFinancialYear());
  if (includeMonth) parts.push("MM");
  parts.push("0".repeat(sequenceLength));
  if (suffix) parts.push(suffix);
  return parts.join(separator || "-");
}

/* =========================================================
 * GET — list all configs for a business, with defaults for
 *       any doc type that has no saved config yet
 * =======================================================*/
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");
    if (!businessId)
      return NextResponse.json(
        { error: "businessId is required" },
        { status: 400 }
      );

    const saved = await DocumentNumberConfig.find({ businessId }).lean();
    const savedMap = new Map(saved.map((c: any) => [c.documentType, c]));

    // Build full list — saved config or sensible defaults per type. Reuses
    // DEFAULT_PREFIXES from the canonical numbering engine (core/numbering/
    // types.ts) instead of a separately hand-maintained map, so this UI's
    // defaults can never drift out of sync with what generateDocumentNumber()
    // itself falls back to when a business hasn't configured a type yet.
    const defaults: Record<string, string> = DEFAULT_PREFIXES;

    const configs = DOCUMENT_TYPES.map((docType: string) => {
      const existing = savedMap.get(docType);
      if (existing) return existing;

      const prefix = defaults[docType] ?? docType.slice(0, 3);
      return {
        businessId,
        documentType: docType,
        prefix,
        separator: "-",
        includeFinancialYear: true,
        includeMonth: false,
        sequenceLength: 4,
        suffix: "",
        startFrom: 1,
        isActive: true,
        formatPreview: buildPreview(prefix, "-", true, false, 4, ""),
        _saved: false,
      };
    });

    return NextResponse.json({ success: true, data: configs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/* =========================================================
 * POST — create or update (upsert) a single config
 * =======================================================*/
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const h = await headers();
    const userId = h.get("x-user-id");
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      businessId,
      documentType,
      prefix = "",
      separator = "-",
      includeFinancialYear = true,
      includeMonth = false,
      sequenceLength = 4,
      suffix = "",
      startFrom = 1,
      isActive = true,
    } = body;

    if (!businessId || !documentType)
      return NextResponse.json(
        { error: "businessId and documentType are required" },
        { status: 400 }
      );

    const formatPreview = buildPreview(
      prefix,
      separator,
      includeFinancialYear,
      includeMonth,
      sequenceLength,
      suffix
    );

    const config = await DocumentNumberConfig.findOneAndUpdate(
      { businessId, documentType },
      {
        $set: {
          prefix,
          separator,
          includeFinancialYear,
          includeMonth,
          sequenceLength,
          suffix,
          startFrom,
          isActive,
          formatPreview,
          updatedBy: userId,
        },
        $setOnInsert: { createdBy: userId },
      },
      { upsert: true, new: true }
    );

    logAction({
      action: "UPDATE",
      entity: "DocumentNumberConfig",
      entityId: config?._id?.toString(),
      after: config,
      req,
      actor: { id: userId, businessId },
    });

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

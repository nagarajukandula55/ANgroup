import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NativeProduct from "@/models/NativeProduct";

/**
 * GET /api/categories — PUBLIC, unauthenticated storefront category list.
 *
 * Built for the Native storefront integration: a logged-out visitor
 * browsing the homepage category grid / product filters previously had
 * nowhere to hit (this route didn't exist), per the gap Native's own
 * ANGROUP_INTEGRATION_STATUS.md documented. No dedicated Category model
 * exists in this codebase (category is a plain string field on
 * NativeProduct) -- derives the distinct, non-empty category values for
 * the given business rather than inventing a new model+admin UI for
 * something that's currently just a free-text field. If categories ever
 * need their own metadata (image, description, sort order), that's a
 * follow-up, not a blocker for browsing to work.
 *
 * Deliberately does NOT reuse api/products/route.ts (that route requires
 * x-user-id and returns internal ERP fields) -- this is a new,
 * intentionally public, read-only, storefront-safe endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json({ success: false, message: "businessId is required" }, { status: 400 });
    }

    const categories = await NativeProduct.distinct("category", {
      businessId,
      isActive: true,
      isDeleted: { $ne: true },
      category: { $nin: [null, ""] },
    });

    return NextResponse.json({
      success: true,
      categories: categories.sort().map((name) => ({ name, slug: String(name).toLowerCase().replace(/\s+/g, "-") })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import NativeProduct from "@/models/NativeProduct";

/**
 * GET /api/products/[slug] — PUBLIC, unauthenticated single-product page.
 * Genuinely new route (didn't exist before -- only the auth-gated list at
 * api/products/route.ts did). Scoped to businessId via query param so a
 * storefront tenant only ever sees its own products; only public-safe
 * fields are returned, matching api/storefront/products/route.ts's shape.
 */
export async function GET(req: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    await connectDB();

    const { slug } = await context.params;
    const businessId = req.nextUrl.searchParams.get("businessId");
    if (!businessId) {
      return NextResponse.json({ success: false, message: "businessId is required" }, { status: 400 });
    }

    const product = await NativeProduct.findOne({
      slug,
      businessId,
      isActive: true,
      isDeleted: { $ne: true },
    })
      .select("name slug description category images basePrice unit stock hsn taxRate sku createdAt metaTitle metaDescription keywords")
      .lean();

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const p = product as any;
    return NextResponse.json({
      success: true,
      product: {
        id: String(p._id),
        name: p.name,
        slug: p.slug,
        description: p.description,
        category: p.category,
        images: p.images || [],
        price: p.basePrice || 0,
        unit: p.unit || "pcs",
        inStock: (p.stock || 0) > 0,
        taxRate: p.taxRate || 0,
        sku: p.sku || "",
        // SEO fields — meta title/description for <head>, keywords for tags,
        // canonicalSlug so the frontend can build a canonical <link> without
        // re-deriving it (it's the same value as slug by construction here).
        metaTitle: p.metaTitle || p.name,
        metaDescription: p.metaDescription || p.description || "",
        keywords: p.keywords || [],
        canonicalSlug: p.slug,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

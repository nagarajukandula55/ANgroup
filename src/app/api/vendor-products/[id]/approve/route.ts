import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";
import NativeProduct from "@/models/NativeProduct";
import ProductCategory from "@/models/ProductCategory";
import { generateSEO } from "@/services/seo.service";
import { generateDocumentNumber } from "@/core/numbering/numberingService";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

function generateSKU(productCode: string, variantCode: string) {
  return `${productCode}-${variantCode}`.toUpperCase();
}

export async function POST(req: Request, context: any) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("vendor_products", "approve"));
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    await connectDB();

    const vendorProduct = await VendorProduct.findById(
      (await context.params).id
    );

    if (!vendorProduct) {
      return NextResponse.json(
        { success: false, message: "Not found" },
        { status: 404 }
      );
    }

    /* =========================================================
       🔒 VALIDATION: MUST HAVE COST + BOM
    ========================================================= */
    const cost = vendorProduct.calculatedCost;

    if (!cost || cost.finalCost <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "BOM / Cost not completed properly",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       🔒 PREVENT DOUBLE APPROVAL
    ========================================================= */
    if (vendorProduct.approvalStatus === "APPROVED") {
      return NextResponse.json(
        {
          success: false,
          message: "Already approved",
        },
        { status: 400 }
      );
    }

    /* =========================================================
       🧱 CREATE PRODUCT
    ========================================================= */
    // Was `PRD-${Date.now()}` — collision-prone under concurrent approvals
    // and not admin-configurable. Now uses the canonical numbering engine
    // (core/numbering/numberingService.ts), same as every other document
    // type, scoped to this vendor product's business.
    const { value: productCode } = await generateDocumentNumber(
      String(vendorProduct.businessId),
      "PRODUCT"
    );

    const product = await Product.create({
      companyId: vendorProduct.businessId,

      productCode,
      productName: vendorProduct.productName,

      categoryId: vendorProduct.categoryId,
      brandId: vendorProduct.brandId,

      description: vendorProduct.description,
      images: vendorProduct.images,

      currentCost: cost.finalCost,
      safeCost: cost.baseCost,
      worstCaseCost: cost.wastageCost,

      status: "DRAFT",
      active: false,
    });

    const seo = generateSEO(vendorProduct);

      product.seo = seo;
      
      await product.save();

    /* =========================================================
       🧱 CREATE VARIANT
    ========================================================= */
    // Was `VAR-${Date.now()}` — same fix as productCode above.
    const { value: variantCode } = await generateDocumentNumber(
      String(vendorProduct.businessId),
      "PRODUCT_VARIANT"
    );

    const variant = await ProductVariant.create({
      companyId: vendorProduct.businessId,
      productId: product._id,

      variantCode,
      variantName: vendorProduct.variantName,

      vendorSku: vendorProduct.vendorSku,

      sku: generateSKU(productCode, variantCode),

      unit: vendorProduct.unit,
      packSize: vendorProduct.packSize,

      netWeight: vendorProduct.netWeight,
      grossWeight: vendorProduct.grossWeight,

      mrp: vendorProduct.mrp,
      sellingPrice: vendorProduct.suggestedSellingPrice,

      currentCost: cost.finalCost,

      status: "DRAFT",
      active: false,
    });

    /* =========================================================
       🔒 UPDATE VENDOR PRODUCT
    ========================================================= */
    vendorProduct.approvalStatus = "APPROVED";
    vendorProduct.status = "APPROVED";
    vendorProduct.productId = product._id;
    vendorProduct.variantId = variant._id;
    vendorProduct.approvedAt = new Date();

    await vendorProduct.save();

    /* =========================================================
       🧱 SYNC TO NativeProduct (what the Native storefront + the
       admin products list actually read from — see storefront
       routes api/storefront/products/route.ts and
       api/products/[slug]/route.ts). Without this, an approved
       VendorProduct only lived in Product/ProductVariant, which
       nothing on the storefront reads — the "approved" product was
       invisible to customers. This is the fix for that gap: the
       approval step is now the single moment a product becomes
       live everywhere (internal ERP catalog AND storefront).
    ========================================================= */
    let categoryName: string | undefined;
    if (vendorProduct.categoryId) {
      const category = await ProductCategory.findById(vendorProduct.categoryId).lean();
      categoryName = (category as any)?.name;
    }

    const nativeProductData = {
      name: `${vendorProduct.productName} ${vendorProduct.variantName || ""}`.trim(),
      sku: variant.sku,
      description: vendorProduct.description,
      category: categoryName,
      businessId: vendorProduct.businessId,
      unit: vendorProduct.unit,
      basePrice: variant.sellingPrice || vendorProduct.suggestedSellingPrice || 0,
      taxRate: vendorProduct.gstRate || 0,
      hsn: vendorProduct.hsnCode,
      images: vendorProduct.images,
      isActive: true,
      isDeleted: false,
      stock: vendorProduct.availableStock || 0,
      metaTitle: seo.title,
      metaDescription: seo.description,
      keywords: seo.keywords?.filter((k: unknown) => typeof k === "string"),
      slug: seo.slug,
      createdBy: vendorProduct.createdBy,
    };

    let nativeProduct;
    if (vendorProduct.nativeProductId) {
      nativeProduct = await NativeProduct.findByIdAndUpdate(
        vendorProduct.nativeProductId,
        nativeProductData,
        { new: true, runValidators: true }
      );
    }
    if (!nativeProduct) {
      // Slug must be unique — fall back to a suffixed slug on collision
      // rather than failing the whole approval.
      let slugCandidate = nativeProductData.slug;
      let attempt = 0;
      while (await NativeProduct.findOne({ slug: slugCandidate }).lean()) {
        attempt += 1;
        slugCandidate = `${nativeProductData.slug}-${attempt}`;
      }
      nativeProduct = await NativeProduct.create({
        ...nativeProductData,
        slug: slugCandidate,
      });
      vendorProduct.nativeProductId = nativeProduct._id;
      await vendorProduct.save();
    }

    logAction({
      action: "APPROVE",
      entity: "VendorProduct",
      entityId: vendorProduct._id?.toString(),
      after: { product, variant, nativeProduct },
      req,
      actor: { businessId: vendorProduct.businessId?.toString() },
    });

    return NextResponse.json({
      success: true,
      data: { product, variant, nativeProduct },
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

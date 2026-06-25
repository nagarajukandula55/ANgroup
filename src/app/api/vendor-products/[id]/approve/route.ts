import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

function generateSKU(productCode: string, variantCode: string) {
  return `${productCode}-${variantCode}`.toUpperCase();
}

export async function POST(req: Request, context: any) {
  try {
    await connectDB();

    const vendorProduct = await VendorProduct.findById(
      context.params.id
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
    const productCode = `PRD-${Date.now()}`;

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

    /* =========================================================
       🧱 CREATE VARIANT
    ========================================================= */
    const variantCode = `VAR-${Date.now()}`;

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
    vendorProduct.productId = product._id;
    vendorProduct.variantId = variant._id;
    vendorProduct.approvedAt = new Date();

    await vendorProduct.save();

    return NextResponse.json({
      success: true,
      data: { product, variant },
    });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

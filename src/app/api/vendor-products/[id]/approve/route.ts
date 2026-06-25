import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

function generateSKU(productCode: string, variantId: string) {
  return `SKU-${productCode}-${variantId}`;
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

    // 🔒 BLOCK if BOM missing or cost invalid
    if (
      !vendorProduct.calculatedCurrentCost ||
      vendorProduct.calculatedCurrentCost <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "BOM not completed. Please complete BOM before approval.",
        },
        { status: 400 }
      );
    }

    // 1. CREATE PRODUCT (DRAFT ONLY)
    const product = await Product.create({
      companyId: vendorProduct.businessId,

      productCode: `PRD-${Date.now()}`,

      productName: vendorProduct.productName,

      categoryId: vendorProduct.categoryId,
      brandId: vendorProduct.brandId,

      description: vendorProduct.description,
      images: vendorProduct.images,

      currentCost:
        vendorProduct.calculatedCurrentCost,
      safeCost:
        vendorProduct.calculatedSafeCost,
      worstCaseCost:
        vendorProduct.calculatedWorstCost,

      status: "DRAFT", // 🔒 IMPORTANT CHANGE
      active: false,
    });

    // 2. CREATE VARIANT (INTERNAL SKU)
    const variantId = new Date().getTime().toString();

    const variant = await ProductVariant.create({
      companyId: vendorProduct.businessId,

      productId: product._id,

      variantCode: `VAR-${Date.now()}`,

      variantName: vendorProduct.variantName,

      vendorSku: vendorProduct.vendorSku, // optional field if you want to add

      sku: generateSKU(
        product.productCode,
        variantId
      ),

      unit: vendorProduct.unit,
      packSize: vendorProduct.packSize,

      netWeight: vendorProduct.netWeight,
      grossWeight: vendorProduct.grossWeight,

      mrp: vendorProduct.mrp,
      sellingPrice:
        vendorProduct.suggestedSellingPrice,

      currentCost:
        vendorProduct.calculatedCurrentCost,

      status: "DRAFT",
      active: false,
    });

    // 3. UPDATE VENDOR PRODUCT
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

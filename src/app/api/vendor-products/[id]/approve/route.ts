import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

import VendorProduct from "@/models/VendorProduct";
import Product from "@/models/Product";
import ProductVariant from "@/models/ProductVariant";

export async function POST(
  req: Request,
  context: any
) {
  try {
    await connectDB();

    const body = await req.json();

    const vendorProduct =
      await VendorProduct.findById(
        context.params.id
      );

    if (!vendorProduct) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Vendor Product not found",
        },
        { status: 404 }
      );
    }

    // 1. Create PRODUCT
    const product = await Product.create({
      companyId:
        vendorProduct.businessId,

      productCode:
        "PRD-" +
        Date.now(),

      productName:
        vendorProduct.productName,

      categoryId:
        vendorProduct.categoryId,

      brandId:
        vendorProduct.brandId,

      description:
        vendorProduct.description,

      images:
        vendorProduct.images,

      currentCost:
        vendorProduct.calculatedCurrentCost,

      safeCost:
        vendorProduct.calculatedSafeCost,

      worstCaseCost:
        vendorProduct.calculatedWorstCost,

      status: "ACTIVE",
    });

    // 2. Create VARIANT
    const variant =
      await ProductVariant.create({
        companyId:
          vendorProduct.businessId,

        productId: product._id,

        variantCode:
          "VAR-" +
          Date.now(),

        variantName:
          vendorProduct.variantName,

        sku: vendorProduct.vendorSku,

        unit: vendorProduct.unit,

        packSize:
          vendorProduct.packSize,

        netWeight:
          vendorProduct.netWeight,

        grossWeight:
          vendorProduct.grossWeight,

        mrp: vendorProduct.mrp,

        sellingPrice:
          vendorProduct.suggestedSellingPrice,

        currentCost:
          vendorProduct.calculatedCurrentCost,

        status: "ACTIVE",
      });

    // 3. Update Vendor Product
    vendorProduct.approvalStatus =
      "APPROVED";

    vendorProduct.productId =
      product._id;

    vendorProduct.variantId =
      variant._id;

    vendorProduct.approvedAt =
      new Date();

    await vendorProduct.save();

    return NextResponse.json({
      success: true,
      data: {
        product,
        variant,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message,
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
// Required for .populate("vendorId") below -- see the identical fix/comment
// in api/admin/vendor-settlements/route.ts.
import "@/models/VendorProfile";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";
// Required for .populate(...) below -- model must be registered before populate can resolve it.
import "@/models/ProductCategory";
import "@/models/Brand";

export async function GET() {
  try {
    await connectDB();

    const products =
      await VendorProduct.find()
        .populate("vendorId")
        .populate("categoryId")
        .populate("brandId")
        .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: products,
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

export async function POST(req: Request) {
  try {
    const session = await getEnrichedSession();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    try {
      requirePermission(session as any, buildPermissionCode("vendor_products", "create"));
    } catch (err: any) {
      return NextResponse.json(
        { success: false, message: err.message },
        { status: err.code === "FORBIDDEN" ? 403 : 401 }
      );
    }

    await connectDB();

    const body = await req.json();

    const product =
      await VendorProduct.create(body);

    logAction({
      action: "CREATE",
      entity: "VendorProduct",
      entityId: product._id?.toString(),
      after: product,
      req,
      actor: { businessId: body.businessId },
    });

    return NextResponse.json({
      success: true,
      data: product,
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

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import VendorProfile from "@/models/VendorProfile";
import { logAction } from "@/lib/audit/logAction";
import { getEnrichedSession } from "@/lib/auth/session-enriched";
import { requirePermission } from "@/middleware/permission.guard";
import { buildPermissionCode } from "@/core/access/actions";

export async function POST(req: NextRequest) {
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

    const body = await req.json().catch(() => ({}));

    if (!body.businessId) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No active business context — please select a business before creating a product draft.",
        },
        { status: 400 }
      );
    }

    // Resolve which vendor this draft belongs to from the real session --
    // was never set at all before, despite VendorProduct.vendorId being a
    // real relation. A vendor-portal user (VendorProfile.userId === them)
    // gets their own vendor stamped; a super admin creating a product
    // directly (not via a vendor's own login) has no personal vendor, so
    // vendorId stays unset in that case rather than guessing at one.
    const vendorProfile = await VendorProfile.findOne({
      userId: session.user.id,
      businessId: body.businessId,
    }).lean();

    const draft = await VendorProduct.create({
      productName: "",
      variantName: "",
      description: "",

      vendorSku: "",
      vendorCost: 0,
      vendorShippingCost: 0,
      shippingCostType: "SEPARATE",
      minimumOrderQty: 1,
      leadTimeDays: 0,
      availableStock: 0,

      unit: "",
      packSize: 1,
      netWeight: 0,
      grossWeight: 0,
      hsnCode: "",
      gstRate: 0,

      status: "DRAFT",
      active: true,

      businessId: body.businessId,
      vendorId: (vendorProfile as any)?._id || undefined,
      createdBy: body.createdBy || session.user.id,
    });

    logAction({
      action: "SAVE_DRAFT",
      entity: "VendorProduct",
      entityId: draft._id?.toString(),
      after: draft,
      req,
      actor: { businessId: body.businessId, id: body.createdBy },
    });

    return NextResponse.json({
      success: true,
      id: draft._id.toString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      {
        status: 500,
      }
    );
  }
}

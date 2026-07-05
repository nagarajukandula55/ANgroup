import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";
import { logAction } from "@/lib/audit/logAction";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    await connectDB();

    const { id } = await params;

    const body = await request.json();

    const updated = await VendorProduct.findByIdAndUpdate(
      id,
      body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          message: "Vendor Product not found",
        },
        { status: 404 }
      );
    }

    logAction({
      action: "UPDATE",
      entity: "VendorProduct",
      entityId: id,
      after: updated,
      req: request,
      actor: { businessId: updated.businessId?.toString() },
    });

    return NextResponse.json({
      success: true,
      data: updated,
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

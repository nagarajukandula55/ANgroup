import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function PATCH(req, { params }) {
  await connectDB();

  const body = await req.json();

  const updated = await VendorProduct.findByIdAndUpdate(
    params.id,
    {
      $set: {
        vendorSku: body.vendorSku,
        vendorCost: body.vendorCost,
        vendorShippingCost: body.vendorShippingCost,
        shippingCostType: body.shippingCostType,
        minimumOrderQty: body.minimumOrderQty,
        leadTimeDays: body.leadTimeDays,
        availableStock: body.availableStock,
      },
    },
    { new: true }
  );

  return NextResponse.json(updated);
}

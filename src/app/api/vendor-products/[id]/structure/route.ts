import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import VendorProduct from "@/models/VendorProduct";

export async function PATCH(req, { params }) {
  await dbConnect();

  const body = await req.json();

  const updated = await VendorProduct.findByIdAndUpdate(
    params.id,
    {
      $set: {
        unit: body.unit,
        packSize: body.packSize,
        netWeight: body.netWeight,
        grossWeight: body.grossWeight,
        hsnCode: body.hsnCode,
        gstRate: body.gstRate,
      },
    },
    { new: true }
  );

  return NextResponse.json(updated);
}

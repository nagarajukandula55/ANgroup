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
        productName: body.productName,
        variantName: body.variantName,
        description: body.description,
      },
    },
    { new: true }
  );

  return NextResponse.json(updated);
}

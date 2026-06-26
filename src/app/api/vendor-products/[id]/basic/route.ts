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
        productName: body.productName,
        variantName: body.variantName,
        description: body.description,
      },
    },
    { new: true }
  );

  return NextResponse.json(updated);
}

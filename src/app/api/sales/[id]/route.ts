import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { getInvoiceById } from "@/services/sales.service";

export async function GET(_: Request, { params }: any) {
  await dbConnect();

  const data = await getInvoiceById(params.id);

  return NextResponse.json({
    success: true,
    data,
  });
}

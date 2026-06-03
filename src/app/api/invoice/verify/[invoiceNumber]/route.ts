import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: any
) {
  return NextResponse.json({
    success: true,
    invoiceNumber: params.invoiceNumber,
    verified: true,
    message: "Invoice verified"
  });
}

import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

/**
 * FIXED NEXT.JS 15+ TYPE SAFE ROUTE
 */
export async function GET(
  req: Request,
  context: any
) {
  try {
    const invoiceNumber =
      context?.params?.invoiceNumber;

    if (!invoiceNumber) {
      return NextResponse.json(
        { success: false, message: "Missing invoiceNumber" },
        { status: 400 }
      );
    }

    const publicId = `an-group/invoices/invoice_${invoiceNumber}`;

    const url = cloudinary.url(publicId, {
      resource_type: "raw",
      type: "upload",
      secure: true,
    });

    return NextResponse.redirect(url);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Invoice fetch failed",
      },
      { status: 500 }
    );
  }
}

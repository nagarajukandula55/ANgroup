export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import fs from "fs";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const invoiceId = params.id;

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, message: "Invoice ID required" },
        { status: 400 }
      );
    }

    /* ================= FETCH INVOICE ================= */
    const invoice = await Invoice.findById(invoiceId);

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    if (!invoice.pdfUrl) {
      return NextResponse.json(
        { success: false, message: "PDF not generated yet" },
        { status: 404 }
      );
    }

    /* ================= BUILD FILE PATH ================= */
    const filePath = process.cwd() + "/public" + invoice.pdfUrl;

    /* ================= VALIDATE FILE ================= */
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "File missing on server" },
        { status: 404 }
      );
    }

    /* ================= STREAM FILE ================= */
    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

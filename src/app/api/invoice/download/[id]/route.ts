export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";
import fs from "fs";

type Params = {
  params: {
    id: string;
  };
};

export async function GET(req: Request, context: Params) {
  try {
    await connectDB();

    const id = context.params.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invoice ID missing" },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findById(id);

    if (!invoice || !invoice.pdfUrl) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    const filePath =
      process.cwd() + "/public" + invoice.pdfUrl;

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "PDF missing on server" },
        { status: 404 }
      );
    }

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

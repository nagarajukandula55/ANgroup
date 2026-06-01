import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const fileName = `invoice_${params.id}.pdf`;

    const filePath = path.join(
      process.env.NODE_ENV === "production"
        ? path.join(os.tmpdir(), "invoices")
        : path.join(process.cwd(), "public", "invoices"),
      fileName
    );

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: 500 }
    );
  }
}

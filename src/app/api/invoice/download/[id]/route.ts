import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

export async function GET(
  req: Request,
  context: any
) {
  try {
    const id = context?.params?.id;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Missing invoice id" },
        { status: 400 }
      );
    }

    const fileName = `invoice_${id}.pdf`;

    const basePath =
      process.env.NODE_ENV === "production"
        ? path.join(os.tmpdir(), "invoices")
        : path.join(process.cwd(), "public", "invoices");

    const filePath = path.join(basePath, fileName);

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

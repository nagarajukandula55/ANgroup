export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Invoice from "@/models/Invoice";

/**
 * GET /api/invoice/[invoiceNumber]
 * Returns HTML invoice (for preview + print)
 */

export async function GET(
  req: Request,
  { params }: { params: { invoiceNumber: string } }
) {
  try {
    await connectDB();

    const invoiceNumber = params.invoiceNumber;

    if (!invoiceNumber) {
      return NextResponse.json(
        { success: false, message: "Missing invoice number" },
        { status: 400 }
      );
    }

    const invoice = await Invoice.findOne({ invoiceNumber });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found" },
        { status: 404 }
      );
    }

    // SIMPLE HTML VIEW (PRINTABLE)
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: Arial; padding: 30px; }
    .box { border: 1px solid #ddd; padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #f5f5f5; }
    .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>
<body>

  <h2>Invoice: ${invoice.invoiceNumber}</h2>

  <div class="box">
    <p><b>Customer:</b> ${invoice.customer?.name || ""}</p>
    <p><b>Phone:</b> ${invoice.customer?.phone || ""}</p>
    <p><b>State:</b> ${invoice.customer?.state || ""}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th>Qty</th>
        <th>Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${(invoice.items || [])
        .map(
          (i: any) => `
        <tr>
          <td>${i.name}</td>
          <td>${i.qty}</td>
          <td>${i.price}</td>
          <td>${i.total}</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="total">
    Grand Total: ₹${invoice.grandTotal}
  </div>

</body>
</html>
`;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (err: any) {
    console.error("INVOICE FETCH ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Server error" },
      { status: 500 }
    );
  }
}

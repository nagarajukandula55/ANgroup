import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";

export async function generateInvoicePDF(
  template: any
) {
  const pdfDoc = await PDFDocument.create();

  const page = pdfDoc.addPage([600, 800]);

  const font = await pdfDoc.embedFont(
    StandardFonts.Helvetica
  );

  let y = 750;

  /* ================= HEADER ================= */
  page.drawText("INVOICE", {
    x: 250,
    y,
    size: 20,
    font,
    color: rgb(0, 0, 0),
  });

  y -= 40;

  page.drawText(
    `Invoice No: ${template.invoiceNumber}`,
    { x: 50, y, size: 10, font }
  );

  y -= 20;

  page.drawText(
    `Order ID: ${template.orderId}`,
    { x: 50, y, size: 10, font }
  );

  y -= 30;

  /* ================= CUSTOMER ================= */
  page.drawText("BILL TO:", {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 20;

  page.drawText(
    `${template.customer.name} - ${template.customer.phone}`,
    { x: 50, y, size: 10, font }
  );

  y -= 30;

  /* ================= ITEMS ================= */
  page.drawText("ITEMS:", {
    x: 50,
    y,
    size: 12,
    font,
  });

  y -= 20;

  template.items.forEach((item: any) => {
    page.drawText(
      `${item.name} | HSN: ${item.hsn} | Qty: ${item.qty} | ₹${item.total}`,
      { x: 50, y, size: 9, font }
    );

    y -= 15;
  });

  y -= 20;

  /* ================= TOTAL ================= */
  page.drawText(
    `TOTAL: ₹${template.totals.grandTotal}`,
    {
      x: 50,
      y,
      size: 14,
      font,
    }
  );

  const pdfBytes = await pdfDoc.save();

  const fileName = `invoice-${template.invoiceNumber}.pdf`;

  const filePath = path.join(
    process.cwd(),
    "public/invoices",
    fileName
  );

  fs.writeFileSync(filePath, pdfBytes);

  return {
    url: `/invoices/${fileName}`,
  };
}

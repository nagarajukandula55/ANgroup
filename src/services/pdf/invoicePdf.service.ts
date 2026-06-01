import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateInvoicePDF(
  template: any
): Promise<{ url: string; path: string }> {
  return new Promise((resolve, reject) => {
    try {
      if (!template?.invoiceNumber) {
        throw new Error("Missing invoice number");
      }

      const fileName = `invoice_${template.invoiceNumber}.pdf`;

      const dir = path.join(process.cwd(), "public", "invoices");
      const filePath = path.join(dir, fileName);

      fs.mkdirSync(dir, { recursive: true });

      const doc = new PDFDocument({
        margin: 40,
        size: "A4",
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      /* ================= HEADER ================= */
      doc
        .fontSize(18)
        .text(template.business?.name || "AN Group", {
          align: "center",
        });

      doc.moveDown();

      doc.fontSize(10);
      doc.text(`Invoice No: ${template.invoiceNumber}`);
      doc.text(`Order ID: ${template.orderId}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);

      doc.moveDown();

      /* ================= CUSTOMER ================= */
      doc.fontSize(12).text("BILL TO");
      doc.fontSize(10);

      doc.text(template.customer?.name || "N/A");
      doc.text(template.customer?.address || "N/A");
      doc.text(template.customer?.phone || "N/A");

      doc.moveDown();

      /* ================= ITEMS ================= */
      doc.fontSize(12).text("ITEMS");
      doc.fontSize(10);

      const items = Array.isArray(template?.items)
        ? template.items
        : [];

      items.forEach((item: any) => {
        doc.text(
          `${item.name || "Item"} | Qty: ${
            item.qty || 0
          } | ₹${item.price || 0} | GST: ${
            item.gstPercent || 0
          }% | Total: ₹${item.total || 0}`
        );
      });

      doc.moveDown();

      /* ================= SUMMARY ================= */
      doc.fontSize(12).text("SUMMARY");
      doc.fontSize(10);

      const totals = template?.totals || {};

      doc.text(`Subtotal: ₹${totals.subtotal || 0}`);
      doc.text(`CGST: ₹${totals.cgst || 0}`);
      doc.text(`SGST: ₹${totals.sgst || 0}`);
      doc.text(`IGST: ₹${totals.igst || 0}`);

      doc.moveDown();

      doc
        .fontSize(14)
        .text(`GRAND TOTAL: ₹${totals.grandTotal || 0}`);

      doc.end();

      stream.on("finish", () => {
        resolve({
          url: `/invoices/${fileName}`,
          path: filePath,
        });
      });

      stream.on("error", (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
}

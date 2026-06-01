import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import os from "os";

export async function generateInvoicePDF(template: any) {
  return new Promise((resolve, reject) => {
    try {
      if (!template?.invoiceNumber) {
        throw new Error("Missing invoice number");
      }

      const fileName = `invoice_${template.invoiceNumber}.pdf`;

      /* ================= SAFE PATH (Vercel + Local) ================= */
      const isProd = process.env.NODE_ENV === "production";

      const baseDir = isProd
        ? path.join(os.tmpdir(), "invoices") // Vercel-safe
        : path.join(process.cwd(), "public", "invoices"); // local dev

      const filePath = path.join(baseDir, fileName);

      fs.mkdirSync(baseDir, { recursive: true });

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
      doc.text(template.customer?.name || "");
      doc.text(template.customer?.address || "");
      doc.text(template.customer?.phone || "");

      doc.moveDown();

      /* ================= ITEMS ================= */
      doc.fontSize(12).text("ITEMS");

      template.items?.forEach((item: any) => {
        doc
          .fontSize(10)
          .text(
            `${item.name} | Qty: ${item.qty} | ₹${item.price} | GST: ${item.gstPercent}% | Total: ₹${item.total}`
          );
      });

      doc.moveDown();

      /* ================= SUMMARY ================= */
      doc.fontSize(12).text("SUMMARY");

      doc.fontSize(10);
      doc.text(`Subtotal: ₹${template.totals?.subtotal || 0}`);
      doc.text(`CGST: ₹${template.totals?.cgst || 0}`);
      doc.text(`SGST: ₹${template.totals?.sgst || 0}`);
      doc.text(`IGST: ₹${template.totals?.igst || 0}`);

      doc.moveDown();

      doc.fontSize(14).text(
        `GRAND TOTAL: ₹${template.totals?.grandTotal || 0}`
      );

      doc.end();

      stream.on("finish", () => {
        resolve({
          url: `/invoices/${fileName}`, // for local dev
          path: filePath,
        });
      });

      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

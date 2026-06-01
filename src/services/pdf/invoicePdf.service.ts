import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export async function generateInvoicePDF(template: any) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `invoice_${template.invoiceNumber}.pdf`;
      const filePath = path.join(process.cwd(), "public/invoices", fileName);

      const doc = new PDFDocument({ margin: 40 });

      fs.mkdirSync(path.dirname(filePath), { recursive: true });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      /* ================= HEADER ================= */
      doc
        .fontSize(20)
        .text(template.business.name || "AN Group", { align: "center" });

      doc.moveDown();
      doc
        .fontSize(12)
        .text(`Invoice No: ${template.invoiceNumber}`)
        .text(`Date: ${new Date().toLocaleDateString()}`)
        .text(`Invoice Type: ${template.invoiceType}`);

      doc.moveDown();

      /* ================= CUSTOMER ================= */
      doc.fontSize(14).text("Bill To:");
      doc.fontSize(10).text(template.customer.name);
      doc.text(template.customer.address);
      doc.text(`${template.customer.city}, ${template.customer.state}`);
      doc.text(template.customer.phone);

      if (template.customer.gstNumber) {
        doc.text(`GSTIN: ${template.customer.gstNumber}`);
      }

      doc.moveDown();

      /* ================= TABLE HEADER ================= */
      doc
        .fontSize(10)
        .text("Item", 40, doc.y)
        .text("Qty", 200, doc.y)
        .text("Price", 260, doc.y)
        .text("GST%", 330, doc.y)
        .text("Total", 400, doc.y);

      doc.moveDown();

      /* ================= ITEMS ================= */
      template.items.forEach((item: any) => {
        doc
          .text(item.name, 40)
          .text(item.qty.toString(), 200)
          .text(item.price.toFixed(2), 260)
          .text(item.gstPercent + "%", 330)
          .text(item.total.toFixed(2), 400);

        doc.moveDown(0.5);
      });

      doc.moveDown();

      /* ================= GST SUMMARY ================= */
      doc.fontSize(12).text("GST Summary");

      doc
        .fontSize(10)
        .text(`Taxable Amount: ${template.taxableAmount}`)
        .text(`CGST: ${template.cgst}`)
        .text(`SGST: ${template.sgst}`)
        .text(`IGST: ${template.igst}`)
        .text(`Total GST: ${template.totalGST}`);

      doc.moveDown();

      /* ================= TOTAL ================= */
      doc
        .fontSize(14)
        .text(`GRAND TOTAL: ₹${template.grandTotal}`, {
          underline: true,
        });

      doc.moveDown();

      /* ================= FOOTER ================= */
      doc
        .fontSize(10)
        .text("Thank you for your business!", {
          align: "center",
        });

      doc.end();

      stream.on("finish", () => {
        resolve({
          url: `/invoices/${fileName}`,
          path: filePath,
        });
      });

      stream.on("error", reject);
    } catch (err) {
      reject(err);
    }
  });
}

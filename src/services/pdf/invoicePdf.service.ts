import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

type PDFResult = {
  url: string;
  path: string;
};

export async function generateInvoicePDF(template: any): Promise<PDFResult> {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `invoice_${template.invoiceNumber}.pdf`;
      const dirPath = path.join(process.cwd(), "public/invoices");
      const filePath = path.join(dirPath, fileName);

      /* ================= ENSURE DIRECTORY ================= */
      fs.mkdirSync(dirPath, { recursive: true });

      const doc = new PDFDocument({ margin: 40 });
      const stream = fs.createWriteStream(filePath);

      doc.pipe(stream);

      /* ================= HEADER ================= */
      doc
        .fontSize(20)
        .text(template.business?.name || "AN Group", {
          align: "center",
        });

      doc.moveDown();

      doc
        .fontSize(12)
        .text(`Invoice No: ${template.invoiceNumber}`)
        .text(`Date: ${new Date().toLocaleDateString()}`)
        .text(`Invoice Type: ${template.invoiceType || "TAX"}`);

      doc.moveDown();

      /* ================= CUSTOMER ================= */
      doc.fontSize(14).text("Bill To:");

      doc.fontSize(10);
      doc.text(template.customer?.name || "-");
      doc.text(template.customer?.address || "-");
      doc.text(
        `${template.customer?.city || ""}, ${template.customer?.state || ""}`
      );
      doc.text(template.customer?.phone || "-");

      if (template.customer?.gstNumber) {
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
        .text("Total", 420, doc.y);

      doc.moveDown();

      /* ================= ITEMS ================= */
      (template.items || []).forEach((item: any) => {
        doc
          .text(item.name || "-", 40)
          .text(String(item.qty || 0), 200)
          .text(Number(item.price || 0).toFixed(2), 260)
          .text(`${item.gstPercent || 0}%`, 330)
          .text(Number(item.total || 0).toFixed(2), 420);

        doc.moveDown(0.5);
      });

      doc.moveDown();

      /* ================= GST SUMMARY ================= */
      doc.fontSize(12).text("GST Summary");

      doc.fontSize(10);
      doc.text(`Taxable Amount: ${template.taxableAmount || 0}`);
      doc.text(`CGST: ${template.cgst || 0}`);
      doc.text(`SGST: ${template.sgst || 0}`);
      doc.text(`IGST: ${template.igst || 0}`);

      const totalGST =
        (template.cgst || 0) +
        (template.sgst || 0) +
        (template.igst || 0);

      doc.text(`Total GST: ${totalGST}`);

      doc.moveDown();

      /* ================= GRAND TOTAL ================= */
      doc.fontSize(14).text(
        `GRAND TOTAL: ₹${Number(template.grandTotal || 0).toFixed(2)}`,
        {
          underline: true,
        }
      );

      doc.moveDown();

      /* ================= FOOTER ================= */
      doc.fontSize(10).text("Thank you for your business!", {
        align: "center",
      });

      doc.end();

      /* ================= STREAM HANDLING ================= */
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

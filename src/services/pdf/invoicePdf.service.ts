import PDFDocument from "pdfkit";

export async function generateInvoicePDF(template: any) {
  return new Promise((resolve, reject) => {
    try {
      if (!template?.invoiceNumber) {
        throw new Error("Missing invoice number");
      }

      const doc = new PDFDocument({
        size: "A4",
        margin: 40,
      });

      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("error", reject);

      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);

        const base64 = pdfBuffer.toString("base64");

        resolve({
          url: `data:application/pdf;base64,${base64}`,
          buffer: pdfBuffer,
        });
      });

      /* ================= HEADER ================= */
      doc.fontSize(18).text(template.business?.name || "AN Group", {
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

      (template.items || []).forEach((item: any) => {
        doc.fontSize(10).text(
          `${item.name} | Qty: ${item.qty} | ₹${item.price} | GST: ${item.gstPercent}% | Total: ₹${item.total}`
        );
      });

      doc.moveDown();

      /* ================= TOTAL ================= */
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
    } catch (err) {
      reject(err);
    }
  });
}

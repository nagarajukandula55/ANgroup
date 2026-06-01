import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function generateInvoicePDF(template: any) {
  try {
    const fileName = `invoice_${template.invoiceNumber}.pdf`;

    const dir = path.join(process.cwd(), "public", "invoices");
    const filePath = path.join(dir, fileName);

    fs.mkdirSync(dir, { recursive: true });

    const html = buildHTML(template);

    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        bottom: "20px",
        left: "20px",
        right: "20px",
      },
    });

    await browser.close();

    return {
      url: `/invoices/${fileName}`,
      filePath,
    };
  } catch (err: any) {
    console.error("PDF GENERATION ERROR:", err);
    throw new Error(err?.message || "PDF generation failed");
  }
}

/* ================= HTML TEMPLATE ================= */
function buildHTML(t: any) {
  const items = t.items || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice</title>
  <style>
    body { font-family: Arial; padding: 30px; color: #111; }
    h2 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
    th { background: #f4f4f4; }
    .total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: right; }
  </style>
</head>

<body>

  <h2>${t.business?.name || "AN Group"}</h2>

  <p><b>Invoice:</b> ${t.invoiceNumber}</p>
  <p><b>Order:</b> ${t.orderId}</p>

  <h3>Customer</h3>
  <p>${t.customer?.name || ""}</p>
  <p>${t.customer?.address || ""}</p>
  <p>${t.customer?.phone || ""}</p>

  <h3>Items</h3>

  <table>
    <tr>
      <th>Item</th>
      <th>Qty</th>
      <th>Price</th>
      <th>Total</th>
    </tr>

    ${items
      .map(
        (i: any) => `
      <tr>
        <td>${i.name || ""}</td>
        <td>${i.qty || 0}</td>
        <td>₹${i.price || 0}</td>
        <td>₹${i.total || 0}</td>
      </tr>
    `
      )
      .join("")}
  </table>

  <div class="total">
    GRAND TOTAL: ₹${t.totals?.grandTotal || 0}
  </div>

</body>
</html>
  `;
}

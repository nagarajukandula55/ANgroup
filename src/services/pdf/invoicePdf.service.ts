import path from "path";
import fs from "fs";
import { chromium } from "playwright";

export async function generateInvoicePDF(template: any) {
  const fileName = `invoice_${template.invoiceNumber}.pdf`;
  const dir = path.join(process.cwd(), "public", "invoices");
  const filePath = path.join(dir, fileName);

  fs.mkdirSync(dir, { recursive: true });

  const html = buildHTML(template);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.setContent(html, { waitUntil: "networkidle" });

  await page.pdf({
    path: filePath,
    format: "A4",
    printBackground: true,
  });

  await browser.close();

  return {
    url: `/invoices/${fileName}`,
    path: filePath,
  };
}

/* ================= HTML TEMPLATE ================= */
function buildHTML(t: any) {
  return `
  <html>
  <head>
    <style>
      body { font-family: Arial; padding: 30px; }
      h1 { text-align: center; }
      .box { margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; }
      th { background: #f4f4f4; }
      .total { font-size: 18px; font-weight: bold; }
    </style>
  </head>

  <body>
    <h1>${t.business?.name || "AN Group"}</h1>

    <div class="box">
      <p><b>Invoice:</b> ${t.invoiceNumber}</p>
      <p><b>Order ID:</b> ${t.orderId}</p>
      <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>
    </div>

    <div class="box">
      <h3>Customer</h3>
      <p>${t.customer?.name}</p>
      <p>${t.customer?.address}</p>
      <p>${t.customer?.phone}</p>
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
        ${t.items
          .map(
            (i: any) => `
          <tr>
            <td>${i.name}</td>
            <td>${i.qty}</td>
            <td>₹${i.price}</td>
            <td>₹${i.total}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <p class="total">Grand Total: ₹${t.totals?.grandTotal}</p>
  </body>
  </html>
  `;
}

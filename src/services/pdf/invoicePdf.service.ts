import fs from "fs";
import path from "path";
import chromium from "@sparticuz/chromium";
import { chromium as pwChromium } from "playwright-core";

export async function generateInvoicePDF(template: any) {
  try {
    const fileName = `invoice_${template.invoiceNumber}.pdf`;

    const dir = path.join(process.cwd(), "public", "invoices");
    const filePath = path.join(dir, fileName);

    fs.mkdirSync(dir, { recursive: true });

    const html = buildHTML(template);

    const browser = await pwChromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle",
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
    throw new Error("PDF generation failed");
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
    body {
      font-family: Arial, sans-serif;
      padding: 30px;
      color: #111;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
    }

    .box {
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      font-size: 12px;
    }

    th {
      background: #f4f4f4;
      text-align: left;
    }

    .total {
      margin-top: 20px;
      font-size: 18px;
      font-weight: bold;
      text-align: right;
    }

    .muted {
      color: #666;
      font-size: 12px;
    }
  </style>
</head>

<body>

  <div class="header">
    <h2>${t.business?.name || "AN Group"}</h2>
    <div class="muted">GST Invoice</div>
  </div>

  <div class="box">
    <p><b>Invoice No:</b> ${t.invoiceNumber}</p>
    <p><b>Order ID:</b> ${t.orderId}</p>
    <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="box">
    <h3>Customer Details</h3>
    <p>${t.customer?.name || ""}</p>
    <p>${t.customer?.address || ""}</p>
    <p>${t.customer?.phone || ""}</p>
  </div>

  <div class="box">
    <h3>Items</h3>

    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>GST%</th>
          <th>Total</th>
        </tr>
      </thead>

      <tbody>
        ${items
          .map(
            (i: any) => `
          <tr>
            <td>${i.name || ""}</td>
            <td>${i.qty || 0}</td>
            <td>₹${i.price || 0}</td>
            <td>${i.gstPercent || 0}%</td>
            <td>₹${i.total || 0}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="total">
    GRAND TOTAL: ₹${t.totals?.grandTotal || 0}
  </div>

</body>
</html>
  `;
}

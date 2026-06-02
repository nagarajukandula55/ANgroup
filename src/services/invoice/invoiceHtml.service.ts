import fs from "fs";
import path from "path";

export async function generateInvoiceHTML(template: any) {
  const fileName = `invoice_${template.invoiceNumber}.html`;

  const dir = path.join(process.cwd(), "public", "invoices");
  const filePath = path.join(dir, fileName);

  fs.mkdirSync(dir, { recursive: true });

  const html = buildHTML(template);

  fs.writeFileSync(filePath, html, "utf-8");

  return {
    url: `/invoices/${fileName}`,
    filePath,
  };
}

/* ================= HTML TEMPLATE ================= */
function buildHTML(t: any) {
  const items = t.items || [];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
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
      font-size: 13px;
    }

    th {
      background: #f5f5f5;
    }

    .total {
      text-align: right;
      font-size: 18px;
      font-weight: bold;
      margin-top: 20px;
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
    <div class="muted">GST INVOICE</div>
  </div>

  <div class="box">
    <p><b>Invoice No:</b> ${t.invoiceNumber}</p>
    <p><b>Order ID:</b> ${t.orderId}</p>
    <p><b>Date:</b> ${new Date().toLocaleDateString()}</p>
  </div>

  <div class="box">
    <h3>Customer</h3>
    <p>${t.customer?.name || ""}</p>
    <p>${t.customer?.address || ""}</p>
    <p>${t.customer?.phone || ""}</p>
  </div>

  <h3>Items</h3>

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
    </tbody>
  </table>

  <div class="total">
    GRAND TOTAL: ₹${t.totals?.grandTotal || 0}
  </div>

</body>
</html>
  `;
}

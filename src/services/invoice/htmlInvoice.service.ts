export function generateInvoiceHTML(template: any) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Invoice ${template.invoiceNumber}</title>
  <style>
    body { font-family: Arial; padding: 30px; color: #111; }
    .header { text-align: center; }
    .box { margin-top: 20px; padding: 15px; border: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
  </style>
</head>

<body>

  <div class="header">
    <h2>${template.business?.name || "AN GROUP"}</h2>
    <p>Invoice #: ${template.invoiceNumber}</p>
    <p>Order ID: ${template.orderId}</p>
  </div>

  <div class="box">
    <h3>Customer</h3>
    <p>${template.customer?.name}</p>
    <p>${template.customer?.address}</p>
    <p>${template.customer?.phone}</p>
    <p>${template.customer?.email}</p>
  </div>

  <h3>Items</h3>

  <table>
    <tr>
      <th>Name</th>
      <th>Qty</th>
      <th>Price</th>
      <th>GST%</th>
      <th>Total</th>
    </tr>

    ${template.items
      .map(
        (i: any) => `
      <tr>
        <td>${i.name}</td>
        <td>${i.qty}</td>
        <td>${i.price}</td>
        <td>${i.gstPercent}</td>
        <td>${i.total}</td>
      </tr>
    `
      )
      .join("")}
  </table>

  <div class="box">
    <p>Subtotal: ₹${template.totals.subtotal}</p>
    <p>CGST: ₹${template.totals.cgst}</p>
    <p>SGST: ₹${template.totals.sgst}</p>
    <p>IGST: ₹${template.totals.igst}</p>
    <p class="total">Grand Total: ₹${template.totals.grandTotal}</p>
  </div>

  <p style="text-align:center;margin-top:40px;">
    Thank you for your purchase!
  </p>

</body>
</html>
  `;
}

export function generateInvoiceHTML(data: any) {
  const inv = data;

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>GST Invoice ${inv.invoiceNumber}</title>

<style>
  body { font-family: Arial; padding: 30px; color: #111; }

  .header {
    display: flex;
    justify-content: space-between;
    border-bottom: 2px solid #000;
    padding-bottom: 15px;
  }

  .title {
    font-size: 22px;
    font-weight: bold;
  }

  .section {
    margin-top: 20px;
    border: 1px solid #ddd;
    padding: 15px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
  }

  th, td {
    border: 1px solid #ccc;
    padding: 8px;
    font-size: 12px;
  }

  th {
    background: #f5f5f5;
  }

  .right {
    text-align: right;
  }

  .totals {
    margin-top: 20px;
    float: right;
    width: 300px;
    border: 1px solid #000;
    padding: 10px;
  }

  .footer {
    margin-top: 40px;
    font-size: 11px;
    text-align: center;
    border-top: 1px solid #ddd;
    padding-top: 10px;
  }

  .bold {
    font-weight: bold;
  }
</style>
</head>

<body>

<!-- HEADER -->
<div class="header">
  <div>
    <div class="title">${inv.business?.name || "BUSINESS NAME"}</div>
    <div>${inv.business?.address || ""}</div>
    <div>GSTIN: ${inv.business?.gstin || "N/A"}</div>
  </div>

  <div class="right">
    <div><b>INVOICE</b></div>
    <div>No: ${inv.invoiceNumber}</div>
    <div>Date: ${new Date().toLocaleDateString()}</div>
    <div>FY: ${inv.financialYear}</div>
  </div>
</div>

<!-- BUYER -->
<div class="section">
  <b>Bill To:</b><br/>
  ${inv.customer.name}<br/>
  ${inv.customer.address}<br/>
  GSTIN: ${inv.customer.gstNumber || "N/A"}
</div>

<!-- ITEMS -->
<table>
  <thead>
    <tr>
      <th>#</th>
      <th>Item</th>
      <th>HSN</th>
      <th>Qty</th>
      <th>Rate</th>
      <th>Taxable</th>
      <th>GST</th>
      <th>Total</th>
    </tr>
  </thead>

  <tbody>
    ${inv.items.map((i: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${i.name}</td>
        <td>${i.hsn || "-"}</td>
        <td>${i.qty}</td>
        <td>${i.price}</td>
        <td>${i.taxableValue}</td>
        <td>${(i.cgst + i.sgst + i.igst).toFixed(2)}</td>
        <td>${i.total.toFixed(2)}</td>
      </tr>
    `).join("")}
  </tbody>
</table>

<!-- TOTALS -->
<div class="totals">
  <div>Subtotal: ₹${inv.subtotal}</div>
  <div>CGST: ₹${inv.cgst}</div>
  <div>SGST: ₹${inv.sgst}</div>
  <div>IGST: ₹${inv.igst}</div>
  <hr/>
  <div class="bold">Grand Total: ₹${inv.grandTotal}</div>
</div>

<div style="clear: both;"></div>

<!-- GST FOOTER -->
<div class="footer">
  This is a computer generated GST compliant invoice.<br/>
  Goods once sold will not be taken back or exchanged.<br/>
  Subject to jurisdiction only.
</div>

</body>
</html>
  `;
}

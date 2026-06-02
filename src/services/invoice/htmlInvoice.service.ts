export function generateInvoiceHTML(inv: any) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>GST Invoice ${inv.invoiceNumber}</title>

<style>
body {
  font-family: Arial;
  padding: 30px;
  color: #111;
}

.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 15px;
}

.box {
  margin-top: 15px;
  padding: 10px;
  border: 1px solid #ddd;
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
  background: #f4f4f4;
}

.totals {
  margin-top: 20px;
  width: 300px;
  float: right;
  border: 2px solid #000;
  padding: 10px;
}

.footer {
  margin-top: 80px;
  font-size: 11px;
  text-align: center;
  border-top: 1px solid #ddd;
  padding-top: 10px;
}
</style>

</head>

<body>

<!-- HEADER -->
<div class="header">
  <div>
    <h2>${inv.business?.name || "BUSINESS NAME"}</h2>
    <div>${inv.business?.address || ""}</div>
    <div>GSTIN: ${inv.business?.gstin || "N/A"}</div>
  </div>

  <div>
    <h3>INVOICE</h3>
    <div><b>${inv.invoiceNumber}</b></div>
    <div>FY: ${inv.financialYear}</div>
  </div>
</div>

<!-- CUSTOMER -->
<div class="box">
  <b>BILL TO:</b><br/>
  ${inv.customer?.name}<br/>
  ${inv.customer?.address}<br/>
  GSTIN: ${inv.customer?.gstNumber || "N/A"}
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
  <b>Grand Total: ₹${inv.grandTotal}</b>
</div>

<div style="clear: both;"></div>

<!-- FOOTER -->
<div class="footer">
  This is a computer generated GST compliant invoice.<br/>
  No signature required.<br/>
  Subject to jurisdiction.
</div>

</body>
</html>
  `;
}

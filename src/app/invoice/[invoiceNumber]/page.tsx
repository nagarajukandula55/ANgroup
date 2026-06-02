"use client";

import { useEffect, useState } from "react";

export default function InvoicePage({ params }: any) {
  const { invoiceNumber } = params;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invoice/view/${invoiceNumber}`)
      .then((res) => res.json())
      .then((res) => setData(res));
  }, [invoiceNumber]);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="page">
      <style>{printCSS}</style>

      {/* HEADER */}
      <div className="header">
        <div>
          <h2>AN GROUP</h2>
          <div>GSTIN: 29ABCDE1234F1Z5</div>
          <div>Karnataka, India</div>
        </div>

        <div className="right">
          <h3>TAX INVOICE</h3>
          <div>Invoice: {data.invoiceNumber}</div>
          <div>Date: {new Date(data.createdAt).toLocaleDateString()}</div>
        </div>
      </div>

      {/* PARTIES */}
      <div className="grid2">
        <div className="box">
          <h4>Bill To</h4>
          <div>{data.customer?.name}</div>
          <div>{data.customer?.phone}</div>
          <div>{data.customer?.address}</div>
          <div>GST: {data.customer?.gstNumber || "N/A"}</div>
        </div>

        <div className="box">
          <h4>Seller</h4>
          <div>AN Group</div>
          <div>Karnataka, India</div>
          <div>GSTIN: 29ABCDE1234F1Z5</div>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>GST%</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {data.items?.map((item: any, i: number) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{item.name}</td>
              <td>{item.qty}</td>
              <td>{item.price}</td>
              <td>{item.gstPercent || 0}%</td>
              <td>{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTAL SECTION */}
      <div className="totalBox">
        <div>Subtotal: ₹{data.subtotal}</div>
        <div>CGST: ₹{data.cgst}</div>
        <div>SGST: ₹{data.sgst}</div>
        <div className="grand">Grand Total: ₹{data.grandTotal}</div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        This is a computer generated GST invoice. No signature required.
      </div>

      {/* PRINT BUTTON */}
      <button onClick={() => window.print()} className="printBtn">
        Print / Save PDF
      </button>
    </div>
  );
}

const printCSS = `
@page {
  size: A4;
  margin: 15mm;
}

body {
  margin: 0;
  font-family: Arial;
  color: #000;
}

.page {
  max-width: 800px;
  margin: auto;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 10px;
}

.right {
  text-align: right;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 15px;
}

.box {
  border: 1px solid #000;
  padding: 10px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.table th, .table td {
  border: 1px solid #000;
  padding: 8px;
  font-size: 12px;
}

.table th {
  background: #f0f0f0;
}

.totalBox {
  margin-top: 15px;
  text-align: right;
  border: 1px solid #000;
  padding: 10px;
}

.grand {
  font-size: 16px;
  font-weight: bold;
}

.footer {
  margin-top: 20px;
  font-size: 12px;
  text-align: center;
}

.printBtn {
  margin-top: 20px;
  padding: 10px 15px;
  background: black;
  color: white;
  border: none;
  cursor: pointer;
}

@media print {
  .printBtn {
    display: none;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;

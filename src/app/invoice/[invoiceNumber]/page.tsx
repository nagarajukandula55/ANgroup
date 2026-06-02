"use client";

import { useEffect, useState } from "react";

export default function InvoicePage({ params }: any) {
  const { invoiceNumber } = params;
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invoice/view/${invoiceNumber}`)
      .then((r) => r.json())
      .then(setData);
  }, [invoiceNumber]);

  if (!data) return <div>Loading...</div>;

  const isB2B = data.type === "B2B";

  return (
    <div className="page">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="header">
        <div>
          <div className="title">INVOICE</div>

          <div className="company">
            <b>{data.company.name}</b><br />
            {data.company.tagline}<br />
            {data.company.address1}<br />
            {data.company.address2}<br />
            {data.company.city}, {data.company.state}<br />
            GSTIN: {data.company.gstin}<br />
            Phone: {data.company.phone}<br />
            Email: {data.company.email}
          </div>
        </div>

        <div className="invoiceBox">
          <div>Invoice No: {data.invoiceNumber}</div>
          <div>Date: {data.invoiceDate}</div>
          <div>Order ID: {data.orderId}</div>
        </div>
      </div>

      {/* CUSTOMER + SHIPPING + PAYMENT */}
      <div className="grid3">

        <div className="box">
          <h4>BILL TO</h4>
          <div>{data.customer.name}</div>
          <div>{data.customer.phone}</div>
          <div>{data.customer.address}</div>
          <div>{data.customer.city}, {data.customer.state}</div>
          <div>{data.customer.pincode}</div>

          {isB2B && (
            <div>
              GSTIN: {data.customer.gstin}<br />
              State: {data.customer.state}
            </div>
          )}
        </div>

        <div className="box">
          <h4>SHIP TO</h4>
          <div>{data.shipping.name}</div>
          <div>{data.shipping.phone}</div>
          <div>{data.shipping.address}</div>
          <div>{data.shipping.city}, {data.shipping.state}</div>
          <div>{data.shipping.pincode}</div>
        </div>

        <div className="box">
          <h4>PAYMENT</h4>
          <div>Method: {data.payment.method}</div>
          <div>Status: {data.payment.status}</div>
          <div>Txn ID: {data.payment.transactionId}</div>
        </div>
      </div>

      {/* ITEMS + SUMMARY */}
      <div className="main">

        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Product</th>
              <th>HSN</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>GST%</th>
              <th>Taxable</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {data.items.map((i: any, idx: number) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{i.name}</td>
                <td>{i.hsn}</td>
                <td>{i.qty}</td>
                <td>{i.rate}</td>
                <td>{i.gstPercent}%</td>
                <td>{i.taxable}</td>
                <td>{i.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="summary">
          <div>Taxable: ₹{data.summary.taxable}</div>
          <div>Discount: ₹{data.summary.discount}</div>
          <div>CGST: ₹{data.summary.cgst}</div>
          <div>SGST: ₹{data.summary.sgst}</div>
          <div>IGST: ₹{data.summary.igst}</div>

          <div className="grand">
            Grand Total: ₹{data.summary.grandTotal}
          </div>
        </div>
      </div>

      {/* QR SECTION */}
      <div className="qrBox">
        <div>QR (Invoice Verification)</div>
        <div className="qrPlaceholder">QR COMING</div>
      </div>

      {/* SIGNATURE */}
      <div className="sign">
        Authorized Signatory
      </div>

      {/* FOOTER */}
      <div className="footer">
        Thanks for Shopping with Native ❤️
        <br />
        This is a computer generated GST invoice
      </div>

      <button onClick={() => window.print()} className="printBtn">
        Print / Download PDF
      </button>
    </div>
  );
}

/* ================= ERP PRINT CSS ================= */

const styles = `
.page {
  max-width: 900px;
  margin: auto;
  padding: 20px;
  font-family: Arial;
  color: #000;
}

.title {
  font-size: 22px;
  font-weight: bold;
  text-decoration: underline;
  margin-bottom: 10px;
}

.header {
  display: flex;
  justify-content: space-between;
  border-bottom: 2px solid #000;
  padding-bottom: 15px;
}

.invoiceBox {
  border: 1px solid #000;
  padding: 10px;
  border-radius: 10px;
}

.grid3 {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
  margin-top: 15px;
}

.box {
  border: 1px solid #000;
  padding: 10px;
  border-radius: 10px;
}

.main {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 10px;
  margin-top: 15px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th, .table td {
  border: 1px solid #000;
  padding: 6px;
  font-size: 12px;
}

.summary {
  border: 1px solid #000;
  padding: 10px;
  border-radius: 10px;
}

.grand {
  font-size: 16px;
  font-weight: bold;
  margin-top: 10px;
}

.qrBox {
  margin-top: 15px;
  border: 1px dashed #000;
  padding: 10px;
  text-align: center;
}

.qrPlaceholder {
  height: 80px;
}

.sign {
  margin-top: 20px;
  text-align: right;
}

.footer {
  text-align: center;
  margin-top: 20px;
  font-size: 12px;
}

.printBtn {
  margin-top: 20px;
  padding: 10px;
  background: black;
  color: white;
}

@media print {
  .printBtn { display: none; }
}
`;

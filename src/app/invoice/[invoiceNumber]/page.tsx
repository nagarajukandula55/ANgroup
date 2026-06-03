"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function InvoicePage() {
  const { invoiceNumber } = useParams();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceNumber) return;

    fetch(`/api/invoice/view/${invoiceNumber}`)
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [invoiceNumber]);

  if (loading) return <div style={{ padding: 20 }}>Loading invoice...</div>;
  if (!data) return <div>Invoice not found</div>;

  const isB2B = data?.type === "B2B";

  const safe = (v: any) => v ?? "N/A";

  return (
    <div className="page">
      <style>{styles}</style>

      {/* HEADER */}
      <div className="header">
        <div>
          <div className="title">TAX INVOICE</div>

          <div className="company">
            <b>{safe(data?.company?.name)}</b><br />
            {safe(data?.company?.tagline)}<br />
            {safe(data?.company?.address1)}<br />
            {safe(data?.company?.address2)}<br />
            {safe(data?.company?.city)}, {safe(data?.company?.state)}<br />
            GSTIN: {safe(data?.company?.gstin)}<br />
            Phone: {safe(data?.company?.phone)}<br />
            Email: {safe(data?.company?.email)}
          </div>
        </div>

        <div className="invoiceBox">
          <div><b>Invoice No:</b> {safe(data?.invoiceNumber)}</div>
          <div><b>Date:</b> {safe(data?.invoiceDate)}</div>
          <div><b>Order ID:</b> {safe(data?.orderId)}</div>
          <div><b>Type:</b> {isB2B ? "B2B" : "B2C"}</div>
        </div>
      </div>

      {/* CUSTOMER / SHIPPING / PAYMENT */}
      <div className="grid3">

        <div className="box">
          <h4>BILL TO</h4>
          <div>{safe(data?.customer?.name)}</div>
          <div>{safe(data?.customer?.phone)}</div>
          <div>{safe(data?.customer?.address)}</div>
          <div>{safe(data?.customer?.city)}, {safe(data?.customer?.state)}</div>
          <div>{safe(data?.customer?.pincode)}</div>

          {isB2B && (
            <>
              <hr />
              <div><b>GSTIN:</b> {safe(data?.customer?.gstin)}</div>
              <div><b>State Code:</b> {safe(data?.customer?.stateCode)}</div>
            </>
          )}
        </div>

        <div className="box">
          <h4>SHIP TO</h4>
          <div>{safe(data?.shipping?.name)}</div>
          <div>{safe(data?.shipping?.phone)}</div>
          <div>{safe(data?.shipping?.address)}</div>
          <div>{safe(data?.shipping?.city)}, {safe(data?.shipping?.state)}</div>
          <div>{safe(data?.shipping?.pincode)}</div>
        </div>

        <div className="box">
          <h4>PAYMENT</h4>
          <div><b>Method:</b> {safe(data?.payment?.method)}</div>
          <div><b>Status:</b> {safe(data?.payment?.status)}</div>
          <div><b>Txn ID:</b> {safe(data?.payment?.transactionId)}</div>
        </div>
      </div>

      {/* ITEMS */}
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
            {(data?.items || []).map((i: any, idx: number) => (
              <tr key={idx}>
                <td>{idx + 1}</td>
                <td>{safe(i?.name)}</td>
                <td>{safe(i?.hsn)}</td>
                <td>{safe(i?.qty)}</td>
                <td>{safe(i?.rate)}</td>
                <td>{safe(i?.gstPercent)}</td>
                <td>{safe(i?.taxable)}</td>
                <td>{safe(i?.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SUMMARY */}
        <div className="summary">
          <div>Taxable: ₹{safe(data?.summary?.taxable)}</div>
          <div>Discount: ₹{safe(data?.summary?.discount)}</div>
          <div>CGST: ₹{safe(data?.summary?.cgst)}</div>
          <div>SGST: ₹{safe(data?.summary?.sgst)}</div>
          <div>IGST: ₹{safe(data?.summary?.igst)}</div>

          <div className="grand">
            Grand Total: ₹{safe(data?.summary?.grandTotal)}
          </div>
        </div>
      </div>

      {/* QR */}
      <div className="qrBox">
        <div>QR Verification</div>
        <div className="qrPlaceholder">QR COMING</div>
      </div>

      {/* SIGN */}
      <div className="sign">Authorized Signatory</div>

      {/* FOOTER */}
      <div className="footer">
        Thanks for Shopping with Native ❤️<br />
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

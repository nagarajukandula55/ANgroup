"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import QRCode from "qrcode";

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

    const [qr, setQr] = useState("");

  const verifyUrl =
  `${window.location.origin}/api/invoice/verify/${invoiceNumber}`;

  QRCode.toDataURL(verifyUrl)
    .then(setQr);

  const isB2B = data?.type === "B2B";

  const safe = (v: any) => v ?? "N/A";

  return (
    <div className="page">
      <style>{styles}</style>

{/* TAX INVOICE TITLE */}
<div className="invoiceTitle">
  TAX INVOICE
</div>

{/* COMPANY + INVOICE DETAILS */}
<div className="header">

  <div className="companyCard">

    <div className="companyName">
      {safe(data?.company?.name)}
    </div>

    <div>{safe(data?.company?.tagline)}</div>

    <div>{safe(data?.company?.address1)}</div>

    <div>{safe(data?.company?.address2)}</div>

    <div>
      {safe(data?.company?.city)},
      {" "}
      {safe(data?.company?.state)}
    </div>

    <div>
      GSTIN:
      {" "}
      {safe(data?.company?.gstin)}
    </div>

    <div>
      Phone:
      {" "}
      {safe(data?.company?.phone)}
    </div>

  </div>

  <div className="invoiceBox">

    <div>
      <b>Invoice No:</b>
      {" "}
      {safe(data?.invoiceNumber)}
    </div>

    <div>
      <b>Invoice Date:</b>
      {" "}
      {safe(data?.invoiceDate)}
    </div>

    <div>
      <b>Order Date:</b>
      {" "}
      {safe(data?.orderDate)}
    </div>

    <div>
      <b>Order ID:</b>
      {" "}
      {safe(data?.orderId)}
    </div>

    <div>
      <b>Invoice Type:</b>
      {" "}
      {isB2B ? "B2B" : "B2C"}
    </div>

  </div>

</div>

{/* BILL TO / SHIP TO / PAYMENT */}

<div className="grid3">

  <div className="box">

    <div className="sectionTitle">
      BILL TO
    </div>

    <div>{safe(data?.customer?.name)}</div>
    <div>{safe(data?.customer?.phone)}</div>
    <div>{safe(data?.customer?.address)}</div>

    <div>
      {safe(data?.customer?.city)},
      {" "}
      {safe(data?.customer?.state)}
    </div>

    <div>
      {safe(data?.customer?.pincode)}
    </div>

    {isB2B && (
      <>
        <br />

        <div>
          GSTIN:
          {" "}
          {safe(data?.customer?.gstin)}
        </div>

        <div>
          State Code:
          {" "}
          {safe(data?.customer?.stateCode)}
        </div>
      </>
    )}

  </div>

  <div className="box">

    <div className="sectionTitle">
      SHIP TO
    </div>

    <div>{safe(data?.shipping?.name || data?.customer?.name)}</div>
    <div>{safe(data?.shipping?.phone || data?.customer?.phone)}</div>
    <div>{safe(data?.shipping?.address || data?.customer?.address)}</div>

    <div>
      {safe(data?.shipping?.city || data?.customer?.city)},
      {" "}
      {safe(data?.shipping?.state || data?.customer?.state)}
    </div>

    <div>
      {safe(data?.shipping?.pincode || data?.customer?.pincode)}
    </div>

  </div>

  <div className="box">

    <div className="sectionTitle">
      PAYMENT
    </div>

    <div>
      Method:
      {" "}
      {safe(data?.payment?.method)}
    </div>

    <div>
      Status:
      {" "}
      {safe(data?.payment?.status)}
    </div>

    <div>
      Transaction:
      {" "}
      {safe(data?.payment?.transactionId)}
    </div>

  </div>

</div>

{/* PRODUCT TABLE */}

<div className="productHeader">
  PRODUCT DETAILS
</div>

<table className="table">

  <thead>

    <tr key={idx}>
    <td>{idx + 1}</td>
    <td>{safe(i?.name)}</td>
    <td>{safe(i?.hsn)}</td>
    <td>{safe(i?.qty)}</td>
    <td>₹{safe(i?.rate)}</td>
    <td>₹{safe(i?.taxable)}</td>
    <td>{safe(i?.gstPercent)}%</td>
    <td>₹{safe(i?.cgst || 0)}</td>
    <td>₹{safe(i?.sgst || 0)}</td>
    <td>₹{safe(i?.igst || 0)}</td>
    <td>₹{safe(i?.total)}</td>
  </tr>

  </thead>

  <tbody>

    {(data?.items || []).map(
      (i: any, idx: number) => (

      <tr key={idx}>
        <td>{idx + 1}</td>
        <td>{safe(i?.name)}</td>
        <td>{safe(i?.hsn)}</td>
        <td>{safe(i?.qty)}</td>
        <td>₹{safe(i?.rate)}</td>
        <td>₹{safe(i?.discount || 0)}</td>
        <td>₹{safe(i?.taxable)}</td>
        <td>{safe(i?.gstPercent)}%</td>
        <td>₹{safe(i?.cgst)}</td>
        <td>₹{safe(i?.sgst)}</td>
        <td>₹{safe(i?.igst)}</td>
        <td>₹{safe(i?.total)}</td>
      </tr>

    ))}

  </tbody>

</table>

{/* Total Row */}      

<tfoot>

<tr>

  <td colSpan={6}>
    Total
  </td>

  <td>
    ₹{safe(data?.summary?.taxable)}
  </td>

  <td></td>

  <td>
    ₹{safe(data?.summary?.cgst)}
  </td>

  <td>
    ₹{safe(data?.summary?.sgst)}
  </td>

  <td>
    ₹{safe(data?.summary?.igst)}
  </td>

  <td>
    ₹{safe(data?.summary?.grandTotal)}
  </td>

</tr>

</tfoot>

{/* HSN Summary TABLE */}
      
{isB2B && (
<div className="hsnSummary">

  <div className="sectionTitle">
    HSN SUMMARY
  </div>

  {(data?.hsnSummary || []).map((row:any,index:number)=>(
    <div key={index}>
      HSN {row.hsn}
      {" - "}
      ₹{row.taxable}
    </div>
  ))}

</div>
)}

{/* QR + GST SUMMARY */}

<div className="summaryRow">

  <div className="qrSection">

    <img
      src={qr}
      alt="QR"
      style={{
        width: 120,
        height: 120
      }}
    />

    <div className="gstMeta">

      <div>
        <b>Place of Supply:</b>
        {" "}
        {safe(data?.placeOfSupply)}
      </div>

      <div>
        <b>State Code:</b>
        {" "}
        {safe(data?.stateCode)}
      </div>

      <div>
        <b>Supply Type:</b>
        {" "}
        {isB2B ? "B2B" : "B2C"}
      </div>

      <div>
        <b>Reverse Charge:</b>
        No
      </div>

    </div>

  </div>

  <div className="summary">

    <div>
      Taxable Amount :
      ₹ {safe(data?.summary?.taxable)}
    </div>

    <div>
      Discount :
      ₹ {safe(data?.summary?.discount)}
    </div>

    <div>
      CGST :
      ₹ {safe(data?.summary?.cgst)}
    </div>

    <div>
      SGST :
      ₹ {safe(data?.summary?.sgst)}
    </div>

    <div>
      IGST :
      ₹ {safe(data?.summary?.igst)}
    </div>

    <div className="grand">

      Grand Total :
      ₹ {safe(data?.summary?.grandTotal)}

    </div>

  </div>

</div>

{/* SIGNATURE */}

<div className="signatureArea">

  <img
    src="/signature.png"
    alt="signature"
    className="signatureImage"
  />

  <div className="signatoryText">
    Authorized Signatory
  </div>

</div>

{/* FOOTER */}

<div className="footer">

  Thanks for Shopping with Native ❤️

  <br />

  This is a computer generated GST invoice.

</div>

{/* DECLARATION */}

<div className="declaration">

  <b>Declaration</b>

  <p>

    Certified that the particulars
    given above are true and correct.
    This invoice is generated
    electronically and does not
    require a physical signature.

  </p>

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
  padding: 12px;
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
  gap: 20px;
  margin-top: 10px;
  padding-bottom:12px;
  border-bottom:1px solid #000;
}

.box{
    padding:8px 12px;
    border:none;
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
  margin-top: 10px;
}

.table th {
  background: #000;
  color: #fff;
  border: 1px solid #000;
  padding: 8px;
  font-size: 12px;
  font-weight: 700;
  text-align: center;
  white-space: nowrap;
}

.table td {
  border: 1px solid #000;
  padding: 6px;
  font-size: 11px;
  text-align: center;
  vertical-align: middle;
}

.table tbody tr:nth-child(even) {
  background: #fafafa;
}

.table tbody tr:hover {
  background: #f3f4f6;
}

.table td:nth-child(2) {
  text-align: left;
  padding-left: 8px;
  width:35%;
}

.table th {
  font-size: 11px;
  padding: 7px;
}

.table td {
  font-size: 10px;
  padding: 5px;
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

.productHeader{
  margin-top:12px;
  padding-top:8px;
  border-top:1px solid #000;
  font-size:14px;
  font-weight:700;
  text-decoration:underline;
  margin-bottom:8px;
}

.qrImage{
  width:120px;
  height:120px;
  object-fit:contain;
  display:block;
  margin:auto;
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

.invoiceTitle{
  text-align:center;
  font-size:28px;
  font-weight:700;
  text-decoration:underline;
  margin-bottom:20px;
}

.companyCard{
  flex:1;
  font-size:13px;
  line-height:1.3;
}

.companyName{
  font-size:18px;
  font-weight:700;
  margin-bottom:10px;
}

.sectionTitle{
  font-weight:700;
  text-decoration:underline;
  margin-bottom:10px;
}

.productTitle{
  margin-top:10px;
  margin-bottom:10px;
  font-weight:700;
  text-decoration:underline;
}

.summaryRow{
  display:flex;
  justify-content:space-between;
  gap:20px;
  margin-top:20px;
}

.qrSection{
  width:40%;
  border:1px solid #000;
  border-radius:10px;
  padding:15px;
}

.hsnSummary{
  margin-top:10px;
  border-top:1px solid #ccc;
  padding-top:10px;
  font-size:11px;
}

.summary{
  width:60%;
  border:1px solid #000;
  border-radius:10px;
  padding:15px;
  line-height:2;
}

.signatureArea{
  width:60%;
  margin-left:auto;
  text-align:right;
  margin-top:10px;
}

.signatureImage{
  height:60px;
  object-fit:contain;
  display:block;
  margin-left:auto;
}

.signatoryText{
  margin-top:3px;
  font-size:11px;
  font-weight:500;
}

.gstMeta{
  margin-top:10px;
  font-size:11px;
  line-height:1.6;
  border-top:1px solid #ddd;
  padding-top:8px;
}

.gstMeta b{
  display:inline-block;
  min-width:110px;
}

.declaration{
  margin-top:20px;
  border-top:1px solid #ddd;
  padding-top:15px;
  font-size:12px;
}

@media print {
  .printBtn { display: none; }
}
`;

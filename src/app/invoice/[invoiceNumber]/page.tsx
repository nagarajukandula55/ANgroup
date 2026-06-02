"use client";

import { useEffect, useState } from "react";

export default function InvoicePage({ params }: any) {
  const { invoiceNumber } = params;

  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invoice/view/${invoiceNumber}`)
      .then((res) => res.json())
      .then(setData);
  }, [invoiceNumber]);

  if (!data) return <div>Loading invoice...</div>;

  return (
    <div style={{ background: "#f5f5f5", padding: 30 }}>
      
      {/* HEADER */}
      <div style={{
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        marginBottom: 20
      }}>
        <h2>AN GROUP</h2>
        <h4>GST INVOICE</h4>

        <div>Invoice No: {data.invoiceNumber}</div>
        <div>Date: {new Date(data.createdAt).toLocaleDateString()}</div>
      </div>

      {/* CUSTOMER */}
      <div style={{
        background: "#fff",
        padding: 20,
        borderRadius: 10,
        marginBottom: 20
      }}>
        <h3>Bill To</h3>
        <div>{data.customer?.name}</div>
        <div>{data.customer?.phone}</div>
        <div>{data.customer?.address}</div>
        <div>{data.customer?.gstNumber}</div>
      </div>

      {/* ITEMS */}
      <div style={{ background: "#fff", padding: 20, borderRadius: 10 }}>
        <table width="100%">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>GST</th>
              <th>Total</th>
            </tr>
          </thead>

          <tbody>
            {data.items.map((item: any, i: number) => (
              <tr key={i}>
                <td>{item.name}</td>
                <td>{item.qty}</td>
                <td>₹{item.price}</td>
                <td>{item.gstPercent}%</td>
                <td>₹{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTALS */}
        <div style={{ textAlign: "right", marginTop: 20 }}>
          <div>Subtotal: ₹{data.subtotal}</div>
          <div>CGST: ₹{data.cgst}</div>
          <div>SGST: ₹{data.sgst}</div>
          <div><b>Grand Total: ₹{data.grandTotal}</b></div>
        </div>
      </div>

      {/* PRINT BUTTON */}
      <button
        onClick={() => window.print()}
        style={{
          marginTop: 20,
          padding: 12,
          background: "#000",
          color: "#fff",
          borderRadius: 8
        }}
      >
        Print / Save PDF
      </button>
    </div>
  );
}

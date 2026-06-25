"use client";

import { useEffect, useState } from "react";

export default function VendorProductDetail({
  params,
}: any) {
  const [data, setData] = useState<any>(null);
  const [bom, setBom] = useState<any[]>([]);

  useEffect(() => {
    fetch(
      `/api/vendor-products`
    )
      .then((r) => r.json())
      .then((d) => {
        const item = d.data.find(
          (x: any) =>
            x._id === params.id
        );
        setData(item);
      });

    fetch(
      `/api/vendor-products/${params.id}/bom`
    )
      .then((r) => r.json())
      .then((d) => setBom(d.data || []));
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        {data.productName}
      </h1>

      {/* PRODUCT INFO */}
      <div className="border p-4 rounded">
        <p>
          Variant: {data.variantName}
        </p>
        <p>
          Vendor Cost: ₹{data.vendorCost}
        </p>
        <p>
          MRP: ₹{data.mrp}
        </p>
        <p>
          Status: {data.approvalStatus}
        </p>
      </div>

      {/* BOM TABLE */}
      <div className="border rounded">
        <h2 className="p-3 font-semibold">
          BOM Breakdown
        </h2>

        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th>Material</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Cost</th>
            </tr>
          </thead>

          <tbody>
            {bom.map((b) => (
              <tr key={b._id}>
                <td>
                  {b.materialName}
                </td>
                <td>{b.quantity}</td>
                <td>{b.currentRate}</td>
                <td>{b.currentCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* COST SUMMARY */}
      <div className="border p-4 rounded">
        <h2 className="font-semibold">
          Cost Summary
        </h2>

        <p>
          Current Cost: ₹
          {data.calculatedCurrentCost}
        </p>

        <p>
          Safe Cost: ₹
          {data.calculatedSafeCost}
        </p>

        <p>
          Worst Cost: ₹
          {data.calculatedWorstCost}
        </p>
      </div>
    </div>
  );
}

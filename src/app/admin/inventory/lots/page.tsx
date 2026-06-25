"use client";

import { useEffect, useState } from "react";

export default function InventoryLotsPage() {
  const [lots, setLots] =
    useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch(
      "/api/inventory-lots"
    );

    const json = await res.json();

    setLots(json.data || []);
  }

  return (
    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold">
        Inventory Lots
      </h1>

      <table className="w-full border">

        <thead>
          <tr>
            <th>Lot No</th>
            <th>Item</th>
            <th>Qty</th>
            <th>Cost</th>
            <th>Expiry</th>
          </tr>
        </thead>

        <tbody>

          {lots.map((lot) => (
            <tr key={lot._id}>
              <td>{lot.lotNumber}</td>

              <td>
                {lot.materialId?.materialName ||
                  lot.productVariantId
                    ?.variantName}
              </td>

              <td>{lot.quantity}</td>

              <td>{lot.unitCost}</td>

              <td>
                {lot.expiryDate
                  ? new Date(
                      lot.expiryDate
                    ).toLocaleDateString()
                  : "-"}
              </td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

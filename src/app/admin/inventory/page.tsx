"use client";

import { useEffect, useState } from "react";

export default function InventoryPage() {
  const [inventory, setInventory] =
    useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch(
      "/api/inventory"
    );

    const json = await res.json();

    setInventory(json.data || []);
  }

  return (
    <div className="p-6">

      <h1 className="mb-6 text-2xl font-bold">
        Inventory
      </h1>

      <div className="overflow-auto border rounded">

        <table className="w-full">

          <thead className="bg-gray-100">
            <tr>
              <th className="p-3">
                Warehouse
              </th>

              <th className="p-3">
                Item
              </th>

              <th className="p-3">
                Available
              </th>

              <th className="p-3">
                Reserved
              </th>

              <th className="p-3">
                Avg Cost
              </th>

              <th className="p-3">
                Value
              </th>
            </tr>
          </thead>

          <tbody>

            {inventory.map((row) => (
              <tr
                key={row._id}
                className="border-t"
              >
                <td className="p-3">
                  {row.warehouseId?.warehouseName}
                </td>

                <td className="p-3">
                  {row.materialId?.materialName ||
                    row.productVariantId?.variantName}
                </td>

                <td className="p-3">
                  {row.availableQty}
                </td>

                <td className="p-3">
                  {row.reservedQty}
                </td>

                <td className="p-3">
                  ₹{row.averageCost}
                </td>

                <td className="p-3">
                  ₹
                  {(
                    row.availableQty *
                    row.averageCost
                  ).toFixed(2)}
                </td>
              </tr>
            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

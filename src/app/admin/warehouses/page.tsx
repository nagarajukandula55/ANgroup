"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function WarehousesPage() {
  const [data, setData] = useState([]);

  async function loadData() {
    const res = await fetch(
      "/api/warehouses"
    );

    const json = await res.json();

    setData(json.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Warehouses
        </h1>

        <Link
          href="/admin/warehouses/new"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Add Warehouse
        </Link>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {data.map((row: any) => (
            <tr key={row._id}>
              <td>{row.warehouseCode}</td>
              <td>{row.warehouseName}</td>
              <td>{row.warehouseType}</td>
              <td>
                {row.active
                  ? "Active"
                  : "Inactive"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

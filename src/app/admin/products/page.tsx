"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [data, setData] =
    useState<any[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res =
      await fetch("/api/products");

    const json =
      await res.json();

    setData(json.data || []);
  }

  return (
    <div className="p-6">

      <div className="mb-6 flex justify-between">

        <h1 className="text-2xl font-bold">
          Products
        </h1>

        <Link
          href="/admin/products/new"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Add Product
        </Link>

      </div>

      <table className="w-full border">

        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>

          {data.map((p) => (
            <tr key={p._id}>
              <td>{p.productCode}</td>
              <td>{p.productName}</td>
              <td>{p.status}</td>
            </tr>
          ))}

        </tbody>

      </table>

    </div>
  );
}

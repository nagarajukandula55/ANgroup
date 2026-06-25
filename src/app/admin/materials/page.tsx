"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function MaterialsPage() {
  const [materials, setMaterials] =
    useState<any[]>([]);

  async function loadData() {
    const res = await fetch(
      "/api/materials"
    );

    const json = await res.json();

    setMaterials(json.data || []);
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between">
        <h1 className="text-2xl font-bold">
          Materials
        </h1>

        <Link
          href="/admin/materials/new"
          className="rounded bg-black px-4 py-2 text-white"
        >
          Add Material
        </Link>
      </div>

      <table className="w-full border">
        <thead>
          <tr>
            <th>Code</th>
            <th>Name</th>
            <th>Type</th>
            <th>Unit</th>
          </tr>
        </thead>

        <tbody>
          {materials.map((m) => (
            <tr key={m._id}>
              <td>{m.materialCode}</td>
              <td>{m.materialName}</td>
              <td>{m.materialType}</td>
              <td>{m.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

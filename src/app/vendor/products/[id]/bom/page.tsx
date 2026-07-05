"use client";

import { useEffect, useState } from "react";

type Material = {
  _id: string;
  materialName: string;
};

type BOM = {
  _id: string;
  materialName: string;
  quantity: number;
  unit: string;
  currentRate: number;
  currentCost: number;
};

export default function BOMPage({
  params,
}: any) {
  const [materials, setMaterials] =
    useState<Material[]>([]);

  const [items, setItems] = useState<BOM[]>([]);

  const [form, setForm] = useState({
    materialId: "",
    quantity: 0,
    unit: "",
    currentRate: 0,
    wastagePercent: 0,
  });

  async function load() {
    const res = await fetch(
      `/api/vendor-products/${params.id}/bom`
    );
    const data = await res.json();
    setItems(data.data || []);
  }

  async function loadMaterials() {
    const res = await fetch("/api/materials");
    const data = await res.json();
    setMaterials(data.data || []);
  }

  useEffect(() => {
    load();
    loadMaterials();
  }, []);

  async function addItem() {
    await fetch(
      `/api/vendor-products/${params.id}/bom`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      }
    );

    setForm({
      materialId: "",
      quantity: 0,
      unit: "",
      currentRate: 0,
      wastagePercent: 0,
    });

    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        BOM Builder
      </h1>

      {/* ADD ITEM */}
      <div className="grid grid-cols-5 gap-2">
        <select
          className="border p-2 bg-white text-gray-900"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              materialId: e.target.value,
            }))
          }
        >
          <option>Select Material</option>
          {materials.map((m) => (
            <option key={m._id} value={m._id}>
              {m.materialName}
            </option>
          ))}
        </select>

        <input
          placeholder="Qty"
          type="number"
          className="border p-2 bg-white text-gray-900 placeholder:text-gray-400"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              quantity: Number(
                e.target.value
              ),
            }))
          }
        />

        <input
          placeholder="Unit"
          className="border p-2 bg-white text-gray-900 placeholder:text-gray-400"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              unit: e.target.value,
            }))
          }
        />

        <input
          placeholder="Rate"
          type="number"
          className="border p-2 bg-white text-gray-900 placeholder:text-gray-400"
          onChange={(e) =>
            setForm((p) => ({
              ...p,
              currentRate: Number(
                e.target.value
              ),
            }))
          }
        />

        <button
          onClick={addItem}
          className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 transition"
        >
          Add
        </button>
      </div>

      {/* LIST */}
      <div className="border rounded">
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
            {items.map((i) => (
              <tr
                key={i._id}
                className="border-b"
              >
                <td>{i.materialName}</td>
                <td>{i.quantity}</td>
                <td>{i.currentRate}</td>
                <td>{i.currentCost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function StepBOM({ draftId, next, back }) {
  const [materials, setMaterials] = useState([]);
  const [rows, setRows] = useState([
    {
      materialId: "",
      materialName: "",
      qty: 1,
      unit: "",
      wastagePercent: 0,
    },
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      {
        materialId: "",
        materialName: "",
        qty: 1,
        unit: "",
        wastagePercent: 0,
      },
    ]);
  };

  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const saveBOM = async () => {
    await fetch(`/api/vendor-products/${draftId}/bom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materials: rows }),
    });

    next();
  };

  return (
    <div className="space-y-4">

      <h2 className="text-xl font-semibold">
        BOM (Bill of Materials)
      </h2>

      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-4 gap-2">

          <input
            className="border p-2 rounded"
            placeholder="Material ID"
            value={row.materialId}
            onChange={(e) =>
              updateRow(i, "materialId", e.target.value)
            }
          />

          <input
            type="number"
            className="border p-2 rounded"
            placeholder="Qty"
            value={row.qty}
            onChange={(e) =>
              updateRow(i, "qty", Number(e.target.value))
            }
          />

          <input
            className="border p-2 rounded"
            placeholder="Unit"
            value={row.unit}
            onChange={(e) =>
              updateRow(i, "unit", e.target.value)
            }
          />

          <input
            type="number"
            className="border p-2 rounded"
            placeholder="Wastage %"
            value={row.wastagePercent}
            onChange={(e) =>
              updateRow(i, "wastagePercent", Number(e.target.value))
            }
          />

        </div>
      ))}

      <div className="flex gap-2">

        <button
          onClick={addRow}
          className="px-3 py-2 border rounded"
        >
          + Add Material
        </button>

      </div>

      <div className="flex justify-between pt-4">

        <button onClick={back} className="border px-4 py-2 rounded">
          Back
        </button>

        <button
          onClick={saveBOM}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Save BOM & Continue
        </button>

      </div>
    </div>
  );
}

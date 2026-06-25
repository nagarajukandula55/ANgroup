"use client";

import { useState } from "react";

export default function StepStructure({ draftId, next, back }) {
  const [form, setForm] = useState({
    unit: "",
    packSize: 1,
    netWeight: 0,
    grossWeight: 0,
    hsnCode: "",
    gstRate: 0,
  });

  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);

    await fetch(`/api/vendor-products/${draftId}/structure`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    setLoading(false);
    next();
  };

  return (
    <div className="space-y-4">

      <h2 className="text-xl font-semibold">
        Product Structure & Taxation
      </h2>

      <input
        className="w-full border p-2 rounded"
        placeholder="Unit (kg, g, ml, pcs)"
        value={form.unit}
        onChange={(e) =>
          setForm({ ...form, unit: e.target.value })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Pack Size"
        value={form.packSize}
        onChange={(e) =>
          setForm({
            ...form,
            packSize: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Net Weight"
        value={form.netWeight}
        onChange={(e) =>
          setForm({
            ...form,
            netWeight: Number(e.target.value),
          })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="Gross Weight"
        value={form.grossWeight}
        onChange={(e) =>
          setForm({
            ...form,
            grossWeight: Number(e.target.value),
          })
        }
      />

      <input
        className="w-full border p-2 rounded"
        placeholder="HSN Code"
        value={form.hsnCode}
        onChange={(e) =>
          setForm({ ...form, hsnCode: e.target.value })
        }
      />

      <input
        type="number"
        className="w-full border p-2 rounded"
        placeholder="GST Rate (%)"
        value={form.gstRate}
        onChange={(e) =>
          setForm({
            ...form,
            gstRate: Number(e.target.value),
          })
        }
      />

      <div className="flex justify-between pt-4">

        <button
          onClick={back}
          className="px-4 py-2 border rounded"
        >
          Back
        </button>

        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Saving..." : "Save & Continue"}
        </button>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

export default function StepBOM({ draftId, next, back }) {
  const [rows, setRows] = useState([]);
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("");
  const [wastagePercent, setWastagePercent] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH BOM ================= */
  const fetchBOM = async () => {
    const res = await fetch(`/api/vendor-products/${draftId}/bom`);
    const data = await res.json();

    if (data.success) {
      setRows(data.data);
    }
  };

  useEffect(() => {
    fetchBOM();
  }, []);

  /* ================= ADD MATERIAL ================= */
  const addMaterial = async () => {
    if (!materialId) return;

    setLoading(true);

    await fetch(`/api/vendor-products/${draftId}/bom`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        materialId,
        quantity,
        unit,
        wastagePercent,
        currentRate: 0,
        currentCost: 0,
        remarks: "",
        businessId: "TEMP", // replace from auth later
        createdBy: "TEMP",  // replace from auth later
      }),
    });

    setMaterialId("");
    setQuantity(1);
    setUnit("");
    setWastagePercent(0);

    await fetchBOM();
    setLoading(false);
  };

  /* ================= DELETE ================= */
  const deleteItem = async (bomId) => {
    await fetch(
      `/api/vendor-products/${draftId}/bom?bomId=${bomId}`,
      { method: "DELETE" }
    );

    await fetchBOM();
  };

  return (
    <div className="space-y-4">

      <h2 className="text-xl font-semibold">
        BOM (Material Composition)
      </h2>

      {/* ================= ADD ROW ================= */}
      <div className="grid grid-cols-4 gap-2">

        <input
          className="border p-2 rounded"
          placeholder="Material ID"
          value={materialId}
          onChange={(e) => setMaterialId(e.target.value)}
        />

        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Qty"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <input
          className="border p-2 rounded"
          placeholder="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />

        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Wastage %"
          value={wastagePercent}
          onChange={(e) =>
            setWastagePercent(Number(e.target.value))
          }
        />

      </div>

      <button
        onClick={addMaterial}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? "Adding..." : "Add Material"}
      </button>

      {/* ================= LIST ================= */}
      <div className="mt-6 space-y-2">

        {rows.map((item: any) => (
          <div
            key={item._id}
            className="border p-3 rounded flex justify-between"
          >

            <div>
              <div className="font-medium">
                {item.materialName}
              </div>

              <div className="text-sm text-gray-500">
                Qty: {item.quantity} {item.unit} | Wastage:{" "}
                {item.wastagePercent}%
              </div>
            </div>

            <button
              onClick={() => deleteItem(item._id)}
              className="text-red-500"
            >
              Delete
            </button>

          </div>
        ))}

      </div>

      {/* ================= NAV ================= */}
      <div className="flex justify-between pt-4">

        <button
          onClick={back}
          className="border px-4 py-2 rounded"
        >
          Back
        </button>

        <button
          onClick={next}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Continue
        </button>

      </div>

    </div>
  );
}

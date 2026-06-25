"use client";

import { useEffect, useState } from "react";
import MaterialSearchSelect from "@/components/shared/MaterialSearchSelect";

export default function StepBOM({ draftId, next, back }) {
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(false);

  const [costSummary, setCostSummary] = useState({
    totalMaterialCost: 0,
    wastageCost: 0,
    finalCost: 0,
  });

  /* ================= FETCH BOM ================= */
  const fetchBOM = async () => {
    const res = await fetch(`/api/vendor-products/${draftId}/bom`);
    const data = await res.json();

    if (data.success) {
      setRows(
        data.data.map((item: any) => ({
          bomId: item._id,
          materialId: item.materialId?._id,
          materialName: item.materialName,
          unit: item.unit,
          quantity: item.quantity,
          wastagePercent: item.wastagePercent,
        }))
      );
    }
  };

  useEffect(() => {
    fetchBOM();
  }, []);

    <div className="border rounded p-4 mt-6 bg-gray-50">
  
    <h3 className="font-semibold text-lg mb-2">
      Cost Summary
    </h3>
  
    <div className="text-sm space-y-1">
  
      <div>
        Material Cost: ₹{costSummary.totalMaterialCost}
      </div>
  
      <div>
        Wastage Cost: ₹{costSummary.wastageCost}
      </div>
  
      <div className="font-bold text-green-600">
        Final Production Cost: ₹{costSummary.finalCost}
      </div>
  
    </div>
  
  </div>

  /* ================= ADD NEW ROW ================= */
  const addRow = () => {
    setRows([
      ...rows,
      {
        materialId: "",
        materialName: "",
        unit: "",
        quantity: 1,
        wastagePercent: 0,
      },
    ]);
  };

  useEffect(() => {
    calculateCost();
  }, [rows]);
  
  /* ================= Calculate Cost ================= */
  const calculateCost = async () => {
  const res = await fetch(`/api/vendor-products/${draftId}/cost`);
  const data = await res.json();

    if (data.success) {
      setCostSummary(data.data);
    }
  };

  /* ================= UPDATE ROW ================= */
  const updateRow = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  /* ================= SAVE ROW TO DB ================= */
  const saveRow = async (row) => {
    await fetch(`/api/vendor-products/${draftId}/bom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        materialId: row.materialId,
        quantity: row.quantity,
        unit: row.unit,
        wastagePercent: row.wastagePercent,
        currentRate: 0,
        currentCost: 0,
        remarks: "",
        businessId: "TEMP",
        createdBy: "TEMP",
      }),
    });

    await fetchBOM();
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
        BOM (Multi-Material Engine)
      </h2>

      {/* ================= ROWS ================= */}
      <div className="space-y-4">

        {rows.map((row, index) => (
          <div
            key={index}
            className="grid grid-cols-5 gap-2 border p-3 rounded"
          >

            {/* MATERIAL SEARCH */}
            <MaterialSearchSelect
              onSelect={(m) => {
                updateRow(index, "materialId", m._id);
                updateRow(index, "materialName", m.materialName);
                updateRow(index, "unit", m.unit);
              }}
            />

            {/* QTY */}
            <input
              type="number"
              className="border p-2 rounded"
              placeholder="Qty"
              value={row.quantity}
              onChange={(e) =>
                updateRow(index, "quantity", Number(e.target.value))
              }
            />

            {/* UNIT */}
            <input
              className="border p-2 rounded"
              placeholder="Unit"
              value={row.unit}
              onChange={(e) =>
                updateRow(index, "unit", e.target.value)
              }
            />

            {/* WASTAGE */}
            <input
              type="number"
              className="border p-2 rounded"
              placeholder="Wastage %"
              value={row.wastagePercent}
              onChange={(e) =>
                updateRow(index, "wastagePercent", Number(e.target.value))
              }
            />

            {/* ACTIONS */}
            <div className="flex gap-2">

              <button
                onClick={() => saveRow(row)}
                className="bg-green-600 text-white px-2 rounded"
              >
                Save
              </button>

              {row.bomId && (
                <button
                  onClick={() => deleteItem(row.bomId)}
                  className="text-red-500"
                >
                  Delete
                </button>
              )}

            </div>

          </div>
        ))}

      </div>

      {/* ================= ADD ROW ================= */}
      <button
        onClick={addRow}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        + Add Material
      </button>

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

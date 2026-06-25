"use client";

export default function NewStockAdjustment() {
  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-6">
        Stock Adjustment
      </h1>

      <div className="grid gap-4">

        <input
          className="border p-3"
          placeholder="Warehouse"
        />

        <input
          className="border p-3"
          placeholder="Item"
        />

        <input
          className="border p-3"
          placeholder="Current Qty"
        />

        <input
          className="border p-3"
          placeholder="Adjusted Qty"
        />

        <input
          className="border p-3"
          placeholder="Reason"
        />

        <textarea
          className="border p-3"
          placeholder="Remarks"
        />

        <button
          className="bg-green-600 text-white p-3 rounded"
        >
          Save Adjustment
        </button>

      </div>

    </div>
  );
}

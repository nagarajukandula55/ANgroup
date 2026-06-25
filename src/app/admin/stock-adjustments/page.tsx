"use client";

import Link from "next/link";

export default function StockAdjustmentPage() {
  return (
    <div className="p-6">

      <div className="flex justify-between mb-6">

        <h1 className="text-2xl font-bold">
          Stock Adjustments
        </h1>

        <Link
          href="/admin/stock-adjustments/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          New Adjustment
        </Link>

      </div>

    </div>
  );
}

"use client";

import Link from "next/link";

export default function StockTransferPage() {
  return (
    <div className="p-6">

      <div className="flex justify-between mb-6">

        <h1 className="text-2xl font-bold">
          Stock Transfers
        </h1>

        <Link
          href="/admin/stock-transfers/new"
          className="bg-black text-white px-4 py-2 rounded"
        >
          New Transfer
        </Link>

      </div>

    </div>
  );
}

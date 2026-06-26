"use client";

import { useEffect, useState } from "react";

/* ================= TYPES ================= */

type ApprovalAction = "APPROVE" | "REJECT" | "REVISION";

type VendorProduct = {
  _id: string;
  productName: string;
  approvalStatus: string;
};

export default function AdminVendorProducts() {
  const [items, setItems] = useState<VendorProduct[]>([]);

  const fetchData = async () => {
    const res = await fetch("/api/admin/vendor-products/list");
    const data = await res.json();
    setItems(data.data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const action = async (id: string, type: ApprovalAction) => {
    await fetch("/api/admin/vendor-products/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: id,
        action: type,
        userId: "ADMIN",
      }),
    });

    fetchData();
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        Vendor Product Approvals
      </h1>

      {items.map((p) => (
        <div key={p._id} className="border p-3 rounded mb-2">

          <div className="font-medium">
            {p.productName}
          </div>

          <div className="text-sm text-gray-500">
            Status: {p.approvalStatus}
          </div>

          <div className="flex gap-2 mt-2">

            <button
              onClick={() => action(p._id, "APPROVE")}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              Approve
            </button>

            <button
              onClick={() => action(p._id, "REJECT")}
              className="bg-red-600 text-white px-3 py-1 rounded"
            >
              Reject
            </button>

            <button
              onClick={() => action(p._id, "REVISION")}
              className="bg-yellow-500 text-white px-3 py-1 rounded"
            >
              Revision
            </button>

          </div>

        </div>
      ))}
    </div>
  );
}

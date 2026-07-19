"use client";

import { useEffect, useState } from "react";

interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

interface Order {
  _id: string;
  orderNumber: string;
  items: OrderItem[];
  totalAmount: number;
  paymentMode: "CREDIT" | "PAY_ON_DELIVERY";
  status: "PENDING" | "CONFIRMED" | "FULFILLED" | "CANCELLED";
  createdAt: string;
  account: { name: string; type: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  FULFILLED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default function VendorB2BOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/b2b-orders");
      const data = await res.json();
      if (data.success) setOrders(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/vendor/b2b-orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      load();
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">B2B Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Orders placed by your Distributor/Retailer accounts.</p>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3">Order #</th>
              <th className="p-3">Account</th>
              <th className="p-3">Items</th>
              <th className="p-3">Total</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Status</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>Loading…</td></tr>
            ) : orders.length === 0 ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>No B2B orders yet.</td></tr>
            ) : (
              orders.map((o) => (
                <tr key={o._id} className="border-b border-gray-50 align-top">
                  <td className="p-3 font-mono text-xs text-gray-500">{o.orderNumber}</td>
                  <td className="p-3">
                    <p className="text-gray-900">{o.account?.name || "—"}</p>
                    <p className="text-xs text-gray-400">{o.account?.type}</p>
                  </td>
                  <td className="p-3 text-xs text-gray-500">
                    {o.items.map((it, i) => (
                      <p key={i}>{it.quantity} × {it.productName}</p>
                    ))}
                  </td>
                  <td className="p-3 text-gray-700">₹{o.totalAmount.toLocaleString("en-IN")}</td>
                  <td className="p-3 text-gray-500">{o.paymentMode === "CREDIT" ? "Credit" : "Pay on Delivery"}</td>
                  <td className="p-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{o.status}</span>
                  </td>
                  <td className="p-3 space-x-1">
                    {o.status === "PENDING" && (
                      <button onClick={() => setStatus(o._id, "CONFIRMED")} disabled={updating === o._id} className="text-xs text-blue-600">Confirm</button>
                    )}
                    {o.status === "CONFIRMED" && (
                      <button onClick={() => setStatus(o._id, "FULFILLED")} disabled={updating === o._id} className="text-xs text-emerald-600">Fulfill</button>
                    )}
                    {(o.status === "PENDING" || o.status === "CONFIRMED") && (
                      <button onClick={() => setStatus(o._id, "CANCELLED")} disabled={updating === o._id} className="text-xs text-red-600">Cancel</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

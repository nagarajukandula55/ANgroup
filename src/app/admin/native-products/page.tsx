"use client";

import { useEffect, useState } from "react";

interface NativeProductRow {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  basePrice: number;
  mrp?: number;
  isActive: boolean;
  images?: string[];
  variantGroupKey?: string;
  createdAt: string;
  businessId?: string;
}

interface BusinessOption {
  _id: string;
  name: string;
}

export default function NativeProductsAdminPage() {
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<NativeProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setBusinesses(d?.businesses || []))
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (businessId) params.set("businessId", businessId);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/native-products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function toggleActive(p: NativeProductRow) {
    setBusyId(p._id);
    try {
      await fetch(`/api/admin/native-products/${p._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: NativeProductRow) {
    if (!confirm(`Remove "${p.name}" from the storefront? This can be restored from the database if needed, but not from this page.`)) return;
    setBusyId(p._id);
    try {
      await fetch(`/api/admin/native-products/${p._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDeleted: true }),
      });
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Storefront Products</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every live NativeProduct listing — including stray ₹0 or leftover test entries not grouped with a real
          product. Deactivate to hide from the storefront, or Remove to soft-delete.
        </p>
      </div>

      <div className="flex gap-2">
        <select className="border rounded-lg p-2 text-sm" value={businessId} onChange={(e) => setBusinessId(e.target.value)}>
          <option value="">All Businesses</option>
          {businesses.map((b) => (
            <option key={b._id} value={b._id}>{b.name}</option>
          ))}
        </select>
        <input
          className="border rounded-lg p-2 text-sm flex-1"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="px-3 py-2 border rounded-lg text-sm">Search</button>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3"></th>
              <th className="p-3">Name</th>
              <th className="p-3">SKU</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3">Created</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>Loading…</td></tr>
            ) : products.length === 0 ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>No products found.</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p._id} className="border-b border-gray-50">
                  <td className="p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.images?.[0] || "/placeholder.png"} alt="" className="h-10 w-10 rounded object-cover" />
                  </td>
                  <td className="p-3 text-gray-900">{p.name}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{p.sku || "—"}</td>
                  <td className={`p-3 ${!p.basePrice ? "text-red-600 font-medium" : "text-gray-700"}`}>
                    ₹{p.basePrice || 0}
                  </td>
                  <td className="p-3">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${p.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-3 space-x-2">
                    <button onClick={() => toggleActive(p)} disabled={busyId === p._id} className="text-xs text-violet-600">
                      {p.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                    <button onClick={() => remove(p)} disabled={busyId === p._id} className="text-xs text-red-600">
                      Remove
                    </button>
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

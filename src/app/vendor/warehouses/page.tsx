"use client";

/**
 * Vendor-facing warehouse management — part of the vendor hierarchy layer
 * (AN Group > Businesses > Vendors > Warehouses > Staff). A vendor manages
 * their own warehouses here; the API (/api/warehouses) automatically scopes
 * everything to the logged-in vendor's own vendorId (see
 * app/api/warehouses/route.js), so a vendor can never see or touch another
 * vendor's or the business's own warehouses.
 */

import { useEffect, useState } from "react";
import { Warehouse, Plus, Loader2, Pencil, Trash2, X } from "lucide-react";

interface WarehouseRow {
  _id: string;
  warehouseCode: string;
  warehouseName: string;
  warehouseType: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  capacity?: number;
  active: boolean;
}

const WAREHOUSE_TYPES = ["RAW_MATERIAL", "FINISHED_GOODS", "DISTRIBUTION", "STORE", "PRODUCTION", "SERVICE_CENTER"];

const emptyForm = {
  warehouseCode: "",
  warehouseName: "",
  warehouseType: "FINISHED_GOODS",
  contactPerson: "",
  mobile: "",
  email: "",
  city: "",
  state: "",
  capacity: 0,
};

export default function VendorWarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/warehouses");
      const data = await res.json();
      setWarehouses(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setError(null);
  }

  function openEdit(w: WarehouseRow) {
    setForm({
      warehouseCode: w.warehouseCode,
      warehouseName: w.warehouseName,
      warehouseType: w.warehouseType,
      contactPerson: w.contactPerson || "",
      mobile: w.mobile || "",
      email: w.email || "",
      city: w.city || "",
      state: w.state || "",
      capacity: w.capacity || 0,
    });
    setEditingId(w._id);
    setShowForm(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(editingId ? `/api/warehouses/${editingId}` : "/api/warehouses", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save warehouse");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this warehouse?")) return;
    await fetch(`/api/warehouses/${id}`, { method: "DELETE" });
    await load();
  }

  const inputCls =
    "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your own storage/fulfilment locations.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition"
          >
            <Plus size={16} /> Add Warehouse
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
        ) : warehouses.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <Warehouse className="mx-auto text-gray-300 mb-3" size={28} />
            <p className="text-sm text-gray-500">No warehouses yet. Add your first one.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Code</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Location</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warehouses.map((w) => (
                  <tr key={w._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{w.warehouseCode}</td>
                    <td className="px-4 py-3 text-gray-900 font-medium">{w.warehouseName}</td>
                    <td className="px-4 py-3 text-gray-600">{w.warehouseType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-gray-600">{[w.city, w.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          w.active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {w.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(w)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                        >
                          <Pencil size={13} className="text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(w._id)}
                          className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 transition"
                        >
                          <Trash2 size={13} className="text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">{editingId ? "Edit Warehouse" : "Add Warehouse"}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Warehouse Code</label>
                    <input
                      className={inputCls}
                      placeholder="Auto-generated if left blank"
                      value={form.warehouseCode}
                      onChange={(e) => setForm((f) => ({ ...f, warehouseCode: e.target.value.toUpperCase() }))}
                      disabled={!!editingId}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select
                      className={inputCls}
                      value={form.warehouseType}
                      onChange={(e) => setForm((f) => ({ ...f, warehouseType: e.target.value }))}
                    >
                      {WAREHOUSE_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Warehouse Name *</label>
                  <input
                    required
                    className={inputCls}
                    value={form.warehouseName}
                    onChange={(e) => setForm((f) => ({ ...f, warehouseName: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Contact Person</label>
                    <input
                      className={inputCls}
                      value={form.contactPerson}
                      onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Mobile</label>
                    <input
                      className={inputCls}
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input
                      className={inputCls}
                      value={form.city}
                      onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>State</label>
                    <input
                      className={inputCls}
                      value={form.state}
                      onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Capacity (units)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={form.capacity}
                    onChange={(e) => setForm((f) => ({ ...f, capacity: Number(e.target.value) }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Saving…
                    </span>
                  ) : editingId ? (
                    "Save Changes"
                  ) : (
                    "Add Warehouse"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

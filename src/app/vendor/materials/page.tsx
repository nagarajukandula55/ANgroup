"use client";

import { useEffect, useState } from "react";

export default function VendorMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ materialName: "", unit: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/materials");
      const data = await res.json();
      if (data.success) setMaterials(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createMaterial() {
    setError(null);
    if (!form.materialName.trim() || !form.unit.trim()) {
      setError("Name and unit are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to add material");
        return;
      }
      setShowNew(false);
      setForm({ materialName: "", unit: "" });
      load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Materials</h1>
          <p className="text-sm text-gray-500 mt-1">
            Raw materials, packaging, and other BOM ingredients for your products.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="shrink-0 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          + Add Material
        </button>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">Add Material</h2>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Material name *"
              value={form.materialName}
              onChange={(e) => setForm((p) => ({ ...p, materialName: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Unit (e.g. kg, g, pcs) *"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowNew(false)} className="px-3 py-2 border rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={createMaterial}
                disabled={saving}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3">Code</th>
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Unit</th>
              <th className="p-3">Category</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-400" colSpan={5}>Loading…</td></tr>
            ) : materials.length === 0 ? (
              <tr><td className="p-4 text-gray-400" colSpan={5}>No materials yet.</td></tr>
            ) : (
              materials.map((m) => (
                <tr key={m._id} className="border-b border-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">{m.materialCode}</td>
                  <td className="p-3 text-gray-900">{m.materialName}</td>
                  <td className="p-3 text-gray-500">{m.materialType}</td>
                  <td className="p-3 text-gray-500">{m.stockUnit}</td>
                  <td className="p-3 text-gray-500">{m.categoryId?.name || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

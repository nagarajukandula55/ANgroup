"use client";

import { useEffect, useState } from "react";
import HsnSearchSelect from "@/components/shared/HsnSearchSelect";

const UNIT_OPTIONS = ["kg", "g", "l", "ml", "pcs", "pack", "box", "dozen"];
const MATERIAL_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "PACKAGING_MATERIAL", label: "Packaging Material" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "LABEL", label: "Label" },
  { value: "BOX", label: "Box" },
  { value: "SEMI_FINISHED", label: "Semi-Finished" },
  { value: "SERVICE", label: "Service" },
];
const GST_RATES = [0, 5, 12, 18, 28];

interface MaterialForm {
  materialName: string;
  materialType: string;
  categoryId: string;
  unit: string;
  hsnCode: string;
  gstRate: string;
  currentPrice: string;
}

const EMPTY_FORM: MaterialForm = {
  materialName: "", materialType: "RAW_MATERIAL", categoryId: "", unit: "",
  hsnCode: "", gstRate: "", currentPrice: "",
};

export default function VendorMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null); // null = closed, "new" or a material doc
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMaterials() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/materials");
      const data = await res.json();
      if (data.success) setMaterials(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    const res = await fetch("/api/vendor/material-categories");
    const data = await res.json();
    if (data.success) setCategories(data.data || []);
  }

  useEffect(() => {
    loadMaterials();
    loadCategories();
  }, []);

  function openNew() {
    setForm(EMPTY_FORM);
    setError(null);
    setEditing("new");
  }

  function openEdit(m: any) {
    setForm({
      materialName: m.materialName || "",
      materialType: m.materialType || "RAW_MATERIAL",
      categoryId: m.categoryId?._id || m.categoryId || "",
      unit: m.stockUnit || "",
      hsnCode: m.hsnCode || "",
      gstRate: m.gstRate !== undefined && m.gstRate !== null ? String(m.gstRate) : "",
      currentPrice: m.currentPrice ? String(m.currentPrice) : "",
    });
    setError(null);
    setEditing(m);
  }

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const res = await fetch("/api/vendor/material-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCategoryName.trim() }),
    });
    const data = await res.json();
    if (data.success) {
      await loadCategories();
      setForm((p) => ({ ...p, categoryId: data.data._id }));
      setNewCategoryName("");
      setAddingCategory(false);
    }
  }

  async function save() {
    setError(null);
    if (!form.materialName.trim() || !form.unit.trim()) {
      setError("Name and unit are required.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        materialName: form.materialName.trim(),
        materialType: form.materialType,
        categoryId: form.categoryId || undefined,
        unit: form.unit,
        hsnCode: form.hsnCode.trim() || undefined,
        gstRate: form.gstRate === "" ? undefined : Number(form.gstRate),
        currentPrice: form.currentPrice === "" ? 0 : Number(form.currentPrice),
      };
      const isNew = editing === "new";
      const res = await fetch(isNew ? "/api/vendor/materials" : `/api/vendor/materials/${editing._id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to save material");
        return;
      }
      setEditing(null);
      loadMaterials();
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
            Raw materials, packaging, and other BOM ingredients for your products — including current price, so
            product BOMs can pull cost from here instead of retyping it every time.
          </p>
        </div>
        <button
          onClick={openNew}
          className="shrink-0 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm"
        >
          + Add Material
        </button>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-xl p-5 space-y-3 my-8">
            <h2 className="font-semibold text-gray-900">{editing === "new" ? "Add Material" : "Edit Material"}</h2>
            {error && <p className="text-xs text-red-600">{error}</p>}

            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="Material name *"
              value={form.materialName}
              onChange={(e) => setForm((p) => ({ ...p, materialName: e.target.value }))}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="border rounded-lg p-2 text-sm"
                value={form.materialType}
                onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))}
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>

              <select
                className="border rounded-lg p-2 text-sm"
                value={form.unit}
                onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
              >
                <option value="">Unit *</option>
                {UNIT_OPTIONS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>

            <div>
              {!addingCategory ? (
                <div className="flex gap-2">
                  <select
                    className="flex-1 border rounded-lg p-2 text-sm"
                    value={form.categoryId}
                    onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                  >
                    <option value="">Category (optional — defaults to General)</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setAddingCategory(true)} className="px-2 border rounded-lg text-xs text-gray-600">
                    + New
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 border rounded-lg p-2 text-sm"
                    placeholder="New category name"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                  />
                  <button type="button" onClick={addCategory} className="px-2 border rounded-lg text-xs text-gray-600">Add</button>
                  <button type="button" onClick={() => setAddingCategory(false)} className="px-2 border rounded-lg text-xs text-gray-400">✕</button>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 pt-3">
              <label className="text-xs text-gray-500">Current price (₹ per {form.unit || "unit"})</label>
              <input
                type="number"
                min={0}
                className="w-full border rounded-lg p-2 text-sm mt-1"
                placeholder="0"
                value={form.currentPrice}
                onChange={(e) => setForm((p) => ({ ...p, currentPrice: e.target.value }))}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Used to auto-fill this material's rate when you add it to a product's BOM. Every change is logged
                so price history is kept.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs text-gray-500">HSN &amp; GST (optional — only needed if this material itself is separately invoiced; not required to just track its cost)</p>
              <HsnSearchSelect
                value={form.hsnCode}
                onChange={(hsnCode) => setForm((p) => ({ ...p, hsnCode }))}
                onSelect={(rate) => setForm((p) => ({ ...p, hsnCode: rate.hsnCode, gstRate: String(rate.gstRate) }))}
              />
              <select
                className="w-full border rounded-lg p-2 text-sm"
                value={form.gstRate}
                onChange={(e) => setForm((p) => ({ ...p, gstRate: e.target.value }))}
              >
                <option value="">GST rate — not set</option>
                {GST_RATES.map((r) => (
                  <option key={r} value={r}>{r}%</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-3 py-2 border rounded-lg text-sm">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
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
              <th className="p-3">Price</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>Loading…</td></tr>
            ) : materials.length === 0 ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>No materials yet.</td></tr>
            ) : (
              materials.map((m) => (
                <tr key={m._id} className="border-b border-gray-50">
                  <td className="p-3 font-mono text-xs text-gray-500">{m.materialCode}</td>
                  <td className="p-3 text-gray-900">{m.materialName}</td>
                  <td className="p-3 text-gray-500">{m.materialType}</td>
                  <td className="p-3 text-gray-500">{m.stockUnit}</td>
                  <td className="p-3 text-gray-500">{m.categoryId?.name || "—"}</td>
                  <td className="p-3 text-gray-700">{m.currentPrice ? `₹${m.currentPrice}/${m.stockUnit}` : "—"}</td>
                  <td className="p-3">
                    <button onClick={() => openEdit(m)} className="text-violet-600 text-xs font-medium">Edit</button>
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

"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Smartphone } from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";

interface Brand {
  _id: string;
  name: string;
  parentId?: string | null;
}

interface DeviceModelRow {
  _id: string;
  name: string;
  brandId: string;
  isActive: boolean;
}

export default function ModelsPage() {
  const { businessId } = useActiveBusinessId();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [models, setModels] = useState<DeviceModelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/brands?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []))
      .catch(() => {});
  }, [businessId]);

  const loadModels = useCallback(async () => {
    if (!businessId || !selectedBrandId) {
      setModels([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/device-models?businessId=${businessId}&brandId=${selectedBrandId}`);
      const d = await res.json();
      setModels(d.models || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedBrandId]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  async function addModel() {
    if (!newName.trim() || !businessId || !selectedBrandId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/device-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), brandId: selectedBrandId, businessId }),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setError(d.error || "Failed to add model");
        return;
      }
      setNewName("");
      loadModels();
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/device-models/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    loadModels();
  }

  async function deleteModel(id: string) {
    if (!confirm("Delete this model?")) return;
    await fetch(`/api/device-models/${id}`, { method: "DELETE" });
    loadModels();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Smartphone className="w-6 h-6" /> Device Models
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage the model list for each brand — powers the "Model" dropdown in appointment and
            workorder creation. Pick a brand below, then add its models.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Brand</label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
          >
            <option value="">Select a brand…</option>
            {brands.map((b) => (
              <option key={b._id} value={b._id}>
                {b.parentId ? `↳ ${b.name}` : b.name}
              </option>
            ))}
          </select>
        </div>

        {selectedBrandId && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            {error && (
              <div className="mb-3 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addModel()}
                placeholder="e.g. iPhone 13, Galaxy S21"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
              />
              <button
                onClick={addModel}
                disabled={adding || !newName.trim()}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : models.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No models added yet for this brand.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {models.map((m) => (
                  <div key={m._id} className="flex items-center justify-between py-2.5">
                    {editingId === m._id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(m._id)}
                          autoFocus
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500"
                        />
                        <button onClick={() => saveEdit(m._id)} className="text-xs text-cyan-700 hover:underline">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-800">{m.name}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingId(m._id);
                              setEditName(m.name);
                            }}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteModel(m._id)} className="text-gray-400 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

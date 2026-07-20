"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Layers } from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";
import { TreeSelect, type TreeSelectItem } from "@/components/shared/TreeSelect";
import { DEVICE_CATEGORIES, DEVICE_CATEGORY_LABELS, type DeviceCategory } from "@/core/catalog/deviceCategory";

interface Brand {
  _id: string;
  name: string;
  parentId?: string | null;
  category?: DeviceCategory | null;
  logoUrl?: string;
}

const CATEGORY_NODE_PREFIX = "cat:";

// Same Device Type > Brand tree builder as the Models page -- kept as a
// local copy rather than a shared import so each masters page can evolve
// its own tree independently, matching the existing convention.
function buildBrandTreeItems(brands: Brand[]): TreeSelectItem[] {
  const categoryNodes: TreeSelectItem[] = DEVICE_CATEGORIES.map((c) => ({
    _id: `${CATEGORY_NODE_PREFIX}${c}`,
    name: DEVICE_CATEGORY_LABELS[c],
    parentId: null,
  }));
  const brandNodes: TreeSelectItem[] = brands.map((b) => ({
    _id: b._id,
    name: b.name,
    parentId: b.parentId || (b.category ? `${CATEGORY_NODE_PREFIX}${b.category}` : null),
    logoUrl: b.logoUrl,
  }));
  return [...categoryNodes, ...brandNodes];
}

interface SeriesRow {
  _id: string;
  name: string;
  brandId: string;
  isActive: boolean;
}

export default function SeriesPage() {
  const { businessId } = useActiveBusinessId();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
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

  const loadSeries = useCallback(async () => {
    if (!businessId || !selectedBrandId) {
      setSeriesList([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/series?businessId=${businessId}&brandId=${selectedBrandId}`);
      const d = await res.json();
      setSeriesList(d.series || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedBrandId]);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  async function addSeries() {
    if (!newName.trim() || !businessId || !selectedBrandId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), brandId: selectedBrandId, businessId }),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setError(d.error || "Failed to add series");
        return;
      }
      setNewName("");
      loadSeries();
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) return;
    await fetch(`/api/series/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setEditingId(null);
    loadSeries();
  }

  async function deleteSeries(id: string) {
    if (!confirm("Delete this series?")) return;
    await fetch(`/api/series/${id}`, { method: "DELETE" });
    loadSeries();
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-[1800px] mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6" /> Series
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage a brand's product lines (e.g. Samsung's "Galaxy S", "Galaxy A") -- sits between
            Brand and Model. Pick a brand below, then add its series.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Brand</label>
          <TreeSelect
            items={buildBrandTreeItems(brands)}
            value={selectedBrandId}
            onChange={(id) => {
              if (id.startsWith(CATEGORY_NODE_PREFIX)) return;
              setSelectedBrandId(id);
            }}
            placeholder="Select a device type, then a brand…"
          />
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
                onKeyDown={(e) => e.key === "Enter" && addSeries()}
                placeholder="e.g. Galaxy S, Galaxy A, General"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-500"
              />
              <button
                onClick={addSeries}
                disabled={adding || !newName.trim()}
                className="px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            {loading ? (
              <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
            ) : seriesList.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No series added yet for this brand.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {seriesList.map((s) => (
                  <div key={s._id} className="flex items-center justify-between py-2.5">
                    {editingId === s._id ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && saveEdit(s._id)}
                          autoFocus
                          className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-gray-500"
                        />
                        <button onClick={() => saveEdit(s._id)} className="text-xs text-cyan-700 hover:underline">
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-sm text-gray-800">{s.name}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setEditingId(s._id);
                              setEditName(s.name);
                            }}
                            className="text-gray-400 hover:text-gray-700"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteSeries(s._id)} className="text-gray-400 hover:text-red-500">
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

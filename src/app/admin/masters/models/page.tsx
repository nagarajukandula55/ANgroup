"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, X, Smartphone } from "lucide-react";
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

// Composes the flat Brand list into a Device Type > Brand tree for
// TreeSelect: a synthetic root node per device category (not a real
// document -- id-prefixed "cat:" so selection can be ignored for these),
// with each real brand nested under its category (or left at the root if
// uncategorized, same as today -- no data loss for brands added before
// this field existed).
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

interface DeviceModelRow {
  _id: string;
  name: string;
  brandId: string;
  seriesId?: string;
  isActive: boolean;
}

interface SeriesRow {
  _id: string;
  name: string;
  brandId: string;
  isActive: boolean;
}

export default function ModelsPage() {
  const { businessId } = useActiveBusinessId();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
  const [selectedSeriesId, setSelectedSeriesId] = useState("");
  const [newSeriesName, setNewSeriesName] = useState("");
  const [addingSeries, setAddingSeries] = useState(false);
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

  const loadSeriesList = useCallback(async () => {
    if (!businessId || !selectedBrandId) {
      setSeriesList([]);
      setSelectedSeriesId("");
      return;
    }
    const res = await fetch(`/api/series?businessId=${businessId}&brandId=${selectedBrandId}`);
    const d = await res.json();
    const list: SeriesRow[] = d.series || [];
    setSeriesList(list);
    // If the brand has exactly one series ("General" for brands with no
    // real product line), auto-select it so single-series brands don't
    // force an extra click before you can add a model.
    setSelectedSeriesId((prev) => {
      if (prev && list.some((s) => s._id === prev)) return prev;
      return list.length === 1 ? list[0]._id : "";
    });
  }, [businessId, selectedBrandId]);

  useEffect(() => {
    loadSeriesList();
  }, [loadSeriesList]);

  const loadModels = useCallback(async () => {
    if (!businessId || !selectedBrandId || !selectedSeriesId) {
      setModels([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/device-models?businessId=${businessId}&brandId=${selectedBrandId}&seriesId=${selectedSeriesId}`
      );
      const d = await res.json();
      setModels(d.models || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, selectedBrandId, selectedSeriesId]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  async function addSeries() {
    if (!newSeriesName.trim() || !businessId || !selectedBrandId) return;
    setAddingSeries(true);
    setError("");
    try {
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSeriesName.trim(), brandId: selectedBrandId, businessId }),
      });
      const d = await res.json();
      if (!res.ok || d.error) {
        setError(d.error || "Failed to add series");
        return;
      }
      setNewSeriesName("");
      await loadSeriesList();
      setSelectedSeriesId(d.series._id);
    } finally {
      setAddingSeries(false);
    }
  }

  async function addModel() {
    if (!newName.trim() || !businessId || !selectedBrandId || !selectedSeriesId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/device-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), brandId: selectedBrandId, seriesId: selectedSeriesId, businessId }),
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
      <div className="max-w-[1800px] mx-auto px-6 py-10">
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
          <TreeSelect
            items={buildBrandTreeItems(brands)}
            value={selectedBrandId}
            onChange={(id) => {
              // Device Type nodes are synthetic (id-prefixed "cat:") -- for
              // expanding/browsing only, never a real Brand to select.
              if (id.startsWith(CATEGORY_NODE_PREFIX)) return;
              setSelectedBrandId(id);
            }}
            placeholder="Select a device type, then a brand…"
          />
        </div>

        {selectedBrandId && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Series</label>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {seriesList.map((s) => (
                <button
                  key={s._id}
                  onClick={() => setSelectedSeriesId(s._id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedSeriesId === s._id
                      ? "bg-gray-900 text-white border-gray-900"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {s.name}
                </button>
              ))}
              {seriesList.length === 0 && (
                <span className="text-xs text-gray-400">No series yet for this brand — add one below.</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={newSeriesName}
                onChange={(e) => setNewSeriesName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSeries()}
                placeholder="e.g. Galaxy S, Galaxy A, General"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2 text-sm text-gray-900 outline-none focus:border-gray-500"
              />
              <button
                onClick={addSeries}
                disabled={addingSeries || !newSeriesName.trim()}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Series
              </button>
            </div>
          </div>
        )}

        {selectedBrandId && selectedSeriesId && (
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

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  Ruler,
  AlertTriangle,
  Weight,
  Droplets,
  Hash,
  Square,
  Clock,
  Package,
} from "lucide-react";

interface Unit {
  _id: string;
  name: string;
  symbol: string;
  type: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const UNIT_TYPES = [
  { value: "length", label: "Length", icon: Ruler },
  { value: "weight", label: "Weight", icon: Weight },
  { value: "volume", label: "Volume", icon: Droplets },
  { value: "quantity", label: "Count / Quantity", icon: Hash },
  { value: "time", label: "Time", icon: Clock },
  { value: "other", label: "Other", icon: Package },
];

function typeIcon(type: string) {
  const found = UNIT_TYPES.find((t) => t.value === type);
  const Icon = found?.icon ?? Square;
  return <Icon size={13} />;
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    length: "text-blue-400 bg-blue-500/10",
    weight: "text-amber-400 bg-amber-500/10",
    volume: "text-cyan-400 bg-cyan-500/10",
    quantity: "text-emerald-400 bg-emerald-500/10",
    time: "text-purple-400 bg-purple-500/10",
    other: "text-zinc-400 bg-white/[0.04]",
  };
  const cls = map[type] ?? map.other;
  const found = UNIT_TYPES.find((t) => t.value === type);
  const label = found?.label ?? type;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {typeIcon(type)}
      {label}
    </span>
  );
}

interface FormState {
  name: string;
  symbol: string;
  type: string;
  description: string;
}

const DEFAULT_FORM: FormState = {
  name: "",
  symbol: "",
  type: "other",
  description: "",
};

export default function UnitsPage() {
  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editUnit, setEditUnit] = useState<Unit | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete state
  const [deleteUnit, setDeleteUnit] = useState<Unit | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUnits = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/masters/units?${params}`);
      const data = await res.json();
      if (data.success) setUnits(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, typeFilter]);

  useEffect(() => {
    fetchUnits();
  }, [fetchUnits]);

  function openAdd() {
    setEditUnit(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setShowModal(true);
  }

  function openEdit(unit: Unit) {
    setEditUnit(unit);
    setForm({
      name: unit.name,
      symbol: unit.symbol,
      type: unit.type ?? "other",
      description: unit.description ?? "",
    });
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditUnit(null);
    setForm(DEFAULT_FORM);
    setFormError("");
  }

  async function handleSave() {
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.symbol.trim()) { setFormError("Symbol is required."); return; }
    setFormError("");
    setSaving(true);
    try {
      if (editUnit) {
        const res = await fetch(`/api/masters/units/${editUnit._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form }),
        });
        const data = await res.json();
        if (!data.success && !data.data) {
          setFormError(data.error ?? "Failed to update unit.");
          return;
        }
      } else {
        const res = await fetch("/api/masters/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ businessId, ...form }),
        });
        const data = await res.json();
        if (!data.success && !data.data) {
          setFormError(data.error ?? "Failed to create unit.");
          return;
        }
      }
      closeModal();
      fetchUnits();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteUnit) return;
    setDeleting(true);
    try {
      await fetch(`/api/masters/units/${deleteUnit._id}`, { method: "DELETE" });
      setDeleteUnit(null);
      fetchUnits();
    } finally {
      setDeleting(false);
    }
  }

  const totalByType = UNIT_TYPES.map((t) => ({
    ...t,
    count: units.filter((u) => u.type === t.value).length,
  })).filter((t) => t.count > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Units of Measurement</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage measurement units used across inventory, orders, and products.
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100">
          <Plus size={15} />
          Add Unit
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-xs text-zinc-500 mb-1">Total Units</p>
          <p className="text-2xl font-semibold text-white">{units.length}</p>
        </div>
        {totalByType.slice(0, 3).map((t) => (
          <div key={t.value} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs text-zinc-500 mb-1">{t.label}</p>
            <p className="text-2xl font-semibold text-white">{t.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or symbol…"
            className="w-full pl-9 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none min-w-[160px]"
        >
          <option value="">All Types</option>
          {UNIT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.01]">
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Name</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Symbol</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Type</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium hidden md:table-cell">Description</th>
              <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Status</th>
              <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-12 text-center text-zinc-500">Loading…</div>
                </td>
              </tr>
            ) : units.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-12 text-center">
                    <Ruler size={32} className="text-zinc-700 mx-auto mb-3" />
                    <p className="text-zinc-500 text-sm mb-4">No units found</p>
                    <button
                      onClick={openAdd}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 mx-auto"
                    >
                      <Plus size={14} /> Add your first unit
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              units.map((unit) => (
                <tr key={unit._id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{unit.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono font-semibold text-zinc-300 bg-white/[0.06] px-2 py-0.5 rounded">
                      {unit.symbol}
                    </span>
                  </td>
                  <td className="px-4 py-3">{typeBadge(unit.type ?? "other")}</td>
                  <td className="px-4 py-3 text-xs text-zinc-500 hidden md:table-cell max-w-[220px] truncate">
                    {unit.description || <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {unit.isActive ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10">
                        Active
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-zinc-400 bg-white/[0.04]">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(unit)}
                        className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => setDeleteUnit(unit)}
                        className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">
                {editUnit ? "Edit Unit" : "Add Unit"}
              </h2>
              <button onClick={closeModal} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  <AlertTriangle size={13} />
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Kilogram"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Symbol *</label>
                  <input
                    value={form.symbol}
                    onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                    placeholder="e.g. kg"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none"
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description…"
                  rows={3}
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50"
              >
                {saving ? "Saving…" : editUnit ? "Save Changes" : "Add Unit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-sm font-semibold text-white">Delete Unit</h2>
              <button onClick={() => setDeleteUnit(null)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 mx-auto">
                <AlertTriangle size={22} className="text-red-400" />
              </div>
              <p className="text-sm text-zinc-300 text-center">
                Are you sure you want to delete{" "}
                <span className="text-white font-semibold">{deleteUnit.name}</span>{" "}
                (<span className="font-mono text-xs">{deleteUnit.symbol}</span>)?
              </p>
              <p className="text-xs text-zinc-500 text-center">
                This action cannot be undone. The unit will be removed from your masters.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={() => setDeleteUnit(null)}
                className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-2 text-xs text-red-400 border border-red-500/20 rounded-xl hover:bg-red-500/10 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete Unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

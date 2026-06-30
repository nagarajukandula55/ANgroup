"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  X,
  ChevronDown,
  Layers,
  Calendar,
  Hash,
  Warehouse,
  Box,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────── */
interface PopulatedItem {
  _id: string;
  name: string;
  sku?: string;
  unit?: string;
}

interface InventoryLot {
  _id: string;
  lotNumber: string;
  batchNumber?: string;
  itemId: PopulatedItem | null;
  quantity: number;
  remainingQuantity: number;
  unitCost: number;
  totalCost: number;
  expiryDate?: string;
  manufacturedDate?: string;
  receivedDate: string;
  supplierId?: { _id: string; name?: string } | null;
  status: "ACTIVE" | "EXHAUSTED" | "EXPIRED" | "QUARANTINE";
  notes?: string;
  createdAt: string;
}

interface InventoryItem {
  _id: string;
  name: string;
  sku?: string;
  unit?: string;
}

interface FormState {
  itemId: string;
  itemSearch: string;
  lotNumber: string;
  batchNumber: string;
  quantity: string;
  unitCost: string;
  expiryDate: string;
  manufacturedDate: string;
  receivedDate: string;
  notes: string;
}

/* ─── Helpers ────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

function daysUntilExpiry(date?: string): number | null {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ date }: { date?: string }) {
  if (!date) return <span className="text-xs text-zinc-600">—</span>;
  const days = daysUntilExpiry(date)!;
  const label = new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (days < 0)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-red-400 bg-red-500/10">
        Expired {Math.abs(days)}d ago
      </span>
    );
  if (days <= 30)
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10">
        {label} · {days}d left
      </span>
    );
  return <span className="text-xs text-zinc-400">{label}</span>;
}

function StatusBadge({ status }: { status: InventoryLot["status"] }) {
  const map: Record<InventoryLot["status"], string> = {
    ACTIVE:
      "text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10",
    EXHAUSTED:
      "text-xs font-medium px-2 py-0.5 rounded-full text-zinc-400 bg-white/[0.04]",
    EXPIRED:
      "text-xs font-medium px-2 py-0.5 rounded-full text-red-400 bg-red-500/10",
    QUARANTINE:
      "text-xs font-medium px-2 py-0.5 rounded-full text-amber-400 bg-amber-500/10",
  };
  return <span className={map[status]}>{status}</span>;
}

const EMPTY_FORM: FormState = {
  itemId: "",
  itemSearch: "",
  lotNumber: "",
  batchNumber: "",
  quantity: "",
  unitCost: "",
  expiryDate: "",
  manufacturedDate: "",
  receivedDate: new Date().toISOString().split("T")[0],
  notes: "",
};

/* ─── Page ───────────────────────────────────────────────── */
export default function InventoryLotsPage() {
  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [filterItemId, setFilterItemId] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  // Form
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [itemDropdown, setItemDropdown] = useState(false);

  /* ─── Fetch ─────────────────────────────────────────────── */
  const fetchLots = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const p = new URLSearchParams({ businessId });
      if (filterItemId) p.set("itemId", filterItemId);
      if (filterStatus) p.set("status", filterStatus);
      const res = await fetch(`/api/inventory/lots?${p}`);
      const data = await res.json();
      if (data.success) setLots(data.data || []);
    } finally {
      setLoading(false);
    }
  }, [businessId, filterItemId, filterStatus]);

  const fetchItems = useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await fetch(
        `/api/inventory/items?businessId=${businessId}`
      );
      const data = await res.json();
      if (data.success) setItems(data.data || []);
    } catch {
      // non-critical
    }
  }, [businessId]);

  useEffect(() => {
    fetchLots();
  }, [fetchLots]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  /* ─── Derived stats ─────────────────────────────────────── */
  const now = Date.now();
  const in30 = now + 30 * 24 * 60 * 60 * 1000;

  const totalLots = lots.length;
  const activeLots = lots.filter((l) => l.status === "ACTIVE").length;
  const expiringSoon = lots.filter(
    (l) =>
      l.expiryDate &&
      new Date(l.expiryDate).getTime() > now &&
      new Date(l.expiryDate).getTime() <= in30
  ).length;
  const expiredLots = lots.filter(
    (l) =>
      l.status === "EXPIRED" ||
      (l.expiryDate && new Date(l.expiryDate).getTime() < now)
  ).length;

  /* ─── Client-side filtering ──────────────────────────────── */
  const filtered = lots.filter((l) => {
    const itemName = l.itemId?.name?.toLowerCase() ?? "";
    const lotNum = l.lotNumber.toLowerCase();
    const batch = (l.batchNumber ?? "").toLowerCase();
    const q = search.toLowerCase();

    if (q && !itemName.includes(q) && !lotNum.includes(q) && !batch.includes(q))
      return false;

    if (filterExpiringSoon) {
      if (!l.expiryDate) return false;
      const exp = new Date(l.expiryDate).getTime();
      if (exp <= now || exp > in30) return false;
    }

    return true;
  });

  /* ─── Form helpers ───────────────────────────────────────── */
  const filteredItemOptions = items.filter(
    (it) =>
      !form.itemSearch ||
      it.name.toLowerCase().includes(form.itemSearch.toLowerCase()) ||
      (it.sku ?? "").toLowerCase().includes(form.itemSearch.toLowerCase())
  );

  function selectItem(item: InventoryItem) {
    setForm((f) => ({ ...f, itemId: item._id, itemSearch: item.name }));
    setItemDropdown(false);
  }

  function openModal() {
    setForm(EMPTY_FORM);
    setError("");
    setShowModal(true);
  }

  async function saveLot() {
    if (!form.itemId) return setError("Please select an inventory item.");
    if (!form.lotNumber.trim()) return setError("Lot number is required.");
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      return setError("Enter a valid quantity.");
    if (!form.unitCost || isNaN(Number(form.unitCost)) || Number(form.unitCost) < 0)
      return setError("Enter a valid unit cost.");

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/inventory/lots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          itemId: form.itemId,
          lotNumber: form.lotNumber.trim(),
          batchNumber: form.batchNumber.trim() || undefined,
          quantity: Number(form.quantity),
          unitCost: Number(form.unitCost),
          expiryDate: form.expiryDate || undefined,
          manufacturedDate: form.manufacturedDate || undefined,
          receivedDate: form.receivedDate || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        fetchLots();
      } else {
        setError(data.error || "Failed to create lot.");
      }
    } finally {
      setSaving(false);
    }
  }

  /* ─── Render ─────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Inventory Lots</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Track batch lots, expiry dates and supplier batches
          </p>
        </div>
        <button onClick={openModal} className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100">
          <Plus size={15} /> Add Lot
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Lots",
            value: totalLots,
            icon: <Layers size={16} className="text-zinc-400" />,
            cls: "",
          },
          {
            label: "Active Lots",
            value: activeLots,
            icon: <CheckCircle size={16} className="text-emerald-400" />,
            cls: "text-emerald-400",
          },
          {
            label: "Expiring Soon",
            value: expiringSoon,
            icon: <Clock size={16} className="text-amber-400" />,
            cls: "text-amber-400",
          },
          {
            label: "Expired",
            value: expiredLots,
            icon: <XCircle size={16} className="text-red-400" />,
            cls: "text-red-400",
          },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 mb-2">
              {s.icon}
              <span className="text-xs text-zinc-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-semibold ${s.cls || "text-white"}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lots, items, batches…"
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
          />
        </div>

        {/* Filter by item */}
        <select
          value={filterItemId}
          onChange={(e) => setFilterItemId(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">All Items</option>
          {items.map((it) => (
            <option key={it._id} value={it._id}>
              {it.name}
            </option>
          ))}
        </select>

        {/* Filter by status */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-zinc-300 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="EXHAUSTED">Exhausted</option>
          <option value="EXPIRED">Expired</option>
          <option value="QUARANTINE">Quarantine</option>
        </select>

        {/* Expiring soon toggle */}
        <button
          onClick={() => setFilterExpiringSoon((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-xl border transition-colors ${
            filterExpiringSoon
              ? "text-amber-400 border-amber-500/30 bg-amber-500/10"
              : "text-zinc-400 border-white/[0.08] hover:text-white hover:border-white/20"
          }`}
        >
          <AlertTriangle size={12} />
          Expiring Soon
        </button>

        {/* Clear filters */}
        {(search || filterItemId || filterStatus || filterExpiringSoon) && (
          <button
            onClick={() => {
              setSearch("");
              setFilterItemId("");
              setFilterStatus("");
              setFilterExpiringSoon(false);
            }}
            className="flex items-center gap-1 px-3 py-2 text-xs text-zinc-500 hover:text-white rounded-xl border border-white/[0.06] hover:border-white/20"
          >
            <X size={11} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-zinc-500">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Package size={32} className="text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 mb-4">
              {lots.length === 0
                ? "No lots recorded yet. Add your first inventory lot."
                : "No lots match the current filters."}
            </p>
            {lots.length === 0 && (
              <button
                onClick={openModal}
                className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium"
              >
                Add Lot
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                {[
                  "Lot Number",
                  "Item",
                  "Qty / Remaining",
                  "Unit Cost",
                  "Expiry Date",
                  "Supplier Batch",
                  "Received",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs text-zinc-500 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filtered.map((lot) => {
                const days = daysUntilExpiry(lot.expiryDate);
                const rowWarning =
                  lot.expiryDate &&
                  days !== null &&
                  (days < 0 || days <= 30);

                return (
                  <tr
                    key={lot._id}
                    className={`hover:bg-white/[0.02] transition-colors ${rowWarning ? "bg-amber-500/[0.02]" : ""}`}
                  >
                    {/* Lot Number */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {rowWarning && (
                          <AlertTriangle
                            size={12}
                            className={
                              days !== null && days < 0
                                ? "text-red-400"
                                : "text-amber-400"
                            }
                          />
                        )}
                        <span className="font-mono text-sm text-white font-medium">
                          {lot.lotNumber}
                        </span>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="px-4 py-3">
                      {lot.itemId ? (
                        <div>
                          <p className="text-white font-medium">
                            {lot.itemId.name}
                          </p>
                          {lot.itemId.sku && (
                            <p className="text-xs text-zinc-500 font-mono">
                              {lot.itemId.sku}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="px-4 py-3">
                      <p className="text-white font-semibold">
                        {lot.remainingQuantity.toLocaleString("en-IN")}
                        <span className="text-xs text-zinc-500 font-normal ml-1">
                          {lot.itemId?.unit || ""}
                        </span>
                      </p>
                      {lot.remainingQuantity !== lot.quantity && (
                        <p className="text-xs text-zinc-600">
                          of {lot.quantity.toLocaleString("en-IN")} original
                        </p>
                      )}
                    </td>

                    {/* Unit Cost */}
                    <td className="px-4 py-3 text-zinc-300">
                      {fmt(lot.unitCost)}
                    </td>

                    {/* Expiry */}
                    <td className="px-4 py-3">
                      <ExpiryBadge date={lot.expiryDate} />
                    </td>

                    {/* Supplier Batch */}
                    <td className="px-4 py-3">
                      {lot.batchNumber ? (
                        <span className="font-mono text-xs text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full">
                          {lot.batchNumber}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>

                    {/* Received */}
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {new Date(lot.receivedDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <StatusBadge status={lot.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Results count */}
      {!loading && filtered.length > 0 && (
        <p className="text-xs text-zinc-600 text-right">
          Showing {filtered.length} of {lots.length} lots
        </p>
      )}

      {/* ─── Add Lot Modal ─────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex justify-between items-center">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Layers size={16} /> Add Inventory Lot
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              {/* Item search */}
              <div className="relative">
                <label className="text-xs text-zinc-500 block mb-1">
                  Inventory Item *
                </label>
                <div className="relative">
                  <Package
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    value={form.itemSearch}
                    onChange={(e) => {
                      setForm((f) => ({
                        ...f,
                        itemSearch: e.target.value,
                        itemId: "",
                      }));
                      setItemDropdown(true);
                    }}
                    onFocus={() => setItemDropdown(true)}
                    placeholder="Search item name or SKU…"
                    className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                  {form.itemId && (
                    <CheckCircle
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-400"
                    />
                  )}
                </div>
                {itemDropdown && filteredItemOptions.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/[0.08] rounded-lg overflow-hidden shadow-xl max-h-44 overflow-y-auto">
                    {filteredItemOptions.slice(0, 15).map((it) => (
                      <button
                        key={it._id}
                        onClick={() => selectItem(it)}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-white/[0.06] flex items-center justify-between"
                      >
                        <span>{it.name}</span>
                        {it.sku && (
                          <span className="text-xs text-zinc-600 font-mono">
                            {it.sku}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                {itemDropdown && (
                  <div
                    className="fixed inset-0 z-[5]"
                    onClick={() => setItemDropdown(false)}
                  />
                )}
              </div>

              {/* Lot Number + Batch Number */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Lot Number *
                  </label>
                  <div className="relative">
                    <Hash
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      value={form.lotNumber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, lotNumber: e.target.value }))
                      }
                      placeholder="e.g. LOT-2024-001"
                      className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Supplier Batch #
                  </label>
                  <div className="relative">
                    <Box
                      size={13}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    />
                    <input
                      value={form.batchNumber}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, batchNumber: e.target.value }))
                      }
                      placeholder="Supplier's batch code"
                      className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Quantity + Unit Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, quantity: e.target.value }))
                    }
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Unit Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, unitCost: e.target.value }))
                    }
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>

              {/* Total cost preview */}
              {form.quantity && form.unitCost && (
                <div className="px-3 py-2 bg-white/[0.02] border border-white/[0.04] rounded-lg flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Total Cost</span>
                  <span className="text-sm font-semibold text-white">
                    {fmt(
                      (parseFloat(form.quantity) || 0) *
                        (parseFloat(form.unitCost) || 0)
                    )}
                  </span>
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    value={form.receivedDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, receivedDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Manufactured Date
                  </label>
                  <input
                    type="date"
                    value={form.manufacturedDate}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        manufacturedDate: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, expiryDate: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>

              {/* Expiry warning preview */}
              {form.expiryDate && (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-zinc-500" />
                  <ExpiryBadge date={form.expiryDate} />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="text-xs text-zinc-500 block mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Optional notes about this lot…"
                  className="w-full px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveLot}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-black/20 border-t-black rounded-full" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Plus size={14} /> Add Lot
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

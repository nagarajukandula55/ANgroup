"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  PackagePlus,
  PackageMinus,
  Package,
  CheckCircle,
} from "lucide-react";
import Link from "next/link";

type AdjustmentType = "ADD" | "REMOVE" | "SET";

interface InventoryItem {
  _id: string;
  name: string;
  sku?: string;
  quantity: number;
  unit?: string;
  category?: string;
}

export default function NewStockAdjustmentPage() {
  const router = useRouter();
  const businessId =
    typeof window !== "undefined" ? localStorage.getItem("businessId") : null;

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    adjustmentType: "ADD" as AdjustmentType,
    quantity: "",
    reason: "",
    notes: "",
    warehouse: "",
    date: new Date().toISOString().slice(0, 10),
  });

  // Fetch inventory items
  const fetchItems = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/items?businessId=${businessId}&limit=500`
      );
      const json = await res.json();
      if (json.success) setInventoryItems(json.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = inventoryItems.filter(
    (it) =>
      !itemSearch ||
      it.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (it.sku || "").toLowerCase().includes(itemSearch.toLowerCase()) ||
      (it.category || "").toLowerCase().includes(itemSearch.toLowerCase())
  );

  const newQuantity = selectedItem
    ? form.adjustmentType === "ADD"
      ? (selectedItem.quantity ?? 0) + Number(form.quantity || 0)
      : form.adjustmentType === "REMOVE"
      ? Math.max(0, (selectedItem.quantity ?? 0) - Number(form.quantity || 0))
      : Number(form.quantity || 0)
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!selectedItem) {
      setError("Please select an inventory item.");
      return;
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/stock/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          inventoryItemId: selectedItem._id,
          adjustmentType: form.adjustmentType,
          quantity: Number(form.quantity),
          reason: form.reason || undefined,
          notes: form.notes || undefined,
          warehouse: form.warehouse || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to create");
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">
            Adjustment Created
          </h2>
          <p className="text-sm text-zinc-500 mb-6">
            Stock adjustment has been recorded successfully.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setSelectedItem(null);
                setItemSearch("");
                setForm({
                  adjustmentType: "ADD",
                  quantity: "",
                  reason: "",
                  notes: "",
                  warehouse: "",
                  date: new Date().toISOString().slice(0, 10),
                });
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100"
            >
              <Plus size={14} />
              New Adjustment
            </button>
            <Link
              href="/admin/stock-adjustments"
              className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20 flex items-center"
            >
              View All
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/stock-adjustments"
          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white">
            New Stock Adjustment
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Record an inventory quantity change
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
          <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Item Selection */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
          <h3 className="text-sm font-medium text-white">Select Item</h3>

          {selectedItem ? (
            <div className="flex items-center justify-between p-4 rounded-xl border border-white/20 bg-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Package size={18} className="text-zinc-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    {selectedItem.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {selectedItem.sku && `SKU: ${selectedItem.sku} · `}
                    Current stock:{" "}
                    <span className="text-zinc-300">
                      {selectedItem.quantity ?? 0}
                    </span>{" "}
                    {selectedItem.unit || "units"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedItem(null);
                  setItemSearch("");
                }}
                className="text-xs text-zinc-500 hover:text-white border border-white/[0.08] px-3 py-1.5 rounded-lg hover:border-white/20 transition-colors"
              >
                Change
              </button>
            </div>
          ) : (
            <div>
              <div className="relative mb-3">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                />
                <input
                  type="text"
                  placeholder="Search by name, SKU, or category..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
                />
              </div>
              {loading ? (
                <p className="text-xs text-zinc-500 text-center py-4">
                  Loading items…
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-lg border border-white/[0.06] divide-y divide-white/[0.04]">
                  {(itemSearch ? filteredItems : inventoryItems)
                    .slice(0, 20)
                    .map((it) => (
                      <button
                        key={it._id}
                        type="button"
                        onClick={() => {
                          setSelectedItem(it);
                          setItemSearch("");
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm text-white group-hover:text-white">
                            {it.name}
                          </p>
                          <p className="text-xs text-zinc-600">
                            {it.sku && `${it.sku} · `}
                            {it.category && `${it.category} · `}
                            Stock: {it.quantity ?? 0}
                          </p>
                        </div>
                        <span className="text-xs text-zinc-600 group-hover:text-zinc-400">
                          Select →
                        </span>
                      </button>
                    ))}
                  {!itemSearch && inventoryItems.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      No inventory items found
                    </p>
                  )}
                  {itemSearch && filteredItems.length === 0 && (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      No items match your search
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Adjustment Details */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
          <h3 className="text-sm font-medium text-white">Adjustment Details</h3>

          {/* Type */}
          <div>
            <label className="text-xs text-zinc-500 block mb-2">
              Adjustment Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, adjustmentType: "ADD" }))
                }
                className={`py-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                  form.adjustmentType === "ADD"
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                }`}
              >
                <PackagePlus size={18} />
                Add (IN)
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, adjustmentType: "REMOVE" }))
                }
                className={`py-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                  form.adjustmentType === "REMOVE"
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                }`}
              >
                <PackageMinus size={18} />
                Remove (OUT)
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, adjustmentType: "SET" }))
                }
                className={`py-3 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-1.5 ${
                  form.adjustmentType === "SET"
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-500 hover:border-white/20 hover:text-zinc-300"
                }`}
              >
                <Package size={18} />
                Correct (SET)
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Quantity <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={
                form.adjustmentType === "SET"
                  ? "Enter absolute quantity to set"
                  : "Enter quantity to adjust"
              }
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
              required
            />
            {selectedItem && form.quantity && Number(form.quantity) > 0 && (
              <div className="mt-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-between">
                <span className="text-xs text-zinc-500">Resulting stock:</span>
                <span
                  className={`text-sm font-medium ${
                    newQuantity > (selectedItem.quantity ?? 0)
                      ? "text-emerald-400"
                      : newQuantity < (selectedItem.quantity ?? 0)
                      ? "text-red-400"
                      : "text-blue-400"
                  }`}
                >
                  {selectedItem.quantity ?? 0} → {newQuantity}{" "}
                  {selectedItem.unit || "units"}
                </span>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Reason</label>
            <input
              type="text"
              placeholder="e.g. Physical count correction, damaged goods, supplier return..."
              value={form.reason}
              onChange={(e) =>
                setForm((f) => ({ ...f, reason: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Warehouse */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Warehouse / Location
            </label>
            <input
              type="text"
              placeholder="e.g. Main Warehouse, Store Room A..."
              value={form.warehouse}
              onChange={(e) =>
                setForm((f) => ({ ...f, warehouse: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Additional Notes
            </label>
            <textarea
              rows={3}
              placeholder="Any additional context, reference numbers, or remarks..."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/20 resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Date</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) =>
                setForm((f) => ({ ...f, date: e.target.value }))
              }
              className="w-full px-3 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-white/20"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/stock-adjustments"
            className="px-3 py-2 text-xs text-zinc-400 border border-white/[0.08] rounded-xl hover:text-white hover:border-white/20"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || !selectedItem}
            className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-xl text-sm font-medium hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus size={14} />
                Create Adjustment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

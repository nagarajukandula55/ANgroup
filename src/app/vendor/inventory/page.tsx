"use client";

/**
 * Vendor Inventory — shows current stock (NativeProduct.stock, the same
 * field the storefront reads for availability) for every one of the
 * vendor's own approved products, and lets them bring stock IN via a
 * numbered, auditable Stock Adjustment. This is the legal path referenced
 * by order confirmation's stock gate: a vendor short on stock uses
 * "Inbound" here, then retries confirming the order.
 */

import { useEffect, useState } from "react";
import { Package, Plus, X, Loader2, History } from "lucide-react";
import ExportCsvButton from "@/components/shared/ExportCsvButton";

interface Product {
  _id: string;
  name: string;
  sku?: string;
  stock: number;
  unit?: string;
}

interface Adjustment {
  _id: string;
  adjustmentNumber: string;
  productId: { _id: string; name?: string; sku?: string } | string;
  type: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  createdAt: string;
}

const ADJUSTMENT_TYPES = [
  { value: "INBOUND", label: "Inbound — new stock received" },
  { value: "RETURN", label: "Return — customer returned units" },
  { value: "CORRECTION", label: "Correction — count was wrong" },
  { value: "DAMAGED", label: "Damaged — remove unsellable units" },
];

export default function VendorInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const [showForm, setShowForm] = useState<Product | null>(null);
  const [type, setType] = useState("INBOUND");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [catalogRes, histRes] = await Promise.all([
        fetch("/api/vendor/catalog"),
        fetch("/api/vendor/stock-adjustments"),
      ]);
      const catalogData = await catalogRes.json();
      const histData = await histRes.json();
      setHistory(histData.adjustments || []);
      setProducts(
        (catalogData.products || []).map((p: any) => ({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          stock: p.stock || 0,
          unit: p.unit,
        }))
      );
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitAdjustment() {
    if (!showForm) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: showForm._id, type, quantity, reason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to save adjustment");
      setShowForm(null);
      setQuantity(1);
      setReason("");
      setType("INBOUND");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-sm text-gray-500">
            Stock per product — bring stock in via Inbound before confirming orders that need it.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory((s) => !s)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <History className="w-4 h-4" /> {showHistory ? "Hide" : "Show"} Adjustment History
          </button>
          <ExportCsvButton
            filename="inventory"
            rows={products}
            columns={[
              { header: "Product", value: (r: Product) => r.name },
              { header: "SKU", value: (r: Product) => r.sku },
              { header: "Stock", value: (r: Product) => r.stock },
              { header: "Unit", value: (r: Product) => r.unit },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">SKU</th>
                <th className="p-3 text-right">Stock</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No products yet</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p._id} className="border-b">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 font-mono text-xs text-gray-500">{p.sku || "—"}</td>
                    <td className="p-3 text-right">{p.stock} {p.unit}</td>
                    <td className="p-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.stock > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {p.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setShowForm(p)}
                        className="flex items-center gap-1 mx-auto rounded border px-2 py-1 text-xs hover:bg-gray-50"
                      >
                        <Plus className="w-3 h-3" /> Adjust
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && (
        <div className="rounded-xl border overflow-auto">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold">Adjustment History</h2>
            <ExportCsvButton
              filename="stock-adjustments"
              rows={history}
              columns={[
                { header: "Adjustment #", value: (r: Adjustment) => r.adjustmentNumber },
                { header: "Product", value: (r: Adjustment) => typeof r.productId === "object" ? r.productId.name : r.productId },
                { header: "Type", value: (r: Adjustment) => r.type },
                { header: "Quantity", value: (r: Adjustment) => r.quantity },
                { header: "Before", value: (r: Adjustment) => r.previousStock },
                { header: "After", value: (r: Adjustment) => r.newStock },
                { header: "Reason", value: (r: Adjustment) => r.reason },
                { header: "Date", value: (r: Adjustment) => new Date(r.createdAt).toLocaleString("en-IN") },
              ]}
            />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-xs text-gray-400">
                <th className="p-3 text-left">Adjustment #</th>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-right">Qty</th>
                <th className="p-3 text-right">Before → After</th>
                <th className="p-3 text-left">Reason</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={7} className="p-6 text-center text-gray-400">No adjustments yet</td></tr>
              ) : (
                history.map((h) => (
                  <tr key={h._id} className="border-b">
                    <td className="p-3 font-mono text-xs">{h.adjustmentNumber}</td>
                    <td className="p-3">{typeof h.productId === "object" ? h.productId.name : ""}</td>
                    <td className="p-3">{h.type}</td>
                    <td className="p-3 text-right">{h.quantity}</td>
                    <td className="p-3 text-right">{h.previousStock} → {h.newStock}</td>
                    <td className="p-3 text-gray-500">{h.reason || "—"}</td>
                    <td className="p-3 text-gray-500">{new Date(h.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Stock Adjustment</h3>
              <button onClick={() => setShowForm(null)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              <Package className="w-3 h-3 inline mr-1" /> {showForm.name} — current stock: <strong>{showForm.stock}</strong>
            </p>
            {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-md">
                  {ADJUSTMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full px-3 py-2 text-sm border rounded-md" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. New batch from supplier" className="w-full px-3 py-2 text-sm border rounded-md" />
              </div>
            </div>
            <button
              onClick={submitAdjustment}
              disabled={saving}
              className="w-full mt-5 py-2 rounded-md bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Adjustment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

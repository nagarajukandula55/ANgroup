"use client";

/**
 * Offline Sale — a vendor selling directly to a walk-in/offline customer,
 * raising a real GST invoice for it (not routed through the Native
 * storefront). Deducts the same stock online orders deduct, and requires a
 * serial number per unit sold, per explicit requirement.
 */

import { useEffect, useState } from "react";
import { Plus, X, Loader2, ShoppingBag } from "lucide-react";
import ExportCsvButton from "@/components/shared/ExportCsvButton";

interface Product {
  _id: string;
  name: string;
  sku?: string;
  stock: number;
  basePrice?: number;
  unit?: string;
}

interface Line {
  productId: string;
  quantity: number;
  unitPrice: number;
  serials: string; // comma-separated in the UI, split to array on submit
}

interface OfflineInvoice {
  _id: string;
  invoiceNumber: string;
  customer: { name: string; phone: string };
  grandTotal: number;
  status: string;
  createdAt: string;
}

export default function VendorOfflineSalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<OfflineInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", gstin: "" });
  const [lines, setLines] = useState<Line[]>([{ productId: "", quantity: 1, unitPrice: 0, serials: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [catalogRes, invRes] = await Promise.all([
        fetch("/api/vendor/catalog"),
        fetch("/api/vendor/offline-sales"),
      ]);
      const catalogData = await catalogRes.json();
      const invData = await invRes.json();
      setProducts(catalogData.products || []);
      setInvoices(invData.invoices || []);
    } catch {
      /* leave empty */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1, unitPrice: 0, serials: "" }]);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== index) return l;
        const updated = { ...l, ...patch };
        if (patch.productId) {
          const p = products.find((pr) => pr._id === patch.productId);
          if (p) updated.unitPrice = p.basePrice || 0;
        }
        return updated;
      })
    );
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function submit() {
    setError(null);
    setSaving(true);
    try {
      const payload = {
        customer,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          serialNumbers: l.serials.split(",").map((s) => s.trim()).filter(Boolean),
        })),
      };
      const res = await fetch("/api/vendor/offline-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to create offline sale");
      setLastInvoice(data.invoice.invoiceNumber);
      setShowForm(false);
      setCustomer({ name: "", phone: "", email: "", address: "", gstin: "" });
      setLines([{ productId: "", quantity: 1, unitPrice: 0, serials: "" }]);
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
          <h1 className="text-2xl font-bold">Offline Sales</h1>
          <p className="text-sm text-gray-500">Sell directly to a walk-in customer and raise a GST invoice.</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename="offline-sales"
            rows={invoices}
            columns={[
              { header: "Invoice #", value: (r: OfflineInvoice) => r.invoiceNumber },
              { header: "Customer", value: (r: OfflineInvoice) => r.customer?.name },
              { header: "Phone", value: (r: OfflineInvoice) => r.customer?.phone },
              { header: "Total", value: (r: OfflineInvoice) => r.grandTotal },
              { header: "Status", value: (r: OfflineInvoice) => r.status },
              { header: "Date", value: (r: OfflineInvoice) => new Date(r.createdAt).toLocaleString("en-IN") },
            ]}
          />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-white hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Offline Sale
          </button>
        </div>
      </div>

      {lastInvoice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Invoice <strong>{lastInvoice}</strong> created.{" "}
          <a href={`/admin/crm/invoices/${lastInvoice}`} className="underline">View / Print</a>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
      ) : (
        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="p-3 text-left">Invoice #</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">No offline sales yet</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv._id} className="border-b">
                    <td className="p-3 font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customer?.name} <span className="text-gray-400">· {inv.customer?.phone}</span></td>
                    <td className="p-3 text-right">₹{inv.grandTotal?.toLocaleString("en-IN")}</td>
                    <td className="p-3 text-center"><span className="rounded-full px-2 py-0.5 text-xs bg-gray-100">{inv.status}</span></td>
                    <td className="p-3 text-gray-500">{new Date(inv.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold flex items-center gap-2"><ShoppingBag className="w-4 h-4" /> New Offline Sale</h3>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
            </div>
            {error && <p className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 rounded p-2">{error}</p>}

            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Customer</h4>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <input placeholder="Name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} className="px-3 py-2 text-sm border rounded-md" />
              <input placeholder="Phone *" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} className="px-3 py-2 text-sm border rounded-md" />
              <input placeholder="Email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} className="px-3 py-2 text-sm border rounded-md" />
              <input placeholder="GSTIN (optional — makes this a B2B invoice)" value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} className="px-3 py-2 text-sm border rounded-md" />
              <input placeholder="Address" value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} className="col-span-2 px-3 py-2 text-sm border rounded-md" />
            </div>

            <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Products</h4>
            <div className="space-y-3 mb-3">
              {lines.map((line, i) => {
                const product = products.find((p) => p._id === line.productId);
                return (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex gap-2">
                      <select
                        value={line.productId}
                        onChange={(e) => updateLine(i, { productId: e.target.value })}
                        className="flex-1 px-3 py-2 text-sm border rounded-md"
                      >
                        <option value="">Select product…</option>
                        {products.map((p) => (
                          <option key={p._id} value={p._id}>{p.name} ({p.stock} in stock)</option>
                        ))}
                      </select>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="text-red-500"><X className="w-4 h-4" /></button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={1}
                        placeholder="Quantity"
                        value={line.quantity}
                        onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })}
                        className="px-3 py-2 text-sm border rounded-md"
                      />
                      <input
                        type="number"
                        placeholder="Unit Price"
                        value={line.unitPrice}
                        onChange={(e) => updateLine(i, { unitPrice: Number(e.target.value) })}
                        className="px-3 py-2 text-sm border rounded-md"
                      />
                    </div>
                    <input
                      placeholder={`Serial numbers, comma-separated — exactly ${line.quantity} required`}
                      value={line.serials}
                      onChange={(e) => updateLine(i, { serials: e.target.value })}
                      className="w-full px-3 py-2 text-sm border rounded-md"
                    />
                    {product && product.stock < line.quantity && (
                      <p className="text-xs text-red-600">Only {product.stock} in stock — reduce quantity or Inbound more stock first.</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button onClick={addLine} className="text-sm text-blue-600 mb-4">+ Add another product</button>

            <button
              onClick={submit}
              disabled={saving}
              className="w-full py-2 rounded-md bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? "Creating Invoice…" : "Create Sale & Raise Invoice"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

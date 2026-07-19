"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MODULE_LABELS: Record<string, string> = {
  sales: "Sales", reviews: "Reviews", inventory: "Inventory", products: "Products",
  product_categories: "Product Categories", materials: "Materials", bom: "BOM",
  grn: "Goods Receipts", warehouses: "Warehouses", stock_transfers: "Stock Transfers",
  stock_adjustments: "Stock Adjustments", purchase: "Purchase", vendor_products: "Vendor Products",
  logistics: "Logistics", finance: "Finance", gst: "GST", crm: "CRM", crm_calls: "CRM Calls",
  crm_jobsheets: "CRM Job Sheets", fault_codes: "Fault Codes", solutions: "Solutions",
  banners: "Banners", blog: "Blog", staff: "Staff", brands: "Brands", device_models: "Device Models",
};

const STATUS_COPY: Record<string, { label: string; color: string }> = {
  NOT_SET: { label: "No plan set yet", color: "bg-gray-100 text-gray-500" },
  UNPAID: { label: "Unpaid", color: "bg-amber-100 text-amber-700" },
  ACTIVE: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-700" },
};

export default function VendorBillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<any>(null);
  const [status, setStatus] = useState("NOT_SET");
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/billing");
      const data = await res.json();
      if (data.success) {
        setSubscription(data.subscription);
        setStatus(data.status);
        setInvoices(data.invoices || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function payInvoice(invoiceId: string) {
    setPayingId(invoiceId);
    try {
      const res = await fetch(`/api/vendor/billing/invoices/${invoiceId}/pay`, { method: "POST" });
      const data = await res.json();
      if (data.success) router.push(data.paymentLink);
    } finally {
      setPayingId(null);
    }
  }

  if (loading) return <div className="p-6 text-gray-400 text-sm">Loading…</div>;

  const statusInfo = STATUS_COPY[status];
  const pendingInvoices = invoices.filter((i) => i.status === "PENDING");

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Billing & Plan</h1>
        <p className="text-sm text-gray-500 mt-1">Your access plan, validity, and payment history.</p>
      </div>

      <div className="rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Current Plan</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${statusInfo.color}`}>{statusInfo.label}</span>
        </div>

        {!subscription || !subscription.modules?.length ? (
          <p className="text-sm text-gray-400">No plan has been configured for your account yet — contact AN Group.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {subscription.modules.map((m: any) => (
                <span key={m.key} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-1">
                  {MODULE_LABELS[m.key] || m.key} · ₹{m.rate}
                </span>
              ))}
            </div>
            <div className="text-sm text-gray-600 flex justify-between pt-2 border-t border-gray-100">
              <span>Billing cycle: {subscription.validityDays} days</span>
              <span>
                {subscription.currentPeriodEnd
                  ? `Valid until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : "Not yet paid"}
              </span>
            </div>
          </>
        )}
      </div>

      {pendingInvoices.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <h2 className="font-medium text-amber-900">Pending Payment</h2>
          {pendingInvoices.map((inv) => (
            <div key={inv._id} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-mono text-xs text-amber-700">{inv.invoiceNumber}</p>
                <p className="text-amber-800">₹{inv.amount.toLocaleString("en-IN")} for {inv.periodEnd ? `${subscription?.validityDays || ""} days` : ""}</p>
              </div>
              <button
                onClick={() => payInvoice(inv._id)}
                disabled={payingId === inv._id}
                className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs disabled:opacity-50"
              >
                {payingId === inv._id ? "…" : "Pay Now"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 p-4">
        <h2 className="font-medium text-gray-900 mb-3">Invoice History</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-gray-400">No invoices yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="p-2">Invoice #</th>
                <th className="p-2">Amount</th>
                <th className="p-2">Status</th>
                <th className="p-2">Paid On</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv._id} className="border-b border-gray-50">
                  <td className="p-2 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="p-2">₹{inv.amount.toLocaleString("en-IN")}</td>
                  <td className="p-2">{inv.status}</td>
                  <td className="p-2 text-gray-500">{inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

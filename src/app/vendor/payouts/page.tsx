"use client";

/**
 * Vendor-facing payout settings — lets a vendor submit the bank/KYC
 * details Razorpay Route needs to create their linked account and start
 * receiving automatic transfers when orders including their products are
 * paid for. See core/payouts/razorpayRoute.ts for how this connects to
 * Razorpay, and admin/vendor-settlements/page.tsx for the admin-side
 * ledger of what's actually been paid out.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface PayoutAccount {
  _id: string;
  status: "NOT_STARTED" | "CREATED" | "ACTIVATED" | "SUSPENDED" | "REJECTED";
  legalBusinessName?: string;
  businessType?: string;
  panNumber?: string;
  gstNumber?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  bankBeneficiaryName?: string;
  contactEmail?: string;
  contactPhone?: string;
  rejectionReason?: string;
}

const STATUS_INFO: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  NOT_STARTED: { label: "Not set up yet", icon: AlertCircle, className: "bg-gray-100 text-gray-600 border-gray-200" },
  CREATED: { label: "Under review by Razorpay", icon: Clock, className: "bg-amber-50 text-amber-700 border-amber-200" },
  ACTIVATED: { label: "Active — ready to receive payouts", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  SUSPENDED: { label: "Suspended", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
  REJECTED: { label: "Rejected", icon: XCircle, className: "bg-red-50 text-red-700 border-red-200" },
};

export default function VendorPayoutsPage() {
  const [account, setAccount] = useState<PayoutAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    legalBusinessName: "",
    businessType: "individual",
    panNumber: "",
    gstNumber: "",
    bankAccountNumber: "",
    bankIfsc: "",
    bankBeneficiaryName: "",
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    fetch("/api/vendor/payout-account")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.account) {
          setAccount(d.account);
          setForm((f) => ({ ...f, ...d.account }));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/vendor/payout-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to save payout details");
      setAccount(data.account);
      setSuccess("Payout details submitted. Razorpay will review and activate your account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">Loading…</div>;
  }

  const statusInfo = STATUS_INFO[account?.status || "NOT_STARTED"];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payout Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up automatic payouts for orders you fulfill — money is transferred directly to your bank account when a customer's payment is captured.
          </p>
        </div>

        <div className={`rounded-xl border px-4 py-3 flex items-center gap-2 text-sm font-medium ${statusInfo.className}`}>
          <StatusIcon size={16} /> {statusInfo.label}
        </div>

        {account?.status === "REJECTED" && account.rejectionReason && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {account.rejectionReason}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-4">
          <div>
            <label className={labelCls}>Legal Business Name *</label>
            <input required className={inputCls} value={form.legalBusinessName} onChange={(e) => setForm((f) => ({ ...f, legalBusinessName: e.target.value }))} />
          </div>
          <div>
            <label className={labelCls}>Business Type</label>
            <select className={inputCls} value={form.businessType} onChange={(e) => setForm((f) => ({ ...f, businessType: e.target.value }))}>
              {["individual", "proprietorship", "partnership", "private_limited", "public_limited", "llp", "huf", "not_yet_registered"].map((t) => (
                <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>PAN Number</label>
              <input className={inputCls} value={form.panNumber} onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase() }))} placeholder="AAAAA0000A" />
            </div>
            <div>
              <label className={labelCls}>GST Number</label>
              <input className={inputCls} value={form.gstNumber} onChange={(e) => setForm((f) => ({ ...f, gstNumber: e.target.value.toUpperCase() }))} placeholder="Optional" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Contact Email *</label>
              <input required type="email" className={inputCls} value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Contact Phone *</label>
              <input required className={inputCls} value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
            </div>
          </div>
          <div className="pt-2 border-t border-gray-100" />
          <div>
            <label className={labelCls}>Bank Beneficiary Name *</label>
            <input required className={inputCls} value={form.bankBeneficiaryName} onChange={(e) => setForm((f) => ({ ...f, bankBeneficiaryName: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Bank Account Number *</label>
              <input required className={inputCls} value={form.bankAccountNumber} onChange={(e) => setForm((f) => ({ ...f, bankAccountNumber: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>IFSC Code *</label>
              <input required className={inputCls} value={form.bankIfsc} onChange={(e) => setForm((f) => ({ ...f, bankIfsc: e.target.value.toUpperCase() }))} placeholder="HDFC0001234" />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {saving ? "Submitting…" : account ? "Update Payout Details" : "Set Up Payouts"}
          </button>
        </form>
      </div>
    </div>
  );
}

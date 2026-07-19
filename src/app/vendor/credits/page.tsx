"use client";

import { useEffect, useState } from "react";

interface Account {
  _id: string;
  name: string;
  type: "DISTRIBUTOR" | "RETAILER";
  contactPerson?: string;
  phone?: string;
  email?: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  creditLimit: number;
  creditDays: number;
  outstandingBalance: number;
  daysOverdue: number;
  isActive: boolean;
}

interface Transaction {
  _id: string;
  type: "INVOICE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  balanceAfter: number;
  dueDate?: string | null;
  notes?: string;
  createdAt: string;
}

const EMPTY_NEW = { name: "", type: "RETAILER" as const, contactPerson: "", phone: "", creditLimit: "", creditDays: "15" };

export default function VendorCreditsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_NEW);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [vendorCode, setVendorCode] = useState("");
  const [b2bEnabled, setB2bEnabled] = useState(false);
  const [togglingB2b, setTogglingB2b] = useState(false);

  const [selected, setSelected] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txForm, setTxForm] = useState({ type: "INVOICE" as const, amount: "", notes: "" });
  const [txError, setTxError] = useState<string | null>(null);
  const [txSaving, setTxSaving] = useState(false);

  async function loadAccounts() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/credit-accounts");
      const data = await res.json();
      if (data.success) setAccounts(data.data || []);
    } finally {
      setLoading(false);
    }
  }

  async function loadProfile() {
    const res = await fetch("/api/vendor/profile");
    const data = await res.json();
    if (data.success) {
      setVendorCode(data.data.vendorId || "");
      setB2bEnabled(!!data.data.enableB2BOrdering);
    }
  }

  useEffect(() => {
    loadAccounts();
    loadProfile();
  }, []);

  async function toggleB2b() {
    setTogglingB2b(true);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enableB2BOrdering: !b2bEnabled }),
      });
      const data = await res.json();
      if (data.success) setB2bEnabled(!b2bEnabled);
    } finally {
      setTogglingB2b(false);
    }
  }

  async function openAccount(acc: Account) {
    setSelected(acc);
    setTxError(null);
    const res = await fetch(`/api/vendor/credit-accounts/${acc._id}`);
    const data = await res.json();
    if (data.success) setTransactions(data.transactions || []);
  }

  async function createAccount() {
    setError(null);
    if (!newForm.name.trim()) {
      setError("Account name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/credit-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newForm,
          creditLimit: Number(newForm.creditLimit) || 0,
          creditDays: Number(newForm.creditDays) || 15,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || "Failed to create account");
        return;
      }
      setShowNew(false);
      setNewForm(EMPTY_NEW);
      loadAccounts();
    } finally {
      setSaving(false);
    }
  }

  async function recordTransaction() {
    if (!selected) return;
    setTxError(null);
    const amount = Number(txForm.amount);
    if (!amount || amount <= 0) {
      setTxError("Enter an amount greater than 0.");
      return;
    }
    setTxSaving(true);
    try {
      const res = await fetch(`/api/vendor/credit-accounts/${selected._id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: txForm.type, amount, notes: txForm.notes || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setTxError(data.message || "Failed to record transaction");
        return;
      }
      setTxForm({ type: "INVOICE", amount: "", notes: "" });
      openAccount(data.account);
      loadAccounts();
    } finally {
      setTxSaving(false);
    }
  }

  async function decidePending(id: string, action: "APPROVE" | "REJECT") {
    await fetch(`/api/vendor/credit-accounts/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadAccounts();
  }

  const pending = accounts.filter((a) => a.status === "PENDING");
  const active = accounts.filter((a) => a.status !== "PENDING");
  const totalOutstanding = active.reduce((s, a) => s + (a.outstandingBalance || 0), 0);
  const signupUrl = vendorCode ? `${typeof window !== "undefined" ? window.location.origin : ""}/b2b/${vendorCode}/signup` : "";

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Credit Accounts</h1>
          <p className="text-sm text-gray-500 mt-1">
            Distributors and retailers you extend credit to — sales made now, collected within {" "}
            {newForm.creditDays} days by default.
          </p>
        </div>
        <button onClick={() => setShowNew(true)} className="shrink-0 px-3 py-2 bg-gray-900 text-white rounded-lg text-sm">
          + New Account
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">B2B Ordering Portal</p>
            <p className="text-xs text-gray-500">
              Let distributors/retailers sign up and order directly at their channel price.
            </p>
          </div>
          <button
            onClick={toggleB2b}
            disabled={togglingB2b}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${b2bEnabled ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600"}`}
          >
            {b2bEnabled ? "Enabled" : "Disabled — click to enable"}
          </button>
        </div>
        {b2bEnabled && signupUrl && (
          <p className="text-xs text-gray-500">
            Share this signup link: <span className="font-mono text-violet-600">{signupUrl}</span>
          </p>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 p-3 text-sm text-gray-600">
        Total outstanding across {active.length} account{active.length === 1 ? "" : "s"}:{" "}
        <b className="text-gray-900">₹{totalOutstanding.toLocaleString("en-IN")}</b>
      </div>

      {pending.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-sm font-semibold text-amber-900">Pending Approval ({pending.length})</p>
          {pending.map((a) => (
            <div key={a._id} className="flex items-center justify-between text-sm bg-white rounded-lg p-2">
              <div>
                <p className="font-medium text-gray-900">{a.name} <span className="text-xs text-gray-400">({a.type})</span></p>
                <p className="text-xs text-gray-500">{a.email} · {a.phone}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decidePending(a._id, "APPROVE")} className="px-2 py-1 bg-emerald-600 text-white rounded text-xs">Approve</button>
                <button onClick={() => decidePending(a._id, "REJECT")} className="px-2 py-1 border rounded text-xs text-red-600">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-sm bg-white rounded-xl p-5 space-y-3">
            <h2 className="font-semibold text-gray-900">New Credit Account</h2>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="Business name *" value={newForm.name} onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))} />
            <select className="w-full border rounded-lg p-2 text-sm" value={newForm.type} onChange={(e) => setNewForm((p) => ({ ...p, type: e.target.value as any }))}>
              <option value="RETAILER">Retailer</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="Contact person" value={newForm.contactPerson} onChange={(e) => setNewForm((p) => ({ ...p, contactPerson: e.target.value }))} />
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="Phone" value={newForm.phone} onChange={(e) => setNewForm((p) => ({ ...p, phone: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Credit limit ₹" value={newForm.creditLimit} onChange={(e) => setNewForm((p) => ({ ...p, creditLimit: e.target.value }))} />
              <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Credit days" value={newForm.creditDays} onChange={(e) => setNewForm((p) => ({ ...p, creditDays: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowNew(false)} className="px-3 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={createAccount} disabled={saving} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50">
                {saving ? "Saving…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-xl p-5 space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.name}</h2>
                <p className="text-xs text-gray-500">{selected.type} · Limit ₹{selected.creditLimit} · {selected.creditDays} days</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-sm">✕</button>
            </div>

            <div className="rounded-lg bg-gray-50 p-3 text-sm space-y-1">
              <p>Outstanding: <b>₹{selected.outstandingBalance.toLocaleString("en-IN")}</b>
                {selected.creditLimit > 0 && selected.outstandingBalance >= selected.creditLimit && (
                  <span className="text-red-600 ml-2">— at/over credit limit</span>
                )}
              </p>
              {selected.daysOverdue > 0 && (
                <p className="text-red-600">{selected.daysOverdue} days overdue on oldest unpaid invoice</p>
              )}
            </div>

            <div className="border rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Record Transaction</p>
              {txError && <p className="text-xs text-red-600">{txError}</p>}
              <div className="grid grid-cols-3 gap-2">
                <select className="border rounded-lg p-2 text-sm" value={txForm.type} onChange={(e) => setTxForm((p) => ({ ...p, type: e.target.value as any }))}>
                  <option value="INVOICE">Invoice (credit sale)</option>
                  <option value="PAYMENT">Payment received</option>
                  <option value="ADJUSTMENT">Adjustment</option>
                </select>
                <input type="number" className="border rounded-lg p-2 text-sm" placeholder="Amount ₹" value={txForm.amount} onChange={(e) => setTxForm((p) => ({ ...p, amount: e.target.value }))} />
                <button onClick={recordTransaction} disabled={txSaving} className="bg-gray-900 text-white rounded-lg text-sm disabled:opacity-50">
                  {txSaving ? "…" : "Add"}
                </button>
              </div>
              <input className="w-full border rounded-lg p-2 text-sm" placeholder="Notes (optional)" value={txForm.notes} onChange={(e) => setTxForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Ledger</p>
              {transactions.length === 0 ? (
                <p className="text-sm text-gray-400">No transactions yet.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-400 border-b">
                      <th className="p-1">Date</th>
                      <th className="p-1">Type</th>
                      <th className="p-1">Amount</th>
                      <th className="p-1">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t._id} className="border-b border-gray-50">
                        <td className="p-1 text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                        <td className="p-1">{t.type}</td>
                        <td className="p-1">{t.type === "INVOICE" ? "+" : "-"}₹{t.amount}</td>
                        <td className="p-1 font-mono">₹{t.balanceAfter}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="p-3">Name</th>
              <th className="p-3">Type</th>
              <th className="p-3">Outstanding</th>
              <th className="p-3">Overdue</th>
              <th className="p-3">Limit</th>
              <th className="p-3">Terms</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>Loading…</td></tr>
            ) : active.length === 0 ? (
              <tr><td className="p-4 text-gray-400" colSpan={7}>No credit accounts yet.</td></tr>
            ) : (
              active.map((a) => (
                <tr key={a._id} className="border-b border-gray-50">
                  <td className="p-3 text-gray-900">{a.name}</td>
                  <td className="p-3 text-gray-500">{a.type}</td>
                  <td className={`p-3 ${a.creditLimit > 0 && a.outstandingBalance >= a.creditLimit ? "text-red-600 font-medium" : "text-gray-700"}`}>
                    ₹{a.outstandingBalance.toLocaleString("en-IN")}
                  </td>
                  <td className="p-3">
                    {a.daysOverdue > 0 ? <span className="text-red-600 font-medium">{a.daysOverdue}d</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="p-3 text-gray-500">{a.creditLimit ? `₹${a.creditLimit}` : "—"}</td>
                  <td className="p-3 text-gray-500">{a.creditDays} days</td>
                  <td className="p-3">
                    <button onClick={() => openAccount(a)} className="text-violet-600 text-xs font-medium">View / Record</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

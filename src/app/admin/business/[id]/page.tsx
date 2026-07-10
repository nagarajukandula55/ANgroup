"use client";

// Business detail/edit page — rebuilt after src/app/businesses/[id]/page.tsx
// was accidentally deleted during the top-level orphaned-pages cleanup pass
// (it was flagged by the classification agent as unique functionality with
// "no admin [id] equivalent," but got swept up in a bulk `rm -rf` alongside
// the genuinely-stale businesses/page.tsx and businesses/create/page.tsx).
// No git history / backup existed to recover the original file's exact
// content, so this is a fresh implementation against the same
// /api/businesses/[id] GET+PATCH endpoint, matching this admin/business/
// section's existing style (see ../page.tsx).

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BUSINESS_TYPE_OPTIONS, INDUSTRY_OPTIONS } from "@/data/businessConstants";
import { StateSelect, CitySelect, PincodeInput } from "@/components/shared/LocationSelect";
import { validateGSTINAgainstState } from "@/lib/validation/gst";
// Canonical list of every real app module/section, sourced from the same
// NAV_GROUPS the sidebar renders from — this is the checklist an admin
// toggles per business (see Business.ts's ModuleSchema + the "Modules"
// section below).
import { STATIC_MODULES } from "@/components/sidebar";

interface AuditLogEntry {
  _id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  userEmail?: string;
  userName?: string;
  isSuperAdmin?: boolean;
  createdAt: string;
}

interface Business {
  _id: string;
  name: string;
  legalName?: string;
  brandName?: string;
  businessCode?: string;
  industry?: string;
  type?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive?: boolean;
  compliance?: {
    gstNumber?: string;
    pan?: string;
    cin?: string;
    msme?: string;
    iec?: string;
    fssai?: string;
    drugLicense?: string;
  };
  financial?: {
    currency?: string;
    fiscalYearStart?: string;
    taxStandard?: string;
    decimalPlaces?: number;
    priceIncludesTax?: boolean;
  };
  gstStateCode?: string;
  modules?: ModuleToggle[];
}

interface ModuleToggle {
  key: string;
  label: string;
  route: string;
  icon: string;
  enabled: boolean;
}

type EditableForm = {
  name: string;
  legalName: string;
  brandName: string;
  businessCode: string;
  industry: string;
  type: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstStateCode: string;
  compliance: {
    gstNumber: string;
    pan: string;
    cin: string;
    msme: string;
    iec: string;
    fssai: string;
    drugLicense: string;
  };
  financial: {
    currency: string;
    fiscalYearStart: string;
    taxStandard: string;
    decimalPlaces: number;
    priceIncludesTax: boolean;
  };
  modules: ModuleToggle[];
};

// Build the full module-toggle list for this business: every canonical
// module key from the sidebar, merged with whatever this business already
// has saved so per-module enabled state is preserved. If the business has
// never had modules configured (empty array), default every module to
// enabled — see the read-side note in api/ui/sidebar/route.ts for why an
// empty list must mean "everything on," not "everything off."
function buildModulesForm(biz: Business): ModuleToggle[] {
  const saved = new Map(
    (Array.isArray(biz.modules) ? biz.modules : []).map((m) => [m.key, m])
  );
  return STATIC_MODULES.map((m) => {
    const existing = saved.get(m.key);
    return {
      key: m.key,
      label: m.label,
      route: m.route,
      icon: m.icon,
      // Any module not explicitly toggled off defaults to enabled — covers
      // both "never configured at all" and "configured, but this module key
      // didn't exist yet at save time."
      enabled: existing ? existing.enabled !== false : true,
    };
  });
}

function toForm(biz: Business): EditableForm {
  return {
    name: biz.name || "",
    legalName: biz.legalName || "",
    brandName: biz.brandName || "",
    businessCode: biz.businessCode || "",
    industry: biz.industry || "",
    type: biz.type || "",
    address: biz.address || "",
    city: biz.city || "",
    state: biz.state || "",
    pincode: biz.pincode || "",
    gstStateCode: biz.gstStateCode || "",
    compliance: {
      gstNumber: biz.compliance?.gstNumber || "",
      pan: biz.compliance?.pan || "",
      cin: biz.compliance?.cin || "",
      msme: biz.compliance?.msme || "",
      iec: biz.compliance?.iec || "",
      fssai: biz.compliance?.fssai || "",
      drugLicense: biz.compliance?.drugLicense || "",
    },
    financial: {
      currency: biz.financial?.currency || "INR",
      fiscalYearStart: biz.financial?.fiscalYearStart || "04-01",
      taxStandard: biz.financial?.taxStandard || "GST",
      decimalPlaces:
        typeof biz.financial?.decimalPlaces === "number"
          ? biz.financial.decimalPlaces
          : 2,
      priceIncludesTax: !!biz.financial?.priceIncludesTax,
    },
    modules: buildModulesForm(biz),
  };
}

export default function BusinessDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : String(params?.id ?? "");

  const [business, setBusiness] = useState<Business | null>(null);
  const [form, setForm] = useState<EditableForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLogsLoading(true);
    fetch(`/api/audit/logs?businessId=${id}`)
      .then((r) => r.json())
      .then((d) => setLogs(d.success ? d.data : []))
      .catch(() => setLogs([]))
      .finally(() => setLogsLoading(false));
  }, [id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/businesses/${id}`);
      const data = await res.json();
      if (data.success) {
        setBusiness(data.business);
        setForm(toForm(data.business));
      } else {
        setError(data.message || "Failed to load business");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!form) return;

    if (form.compliance.gstNumber.trim()) {
      const gstResult = validateGSTINAgainstState(
        form.compliance.gstNumber,
        form.state || undefined
      );
      if (!gstResult.valid) {
        setError(gstResult.reason || "Invalid GSTIN");
        return;
      }
    }

    if (form.pincode.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      setError("Pincode must be a valid 6-digit Indian PIN code");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/businesses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setBusiness(data.business);
        setForm(toForm(data.business));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setError(data.message || "Failed to save changes");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-10 text-white bg-[#07111f] min-h-screen">
        Loading business...
      </div>
    );
  }

  if (!business || !form) {
    return (
      <div className="p-10 text-white bg-[#07111f] min-h-screen">
        <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error || "Business not found"}
        </div>
        <Link
          href="/admin/business"
          className="mt-4 inline-block text-cyan-400 underline text-sm"
        >
          &larr; Back to businesses
        </Link>
      </div>
    );
  }

  const inputCls =
    "w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/60";
  const labelCls = "block text-xs uppercase tracking-wide text-white/50 mb-1";

  return (
    <div className="p-10 text-white bg-[#07111f] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => router.push("/admin/business")}
            className="text-xs text-cyan-400 underline mb-2"
          >
            &larr; Back to businesses
          </button>
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="mt-1 text-sm text-white/50">
            {[business.industry, business.type].filter(Boolean).join(" · ") ||
              "Business profile"}
          </p>
        </div>
        {business.isActive === false && (
          <span className="text-[10px] uppercase tracking-wide bg-red-500/20 text-red-300 font-bold px-2 py-1 rounded h-fit">
            Inactive
          </span>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="mt-4 rounded border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-300">
          Changes saved.
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-bold text-lg">Identity</h2>
          <div>
            <label className={labelCls}>Display Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, name: e.target.value })}
              placeholder="Business display name"
            />
          </div>
          <div>
            <label className={labelCls}>Legal Name</label>
            <input
              className={inputCls}
              value={form.legalName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, legalName: e.target.value })}
              placeholder="Legal / registered name"
            />
          </div>
          <div>
            <label className={labelCls}>Brand Name</label>
            <input
              className={inputCls}
              value={form.brandName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, brandName: e.target.value })}
              placeholder="Brand name"
            />
          </div>
          <div>
            <label className={labelCls}>Business Code</label>
            <input
              className={inputCls}
              value={form.businessCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, businessCode: e.target.value })
              }
              placeholder="Business code"
            />
          </div>

          <div>
            <label className={labelCls}>Business Type</label>
            <select
              className={inputCls}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              title="Business type"
            >
              <option value="">Select business type…</option>
              {BUSINESS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Industry</label>
            <select
              className={inputCls}
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              title="Industry"
            >
              <option value="">Select industry…</option>
              {INDUSTRY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2 text-xs text-white/40 space-y-1">
            {business.email && <div>Email: {business.email}</div>}
            {business.phone && <div>Phone: {business.phone}</div>}
            {business.website && <div>Website: {business.website}</div>}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-bold text-lg">Address</h2>
          <div>
            <label className={labelCls}>Street Address</label>
            <input
              className={inputCls}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>State</label>
              <StateSelect
                value={form.state}
                onChange={(value) => setForm({ ...form, state: value, city: "" })}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <CitySelect
                value={form.city}
                state={form.state}
                onChange={(value) => setForm({ ...form, city: value })}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pincode</label>
            <PincodeInput
              value={form.pincode}
              onChange={(value) => setForm({ ...form, pincode: value })}
              onResolved={({ state, city }) =>
                setForm((prev) =>
                  prev
                    ? {
                        ...prev,
                        state: prev.state || state,
                        city: prev.city || city,
                      }
                    : prev
                )
              }
              className={inputCls}
            />
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4">
          <h2 className="font-bold text-lg">Compliance</h2>
          <div>
            <label className={labelCls}>GST Number</label>
            <input
              className={inputCls}
              value={form.compliance.gstNumber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({
                  ...form,
                  compliance: { ...form.compliance, gstNumber: e.target.value },
                })
              }
              placeholder="e.g. 29ABCDE1234F1Z5"
            />
          </div>
          <div>
            <label className={labelCls}>
              GST State Code (for e-Invoice / INV-01)
            </label>
            <input
              className={inputCls}
              value={form.gstStateCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({ ...form, gstStateCode: e.target.value })
              }
              placeholder="e.g. 29"
            />
          </div>
          <div>
            <label className={labelCls}>PAN</label>
            <input
              className={inputCls}
              value={form.compliance.pan}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({
                  ...form,
                  compliance: { ...form.compliance, pan: e.target.value },
                })
              }
              placeholder="e.g. ABCDE1234F"
            />
          </div>
          <div>
            <label className={labelCls}>CIN</label>
            <input
              className={inputCls}
              value={form.compliance.cin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({
                  ...form,
                  compliance: { ...form.compliance, cin: e.target.value },
                })
              }
              placeholder="Corporate Identification Number"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>MSME</label>
              <input
                className={inputCls}
                value={form.compliance.msme}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    compliance: { ...form.compliance, msme: e.target.value },
                  })
                }
                placeholder="MSME registration number"
              />
            </div>
            <div>
              <label className={labelCls}>IEC</label>
              <input
                className={inputCls}
                value={form.compliance.iec}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    compliance: { ...form.compliance, iec: e.target.value },
                  })
                }
                placeholder="Import Export Code"
              />
            </div>
            <div>
              <label className={labelCls}>FSSAI</label>
              <input
                className={inputCls}
                value={form.compliance.fssai}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    compliance: { ...form.compliance, fssai: e.target.value },
                  })
                }
                placeholder="FSSAI license number"
              />
            </div>
            <div>
              <label className={labelCls}>Drug License</label>
              <input
                className={inputCls}
                value={form.compliance.drugLicense}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    compliance: {
                      ...form.compliance,
                      drugLicense: e.target.value,
                    },
                  })
                }
                placeholder="Drug license number"
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4 lg:col-span-2">
          <h2 className="font-bold text-lg">Financial Settings</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>Currency</label>
              <input
                className={inputCls}
                value={form.financial.currency}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    financial: { ...form.financial, currency: e.target.value },
                  })
                }
                placeholder="e.g. INR"
              />
            </div>
            <div>
              <label className={labelCls}>Fiscal Year Start</label>
              <input
                className={inputCls}
                value={form.financial.fiscalYearStart}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      fiscalYearStart: e.target.value,
                    },
                  })
                }
                placeholder="MM-DD"
              />
            </div>
            <div>
              <label className={labelCls}>Tax Standard</label>
              <input
                className={inputCls}
                value={form.financial.taxStandard}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      taxStandard: e.target.value,
                    },
                  })
                }
                placeholder="e.g. GST"
              />
            </div>
            <div>
              <label className={labelCls}>Decimal Places</label>
              <input
                type="number"
                className={inputCls}
                value={form.financial.decimalPlaces}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setForm({
                    ...form,
                    financial: {
                      ...form.financial,
                      decimalPlaces: Number(e.target.value),
                    },
                  })
                }
                onFocus={(e) => e.target.select()}
                placeholder="e.g. 2"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input
              type="checkbox"
              checked={form.financial.priceIncludesTax}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setForm({
                  ...form,
                  financial: {
                    ...form.financial,
                    priceIncludesTax: e.target.checked,
                  },
                })
              }
            />
            Prices include tax
          </label>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4 lg:col-span-2">
          <h2 className="font-bold text-lg">Modules</h2>
          <p className="text-xs text-white/50">
            Choose which application modules are available to this business.
            Unchecked modules are hidden from this business's sidebar for
            non-super-admin users.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {form.modules.map((mod) => (
              <label
                key={mod.key}
                className="flex items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                <input
                  type="checkbox"
                  checked={mod.enabled}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      modules: form.modules.map((m) =>
                        m.key === mod.key ? { ...m, enabled: e.target.checked } : m
                      ),
                    })
                  }
                />
                {mod.label}
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-white/5 p-6 space-y-4 lg:col-span-2">
          <h2 className="font-bold text-lg">Activity Log</h2>
          <p className="text-xs text-white/50">
            Recent actions taken on this business's data (creates, edits,
            deletes) across the app — most recent first, last 200 entries.
          </p>
          {logsLoading ? (
            <p className="text-sm text-white/50">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-white/50">No activity recorded yet.</p>
          ) : (
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-white/50 border-b border-white/10">
                  <tr>
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">Entity</th>
                    <th className="py-2 pr-4">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="py-2 pr-4 whitespace-nowrap text-white/70">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </td>
                      <td className="py-2 pr-4 text-white/80">{log.action}</td>
                      <td className="py-2 pr-4 text-white/70">
                        {log.entity}
                        {log.entityId ? ` (${log.entityId.slice(-6)})` : ""}
                      </td>
                      <td className="py-2 pr-4 text-white/70">
                        {log.userEmail || log.userName || (log.isSuperAdmin ? "Super Admin" : "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="bg-cyan-500 px-6 py-3 text-black font-bold rounded disabled:opacity-40"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StateSelect, CitySelect } from "@/components/shared/LocationSelect";
import { validateGSTINAgainstState } from "@/lib/validation/gst";

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 transition";

function VendorApplyForm() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";

  const [businessName, setBusinessName] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);

  const [form, setForm] = useState({
    companyName: "",
    contactPerson: "",
    email: "",
    phone: "",
    gstRegistered: true,
    gstNumber: "",
    panNumber: "",
    category: "",
    businessType: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    accountName: "",
    accountNumber: "",
    confirmAccount: "",
    ifscCode: "",
    bankName: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [gstWarning, setGstWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setInvalidLink(true);
      return;
    }
    fetch(`/api/businesses/public?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBusinessName(d.business.name);
        else setInvalidLink(true);
      })
      .catch(() => setInvalidLink(true));
  }, [businessId]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((p) => ({ ...p, [key]: value }));
    if (error) setError(null);
  }

  function handleGstBlur() {
    if (!form.gstNumber.trim()) {
      setGstWarning(null);
      return;
    }
    const result = validateGSTINAgainstState(form.gstNumber, form.state || undefined);
    setGstWarning(result.valid ? null : result.reason || "Invalid GSTIN");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.companyName.trim()) return setError("Company name is required");
    if (!form.contactPerson.trim()) return setError("Contact person is required");
    if (!form.email.trim()) return setError("Email is required");
    if (!form.phone.trim()) return setError("Phone is required");
    if (form.gstRegistered && !form.gstNumber.trim())
      return setError("GSTIN is required for GST-registered vendors");
    if (!form.gstRegistered && !form.panNumber.trim())
      return setError("PAN is required for vendors without GST");
    if (form.gstNumber.trim()) {
      const gstResult = validateGSTINAgainstState(form.gstNumber, form.state || undefined);
      if (!gstResult.valid) return setError(gstResult.reason || "Invalid GSTIN");
    }
    if (form.pincode.trim() && !/^[1-9][0-9]{5}$/.test(form.pincode.trim()))
      return setError("Pincode must be a valid 6-digit Indian PIN code");
    if (form.accountNumber && form.accountNumber !== form.confirmAccount)
      return setError("Account numbers do not match");

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vendors/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          companyName: form.companyName.trim(),
          contactPerson: form.contactPerson.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          gstRegistered: form.gstRegistered,
          gstNumber: form.gstRegistered ? form.gstNumber.trim().toUpperCase() : undefined,
          panNumber: form.panNumber.trim().toUpperCase() || undefined,
          category: form.category || undefined,
          businessType: form.businessType || undefined,
          address:
            form.street || form.city || form.state || form.pincode
              ? {
                  street: form.street || undefined,
                  city: form.city || undefined,
                  state: form.state || undefined,
                  pincode: form.pincode || undefined,
                  country: "India",
                }
              : undefined,
          bankDetails: form.accountNumber
            ? {
                accountName: form.accountName || undefined,
                accountNumber: form.accountNumber,
                ifscCode: form.ifscCode.trim().toUpperCase() || undefined,
                bankName: form.bankName || undefined,
              }
            : undefined,
          notes: form.notes || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) throw new Error(d.message || "Submission failed");
      setDone(d.applicationId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (invalidLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-lg font-bold text-gray-900">Invalid application link</h1>
          <p className="mt-2 text-sm text-gray-500">
            This vendor application link is missing or invalid. Please use the exact
            link shared with you by the business admin.
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center">
          <div className="text-4xl mb-3">✅</div>
          <h1 className="text-lg font-bold text-gray-900">Application submitted</h1>
          <p className="mt-2 text-sm text-gray-500">
            Your application ID is <span className="font-mono font-semibold text-gray-800">{done}</span>.
            The team will review your details and send you the partner agreement for
            signing. You&apos;ll receive your vendor login after final approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <form onSubmit={submit} className="mx-auto max-w-2xl bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 font-semibold">Vendor Onboarding</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            {businessName ? `Apply as a vendor — ${businessName}` : "Vendor Application"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in your company details. After review you&apos;ll receive a partner
            agreement to sign, and your vendor login once approved.
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Company */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Company Name" required>
            <input className={inputCls} value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Traders Pvt Ltd" />
          </Field>
          <Field label="Business Type">
            <select className={inputCls} value={form.businessType} onChange={(e) => set("businessType", e.target.value)}>
              <option value="">Select…</option>
              {["Manufacturer", "Wholesaler", "Distributor", "Retailer", "Service Provider", "Other"].map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Contact Person" required>
            <input className={inputCls} value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} placeholder="Full name" />
          </Field>
          <Field label="Category">
            <input className={inputCls} value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Packaging, Raw Material" />
          </Field>
          <Field label="Email" required>
            <input type="email" className={inputCls} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com" />
          </Field>
          <Field label="Phone" required>
            <input className={inputCls} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="98765 43210" />
          </Field>
        </div>

        {/* GST toggle */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">GST Registration<span className="text-red-500 ml-0.5">*</span></p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => set("gstRegistered", true)}
              className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                form.gstRegistered
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              With GST
            </button>
            <button
              type="button"
              onClick={() => set("gstRegistered", false)}
              className={`py-2.5 rounded-xl border text-sm font-medium transition ${
                !form.gstRegistered
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              Without GST
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {form.gstRegistered && (
            <Field label="GSTIN" required hint={gstWarning || "15-character GST identification number"}>
              <input
                className={inputCls}
                value={form.gstNumber}
                onChange={(e) => set("gstNumber", e.target.value)}
                onBlur={handleGstBlur}
                placeholder="22AAAAA0000A1Z5"
              />
            </Field>
          )}
          <Field label="PAN" required={!form.gstRegistered} hint={form.gstRegistered ? "Optional when GSTIN is provided" : "Required for vendors without GST"}>
            <input className={inputCls} value={form.panNumber} onChange={(e) => set("panNumber", e.target.value)} placeholder="AAAAA0000A" />
          </Field>
        </div>

        {/* Address */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Registered Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Street"><input className={inputCls} value={form.street} onChange={(e) => set("street", e.target.value)} /></Field>
            <Field label="State">
              <StateSelect
                value={form.state}
                onChange={(value) => {
                  set("state", value);
                  set("city", "");
                }}
                className={inputCls}
              />
            </Field>
            <Field label="City">
              <CitySelect
                value={form.city}
                state={form.state}
                onChange={(value) => set("city", value)}
                className={inputCls}
              />
            </Field>
            <Field label="Pincode"><input className={inputCls} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
          </div>
        </div>

        {/* Bank */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Bank Details (for payouts)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Account Holder Name"><input className={inputCls} value={form.accountName} onChange={(e) => set("accountName", e.target.value)} /></Field>
            <Field label="Bank Name"><input className={inputCls} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} /></Field>
            <Field label="Account Number"><input className={inputCls} value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} /></Field>
            <Field label="Confirm Account Number"><input className={inputCls} value={form.confirmAccount} onChange={(e) => set("confirmAccount", e.target.value)} /></Field>
            <Field label="IFSC Code"><input className={inputCls} value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value)} placeholder="HDFC0001234" /></Field>
          </div>
        </div>

        <Field label="Anything else we should know?">
          <textarea className={`${inputCls} min-h-[80px]`} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
        >
          {submitting ? "Submitting…" : "Submit Application"}
        </button>
      </form>
    </div>
  );
}

export default function VendorApplyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      }
    >
      <VendorApplyForm />
    </Suspense>
  );
}

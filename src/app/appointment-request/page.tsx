"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PincodeInput } from "@/components/shared/LocationSelect";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 transition";

function AppointmentRequestForm() {
  const searchParams = useSearchParams();
  const rawBusinessId = searchParams.get("businessId") || "";
  const shortCode = searchParams.get("code") || "";

  // Short links use ?code=AB (a business's 2-char shortCode) instead of the
  // full ObjectId in ?businessId= -- resolved client-side on mount so this
  // still works as a plain static link with no server rendering needed.
  const [resolvedBusinessId, setResolvedBusinessId] = useState(rawBusinessId);
  const [resolvingCode, setResolvingCode] = useState(Boolean(shortCode && !rawBusinessId));
  const [codeError, setCodeError] = useState("");

  useEffect(() => {
    if (!shortCode || rawBusinessId) return;
    (async () => {
      try {
        const res = await fetch(`/api/businesses/resolve-code?code=${encodeURIComponent(shortCode)}`);
        const json = await res.json();
        if (json.success) {
          setResolvedBusinessId(json.businessId);
        } else {
          setCodeError(json.message || "Invalid business code");
        }
      } catch {
        setCodeError("Failed to resolve business code");
      } finally {
        setResolvingCode(false);
      }
    })();
  }, [shortCode, rawBusinessId]);

  const businessId = resolvedBusinessId;

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    pincode: "",
    city: "",
    state: "",
    subject: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  // Email OTP verification -- per explicit direction ("verify with email
  // otp and then give appointment request number"). The actual request is
  // only created after the OTP step succeeds (see submitAfterVerify()),
  // using the verificationToken issued by /verify-otp.
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const set = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  function validate(): string | null {
    if (!businessId) return "This link is missing a business reference. Please use the link provided by the business.";
    if (!form.customerName.trim() || !form.phone.trim() || !form.subject.trim()) {
      return "Please fill in your name, phone number, and what service you need.";
    }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "A valid email is required — we'll send a verification code to it.";
    }
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSendingOtp(true);
    try {
      const res = await fetch("/api/appointment-requests/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), businessId }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to send verification code");
        return;
      }
      setOtpSent(true);
      setShowOtpStep(true);
    } catch {
      setError("Failed to send verification code. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const submitAfterVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (otp.length !== 6) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }
    setSubmitting(true);
    try {
      const verifyRes = await fetch("/api/appointment-requests/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), otp }),
      });
      const verifyJson = await verifyRes.json();
      if (!verifyJson.success) {
        setError(verifyJson.message || "Invalid or expired code");
        return;
      }

      const res = await fetch("/api/appointment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId,
          customerName: form.customerName,
          phone: form.phone,
          email: form.email,
          address: [form.address, form.city, form.state].filter(Boolean).join(", "),
          pincode: form.pincode,
          subject: form.subject,
          description: form.description,
          verificationToken: verifyJson.verificationToken,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || "Failed to submit request");
        return;
      }
      setReference(json.referenceNumber);
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (resolvingCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-400">
        Loading...
      </div>
    );
  }

  if (codeError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-red-600">{codeError}</p>
        </div>
      </div>
    );
  }

  if (reference) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Request submitted
          </h1>
          <p className="text-sm text-gray-500 mb-4">
            We&apos;ve received your appointment request. Your reference number is:
          </p>
          <p className="text-xl font-mono font-bold text-gray-900 mb-4">{reference}</p>
          <p className="text-xs text-gray-400">
            Please quote this number if you contact us about this request.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Request an Appointment</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tell us what you need and we&apos;ll get in touch to schedule a visit.
          </p>
        </div>

        {!showOtpStep ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
          >
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Full Name" required>
                <input
                  className={inputCls}
                  value={form.customerName}
                  onChange={(e) => set("customerName", e.target.value)}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Phone Number" required>
                <input
                  className={inputCls}
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  type="tel"
                />
              </Field>
              <Field label="Email" required>
                <input
                  className={inputCls}
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </Field>
              <Field label="Pincode">
                <PincodeInput
                  value={form.pincode}
                  onChange={(v) => set("pincode", v)}
                  onResolved={({ state, city }) => {
                    set("state", state);
                    set("city", city);
                  }}
                  className={inputCls}
                  placeholder="400001"
                />
              </Field>
              {(form.city || form.state) && (
                <div className="md:col-span-2 text-xs text-gray-500">
                  {[form.city, form.state].filter(Boolean).join(", ")}
                </div>
              )}
              <div className="md:col-span-2">
                <Field label="Address">
                  <input
                    className={inputCls}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Street / Area"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="What service do you need?" required>
                  <input
                    className={inputCls}
                    value={form.subject}
                    onChange={(e) => set("subject", e.target.value)}
                    placeholder="e.g. AC not cooling"
                  />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Additional Details">
                  <textarea
                    className={inputCls}
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Any other details that might help us"
                  />
                </Field>
              </div>
            </div>

            <button
              type="submit"
              disabled={sendingOtp}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {sendingOtp ? "Sending code..." : "Verify Email & Continue"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={submitAfterVerify}
            className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4"
          >
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-600">
              {otpSent ? "We've sent a 6-digit code to " : "Enter the code sent to "}
              <span className="font-medium text-gray-900">{form.email}</span>
            </p>

            <Field label="Verification Code" required>
              <input
                className={`${inputCls} tracking-widest text-center text-lg`}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                maxLength={6}
                autoFocus
              />
            </Field>

            <button
              type="submit"
              disabled={submitting || otp.length !== 6}
              className="w-full py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Verify & Submit Request"}
            </button>

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowOtpStep(false);
                  setOtp("");
                  setError("");
                }}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                ← Edit details
              </button>
              <button
                type="button"
                disabled={sendingOtp}
                onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent)}
                className="text-gray-500 hover:text-gray-700 underline disabled:opacity-50"
              >
                {sendingOtp ? "Resending..." : "Resend code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AppointmentRequestPage() {
  return (
    <Suspense fallback={null}>
      <AppointmentRequestForm />
    </Suspense>
  );
}

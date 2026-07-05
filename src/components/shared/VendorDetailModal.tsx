"use client";

/**
 * Shared vendor detail popup used by both admin/vendors and
 * admin/masters/vendors list pages. Previously neither page had any
 * detail view at all — clicking a vendor row did nothing, and the only
 * action available was a bare "Approve" button wired to a generic PUT
 * with no rejection option, no audit trail, and no way to see or attach
 * bank-passbook/GST-certificate documents.
 *
 * This wires into the ALREADY-BUILT (but previously unused by any UI)
 * review flow: POST /api/vendors/[id]/review with
 * { action: "APPROVE" | "REJECT", reason? } — APPROVE generates a partner
 * Agreement and moves status to AGREEMENT_SENT; REJECT records a reason
 * and moves status to REJECTED. Final activation (status -> ACTIVE) only
 * happens later via /api/vendors/[id]/finalize, once the agreement is
 * signed — that's a separate, already-existing flow (Agreements screen)
 * and deliberately NOT triggered from this popup.
 */
import { useState } from "react";
import { X, Loader2, FileText, Upload, CheckCircle, XCircle, Building2 } from "lucide-react";

export interface VendorDetailData {
  _id: string;
  vendorId?: string;
  companyName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  gstRegistered?: boolean;
  panNumber?: string;
  category?: string;
  businessType?: string;
  paymentTerms?: string;
  creditLimit?: number;
  rating?: number;
  status?: string;
  isApproved?: boolean;
  businessId?: string | { _id: string; name?: string; legalName?: string; brandName?: string };
  address?: { street?: string; city?: string; state?: string; pincode?: string };
  bankDetails?: {
    accountName?: string;
    accountNumber?: string;
    ifscCode?: string;
    bankName?: string;
  };
  documents?: {
    passbookUrl?: string;
    passbookUploadedAt?: string;
    gstCertificateUrl?: string;
    gstCertificateUploadedAt?: string;
  };
  rejectionReason?: string;
  notes?: string;
}

interface VendorDetailModalProps {
  vendor: VendorDetailData;
  onClose: () => void;
  /** Called after a successful approve/reject/document-upload so the parent list can refresh. */
  onUpdated: (updated: Partial<VendorDetailData>) => void;
}

const REVIEWABLE_STATUSES = ["APPLIED", "PENDING"];

function businessLabel(businessId: VendorDetailData["businessId"]): string {
  if (!businessId) return "—";
  if (typeof businessId === "string") return businessId;
  return businessId.brandName || businessId.legalName || businessId.name || businessId._id;
}

export function VendorDetailModal({ vendor, onClose, onUpdated }: VendorDetailModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [uploadingField, setUploadingField] = useState<"passbookUrl" | "gstCertificateUrl" | null>(null);
  const [documents, setDocuments] = useState(vendor.documents || {});

  const canReview = REVIEWABLE_STATUSES.includes(vendor.status || "PENDING");

  async function uploadDocument(field: "passbookUrl" | "gstCertificateUrl", file: File) {
    setUploadingField(field);
    setError(null);
    try {
      const uploadForm = new FormData();
      uploadForm.append("file", file);
      uploadForm.append("name", `${vendor.companyName} - ${field}`);
      uploadForm.append("category", "vendor-document");

      const uploadRes = await fetch("/api/assets/upload", {
        method: "POST",
        body: uploadForm,
      });
      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData?.asset?.fileUrl) {
        throw new Error(uploadData?.error || "Upload failed");
      }

      const uploadedAtField = field === "passbookUrl" ? "passbookUploadedAt" : "gstCertificateUploadedAt";
      const newDocuments = {
        ...documents,
        [field]: uploadData.asset.fileUrl,
        [uploadedAtField]: new Date().toISOString(),
      };

      const patchRes = await fetch(`/api/vendors/${vendor._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: newDocuments }),
      });
      if (!patchRes.ok) throw new Error("Failed to save document to vendor record");

      setDocuments(newDocuments);
      onUpdated({ documents: newDocuments });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploadingField(null);
    }
  }

  async function handleReview(action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !rejectReason.trim()) {
      setShowRejectBox(true);
      setError("Please provide a reason for rejection");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendors/${vendor._id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: action === "REJECT" ? rejectReason.trim() : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Failed to ${action.toLowerCase()} vendor`);
      }
      onUpdated({
        status: data.vendor?.status,
        rejectionReason: data.vendor?.rejectionReason,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const rowCls = "flex justify-between py-2 border-b border-gray-100 last:border-0";
  const labelCls = "text-xs text-gray-400";
  const valueCls = "text-sm text-gray-900 font-medium";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{vendor.companyName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {vendor.vendorId || "No vendor ID assigned yet"} · Status: {vendor.status || "PENDING"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          {vendor.status === "REJECTED" && vendor.rejectionReason && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <strong>Rejected:</strong> {vendor.rejectionReason}
            </div>
          )}

          {/* Business tag — which business this vendor is being onboarded into */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Onboarding Business
            </h3>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">
              {businessLabel(vendor.businessId)}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Contact</h3>
            <div className="rounded-xl border border-gray-200 px-4">
              <div className={rowCls}>
                <span className={labelCls}>Contact Person</span>
                <span className={valueCls}>{vendor.contactPerson || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>Email</span>
                <span className={valueCls}>{vendor.email || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>Phone</span>
                <span className={valueCls}>{vendor.phone || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>Category</span>
                <span className={valueCls}>{vendor.category || "—"}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Compliance</h3>
            <div className="rounded-xl border border-gray-200 px-4">
              <div className={rowCls}>
                <span className={labelCls}>GSTIN</span>
                <span className={`${valueCls} font-mono`}>{vendor.gstNumber || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>PAN</span>
                <span className={`${valueCls} font-mono`}>{vendor.panNumber || "—"}</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Bank Details</h3>
            <div className="rounded-xl border border-gray-200 px-4">
              <div className={rowCls}>
                <span className={labelCls}>Bank</span>
                <span className={valueCls}>{vendor.bankDetails?.bankName || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>Account Number</span>
                <span className={`${valueCls} font-mono`}>{vendor.bankDetails?.accountNumber || "—"}</span>
              </div>
              <div className={rowCls}>
                <span className={labelCls}>IFSC</span>
                <span className={`${valueCls} font-mono`}>{vendor.bankDetails?.ifscCode || "—"}</span>
              </div>
            </div>
          </section>

          {/* Document uploads */}
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
              Verification Documents
            </h3>
            <div className="space-y-3">
              <DocumentUploadRow
                label="Bank Passbook / Cancelled Cheque"
                hint="For account number & IFSC confirmation"
                fileUrl={documents.passbookUrl}
                uploading={uploadingField === "passbookUrl"}
                onFileSelected={(file) => uploadDocument("passbookUrl", file)}
              />
              <DocumentUploadRow
                label="GST Certificate"
                hint="Proof of GST registration"
                fileUrl={documents.gstCertificateUrl}
                uploading={uploadingField === "gstCertificateUrl"}
                onFileSelected={(file) => uploadDocument("gstCertificateUrl", file)}
              />
            </div>
          </section>

          {showRejectBox && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
                Rejection Reason
              </h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="Explain why this vendor application is being rejected…"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition resize-none"
              />
            </section>
          )}
        </div>

        {canReview && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
            {!showRejectBox ? (
              <button
                onClick={() => setShowRejectBox(true)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            ) : (
              <button
                onClick={() => handleReview("REJECT")}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Reject
              </button>
            )}
            <button
              onClick={() => handleReview("APPROVE")}
              disabled={busy || showRejectBox}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentUploadRow({
  label,
  hint,
  fileUrl,
  uploading,
  onFileSelected,
}: {
  label: string;
  hint: string;
  fileUrl?: string;
  uploading: boolean;
  onFileSelected: (file: File) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-gray-500" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-400">{hint}</p>
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-cyan-700 hover:underline"
            >
              View uploaded file
            </a>
          )}
        </div>
      </div>
      <label className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 transition cursor-pointer">
        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {fileUrl ? "Replace" : "Upload"}
        <input
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

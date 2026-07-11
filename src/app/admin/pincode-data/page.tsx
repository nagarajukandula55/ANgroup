"use client";

/**
 * Admin page for managing the India pincode dataset that powers
 * PincodeInput's autofill (src/components/shared/LocationSelect.tsx).
 *
 * The dataset is stored in MongoDB (PincodeEntry collection), not a
 * bundled static file — this app deploys on Vercel, whose filesystem is
 * read-only at runtime, so a file-based dataset could never be refreshed
 * from the UI in production. See src/models/PincodeEntry.ts for the full
 * reasoning. This page lets an admin upload a fresh CSV export (same
 * format as the official India Post "All India Pincode Directory") any
 * time a newer version is released, without needing a code deploy.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";

// Matches exactly what the upload handler expects (see this page's own
// "Expected columns" note below and api/admin/pincode-data's parser).
function downloadTemplate() {
  const rows = [
    "pincode,district,statename,officename",
    "560001,Bangalore,Karnataka,Bangalore GPO",
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "pincode-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface DatasetStatus {
  totalPincodes: number;
  lastUpload: {
    sourceFileName?: string;
    uploadedAt?: string;
    totalPincodes?: number;
  } | null;
}

export default function PincodeDataPage() {
  const [status, setStatus] = useState<DatasetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pincode-data");
      const data = await res.json();
      if (data.success) {
        setStatus({ totalPincodes: data.totalPincodes, lastUpload: data.lastUpload });
      } else {
        setError(data.message || "Failed to load dataset status");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/pincode-data", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Upload failed");
      }
      setResult(
        `Loaded ${data.totalPincodes.toLocaleString()} pincodes from ${data.totalRows.toLocaleString()} rows` +
          (data.skippedRows ? ` (${data.skippedRows.toLocaleString()} invalid rows skipped)` : "")
      );
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/admin"
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            ←
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Pincode Data</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage the India pincode → state/city dataset used for address autofill
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
        {result && (
          <div className="mb-6 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            {result}
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <h2 className="font-medium text-gray-900 mb-4">Current Dataset</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Pincodes loaded</p>
                <p className="text-xl font-semibold text-gray-900">
                  {status?.totalPincodes?.toLocaleString() ?? 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Last updated</p>
                <p className="text-sm text-gray-700">
                  {status?.lastUpload?.uploadedAt
                    ? new Date(status.lastUpload.uploadedAt).toLocaleString()
                    : "Never uploaded"}
                </p>
                {status?.lastUpload?.sourceFileName && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    from {status.lastUpload.sourceFileName}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium text-gray-900">Upload New Dataset</h2>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-400 transition"
            >
              <Download size={12} /> Download Template
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Upload the latest{" "}
            <a
              href="https://www.data.gov.in/catalog/all-india-pincode-directory"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-700 hover:underline"
            >
              All India Pincode Directory
            </a>{" "}
            CSV export from India Post / data.gov.in. This will replace the entire dataset —
            existing pincodes not present in the new file will be removed.
          </p>

          <label
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition ${
              uploading ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
            }`}
          >
            <span className="text-sm font-medium text-gray-700">
              {uploading ? "Processing…" : "Click to select a CSV file"}
            </span>
            <span className="text-xs text-gray-400">
              Expected columns: pincode, district, statename, officename
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

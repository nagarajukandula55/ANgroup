"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";

interface Business {
  _id: string;
  name: string;
  legalName?: string;
  brandName?: string;
  businessCode?: string;
  shortCode?: string;
  industry?: string;
  type?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  state?: string;
  isActive?: boolean;
  compliance?: { gstNumber?: string; pan?: string };
}

export default function BusinessListPage() {
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    setLoading(true);
    setError(null);
    try {
      // /api/auth/me returns businesses already scoped to what this user can
      // actually switch into (all active businesses for super admins, only
      // ACTIVE BusinessMember memberships otherwise) — the same source the
      // sidebar's business switcher uses. /api/businesses/list returns every
      // business in the system with no membership check, which would list
      // businesses here that /api/auth/switch-business then rejects with a
      // 403, so it's intentionally not used for this page.
      const meRes = await fetch("/api/auth/me");
      if (meRes.ok) {
        const meData = await meRes.json();
        setActiveBusinessId(meData.user?.activeBusinessId ?? null);
        setBusinesses(meData.businesses ?? []);
      } else {
        setError("Failed to load businesses");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function switchTo(biz: Business) {
    if (switchingId || biz._id === activeBusinessId) return;
    setSwitchingId(biz._id);
    try {
      const res = await fetch("/api/auth/switch-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: biz._id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveBusinessId(biz._id);
        router.refresh();
      } else {
        setError(data.message || "Failed to switch business");
      }
    } catch {
      setError("Failed to connect to server");
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Business</p>
            <h1 className="mt-2 text-2xl font-semibold text-gray-900">Businesses</h1>
            <p className="text-sm text-gray-400 mt-1">
              Every business you manage in one place — switch between them or onboard a new one.
            </p>
          </div>

          <Link
            href="/admin/business/new"
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus size={16} /> Add Business
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading businesses…</div>
        ) : businesses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center">
              <Building2 size={24} className="text-gray-600" />
            </div>
            <div className="text-center">
              <p className="text-gray-900 font-medium">No businesses yet</p>
              <p className="text-sm text-gray-500 mt-1">
                <Link href="/admin/business/new" className="text-gray-900 underline">
                  Create your first one
                </Link>
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businesses.map((biz) => {
              const isActive = biz._id === activeBusinessId;
              return (
                <div
                  key={biz._id}
                  className={`rounded-2xl border p-5 flex flex-col gap-3 transition-colors ${
                    isActive
                      ? "border-gray-900 ring-2 ring-gray-900 bg-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{biz.name}</div>
                      {biz.brandName && (
                        <div className="text-xs text-gray-500">{biz.brandName}</div>
                      )}
                    </div>
                    {isActive && (
                      <span className="text-[10px] uppercase tracking-wide bg-gray-900 text-white font-medium px-2 py-1 rounded-full">
                        Active
                      </span>
                    )}
                    {!isActive && biz.isActive === false && (
                      <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-600 font-medium px-2 py-1 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="text-sm text-gray-500 space-y-1">
                    {biz.businessCode && (
                      <div>
                        Code: <span className="text-gray-700">{biz.businessCode}</span>
                        {biz.shortCode && (
                          <span className="ml-2 text-gray-400">
                            Short: <span className="text-gray-700 font-mono">{biz.shortCode}</span>
                          </span>
                        )}
                      </div>
                    )}
                    {(biz.industry || biz.type) && (
                      <div>{[biz.industry, biz.type].filter(Boolean).join(" · ")}</div>
                    )}
                    {biz.compliance?.gstNumber && <div>GST: {biz.compliance.gstNumber}</div>}
                    {(biz.city || biz.state) && (
                      <div>{[biz.city, biz.state].filter(Boolean).join(", ")}</div>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => switchTo(biz)}
                      disabled={isActive || switchingId === biz._id}
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-900 hover:border-gray-400 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {isActive
                        ? "Currently Active"
                        : switchingId === biz._id
                        ? "Switching…"
                        : "Switch to this business"}
                    </button>
                    <Link
                      href={`/admin/business/${biz._id}`}
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 hover:border-gray-400 transition"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

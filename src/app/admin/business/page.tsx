"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
    <div className="p-10 text-white bg-[#07111f] min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Businesses</h1>
          <p className="mt-1 text-sm text-white/50">
            Every business you manage in one place — switch between them or
            onboard a new one.
          </p>
        </div>

        <Link
          href="/admin/business/new"
          className="bg-cyan-500 px-5 py-3 text-black font-bold rounded"
        >
          + Add Business
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-10 text-white/50">Loading businesses...</div>
      ) : businesses.length === 0 ? (
        <div className="mt-10 rounded border border-white/10 bg-white/5 p-8 text-center text-white/60">
          No businesses yet.{" "}
          <Link href="/admin/business/new" className="text-cyan-400 underline">
            Create your first one
          </Link>
          .
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses.map((biz) => {
            const isActive = biz._id === activeBusinessId;
            return (
              <div
                key={biz._id}
                className={`rounded-lg border p-5 flex flex-col gap-3 ${
                  isActive
                    ? "border-cyan-400 bg-cyan-500/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-lg">{biz.name}</div>
                    {biz.brandName && (
                      <div className="text-xs text-white/50">
                        {biz.brandName}
                      </div>
                    )}
                  </div>
                  {isActive && (
                    <span className="text-[10px] uppercase tracking-wide bg-cyan-500 text-black font-bold px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                  {!isActive && biz.isActive === false && (
                    <span className="text-[10px] uppercase tracking-wide bg-red-500/20 text-red-300 font-bold px-2 py-1 rounded">
                      Inactive
                    </span>
                  )}
                </div>

                <div className="text-sm text-white/60 space-y-1">
                  {biz.businessCode && (
                    <div>
                      Code: <span className="text-white/80">{biz.businessCode}</span>
                    </div>
                  )}
                  {(biz.industry || biz.type) && (
                    <div>
                      {[biz.industry, biz.type].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {biz.compliance?.gstNumber && (
                    <div>GST: {biz.compliance.gstNumber}</div>
                  )}
                  {(biz.city || biz.state) && (
                    <div>{[biz.city, biz.state].filter(Boolean).join(", ")}</div>
                  )}
                </div>

                <button
                  onClick={() => switchTo(biz)}
                  disabled={isActive || switchingId === biz._id}
                  className="mt-2 rounded border border-cyan-400/60 px-3 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isActive
                    ? "Currently Active"
                    : switchingId === biz._id
                    ? "Switching..."
                    : "Switch to this business"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

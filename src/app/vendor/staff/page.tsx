"use client";

/**
 * Vendor-facing staff management — completes the hierarchy requested:
 * AN Group > Businesses (Tenants) > Vendors under respective businesses >
 * Warehouses under vendors > Staff.
 *
 * A vendor owner adds an EXISTING user (identified by that user's unique
 * `username` — their "vendor code") as staff and assigns them a role. This
 * relies on a general signup existing for plain users first (see
 * /register — customer-level access by default), which the staff member
 * must have done before the vendor can add them here.
 */

import { useEffect, useState } from "react";
import { Users, Plus, Loader2, Trash2, X } from "lucide-react";
import {
  VENDOR_STAFF_MEMBER_TYPES as MEMBER_TYPES,
  STORE_FRONT_MEMBER_TYPES,
  WAREHOUSE_MEMBER_TYPES,
} from "@/core/constants/businessMemberTypes";

interface StaffRow {
  _id: string;
  vendorRole?: string;
  memberType?: string;
  status?: string;
  userId?: { _id: string; name?: string; email?: string; username?: string } | string;
}

interface VendorRoleOption {
  code: string;
  name: string;
  description?: string;
}

// Base list, plus Store Front/Service Center vs. Warehouse roles — only
// shown once the vendor has the corresponding facility enabled on their
// profile (see VendorProfile.enableStoreFront/enableServiceCenter/
// enableWarehouse, toggled by an admin on the vendor's profile). All three
// lists are drawn from core/constants/businessMemberTypes.ts, the same
// source models/BusinessMember.ts's schema enum uses — never a hand-typed
// duplicate list here.

function staffLabel(u: StaffRow["userId"]): string {
  if (!u) return "—";
  if (typeof u === "string") return u;
  return u.name || u.email || u.username || u._id;
}

export default function VendorStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState("");
  const [vendorRole, setVendorRole] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [memberType, setMemberType] = useState("VENDOR_HELPER");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roles, setRoles] = useState<VendorRoleOption[]>([]);
  const [facilities, setFacilities] = useState({
    enableStoreFront: false,
    enableServiceCenter: false,
    enableWarehouse: false,
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/vendor/staff");
      const data = await res.json();
      setStaff(data.staff || []);
      setRoles(data.roles || []);
      if (data.vendor) {
        setFacilities({
          enableStoreFront: !!data.vendor.enableStoreFront,
          enableServiceCenter: !!data.vendor.enableServiceCenter,
          enableWarehouse: !!data.vendor.enableWarehouse,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  const availableMemberTypes = [
    ...MEMBER_TYPES,
    ...(facilities.enableStoreFront || facilities.enableServiceCenter ? STORE_FRONT_MEMBER_TYPES : []),
    ...(facilities.enableWarehouse ? WAREHOUSE_MEMBER_TYPES : []),
  ];

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!roleCode) {
      setError("Pick a role — this is what actually grants access, not just a label.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const pickedRole = roles.find((r) => r.code === roleCode);
      const res = await fetch("/api/vendor/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          vendorRole: vendorRole.trim() || pickedRole?.name || roleCode,
          memberType,
          roleCode,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to add staff member");
      setShowForm(false);
      setUsername("");
      setVendorRole("");
      setRoleCode("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  // Reuses the same form to grant an ADDITIONAL role to someone already on
  // the team — same POST endpoint, appends rather than overwrites (see
  // api/vendor/staff/route.ts) so one person can hold multiple roles (e.g.
  // Manager + Finance Manager), same as multiple different people can each
  // independently hold the same role (e.g. three CCOs).
  function openAddRoleFor(row: StaffRow) {
    const uname = typeof row.userId === "object" ? row.userId?.username : undefined;
    if (!uname) return;
    setUsername(uname);
    setVendorRole("");
    setRoleCode("");
    setMemberType(row.memberType || "VENDOR_HELPER");
    setShowForm(true);
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this staff member's access?")) return;
    await fetch(`/api/vendor/staff/${id}`, { method: "DELETE" });
    await load();
  }

  const inputCls =
    "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 transition";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1.5";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add existing users as staff by their user ID and assign them a role.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 text-sm py-12">Loading…</div>
        ) : staff.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center">
            <Users className="mx-auto text-gray-300 mb-3" size={28} />
            <p className="text-sm text-gray-500">No staff added yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Name</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">User ID</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Role</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500 font-medium">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((s) => (
                  <tr key={s._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900 font-medium">{staffLabel(s.userId)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {typeof s.userId === "object" ? s.userId?.username || "—" : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{s.vendorRole || "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {s.status || "ACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => openAddRoleFor(s)}
                        className="text-xs font-medium text-gray-600 hover:text-gray-900 mr-3"
                      >
                        + Add role
                      </button>
                      <button
                        onClick={() => handleRemove(s._id)}
                        className="p-1.5 rounded-lg border border-gray-200 hover:bg-red-50 transition"
                      >
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Add Staff Member</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                  <X size={16} className="text-gray-500" />
                </button>
              </div>
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
              )}
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  <label className={labelCls}>Staff Member&apos;s User ID *</label>
                  <input
                    required
                    className={inputCls}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Their unique user ID from signup"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    They must already have an account (see the general sign-up page) — ask for their user ID.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Role *</label>
                  <select
                    required
                    className={inputCls}
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                  >
                    <option value="">Select a role…</option>
                    {roles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  {roleCode && (
                    <p className="text-[10px] text-gray-400 mt-1">
                      {roles.find((r) => r.code === roleCode)?.description}
                    </p>
                  )}
                  <p className="text-[10px] text-gray-400 mt-1">
                    This is what actually grants access — the same role can be given to
                    multiple people (e.g. three CCOs), and one person can hold several
                    roles at once via &quot;+ Add role&quot;.
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={memberType} onChange={(e) => setMemberType(e.target.value)}>
                    {availableMemberTypes.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Display Title (optional)</label>
                  <input
                    className={inputCls}
                    value={vendorRole}
                    onChange={(e) => setVendorRole(e.target.value)}
                    placeholder="Defaults to the role name above"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 disabled:opacity-50 transition"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 size={14} className="animate-spin" /> Adding…
                    </span>
                  ) : (
                    "Add Staff Member"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

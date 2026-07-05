"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Building2, X, ChevronDown, Check, Loader2, UserCog, Shield } from "lucide-react";

interface Business {
  _id: string;
  name: string;
  brandName?: string;
  businessCode?: string;
}

interface UserBusiness {
  businessId: string;
  name: string;
  brandName?: string;
  businessCode?: string;
  memberType: string;
  status: string;
  isDefaultBusiness: boolean;
}

interface UserRecord {
  _id: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  businesses: UserBusiness[];
}

const MEMBER_TYPES = ["EMPLOYEE", "VENDOR", "CUSTOMER", "OWNER"];

export default function UsersPage() {
  const [users, setUsers]               = useState<UserRecord[]>([]);
  const [businesses, setBusinesses]     = useState<Business[]>([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [panelOpen, setPanelOpen]       = useState(false);
  const [bizDropdown, setBizDropdown]   = useState(false);
  const [assignBiz, setAssignBiz]       = useState("");
  const [assignType, setAssignType]     = useState("EMPLOYEE");
  const [assignDefault, setAssignDefault] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState("");

  useEffect(() => {
    fetchUsers();
    fetchBusinesses();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=50`);
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBusinesses() {
    try {
      const res  = await fetch("/api/auth/me");
      const data = await res.json();
      if (data.success) setBusinesses(data.businesses || []);
    } catch { /* silent */ }
  }

  async function openPanel(user: UserRecord) {
    setSelectedUser(user);
    setPanelOpen(true);
    setBizDropdown(false);
    setAssignBiz("");
    setAssignType("EMPLOYEE");
    setAssignDefault(false);
  }

  async function assignBusiness() {
    if (!selectedUser || !assignBiz) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser._id || selectedUser.id}/businesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: assignBiz,
          memberType: assignType,
          isDefault:  assignDefault,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("Business assigned successfully");
        // Refresh this user's data
        const found = businesses.find((b) => b._id === assignBiz);
        if (found) {
          const newBiz: UserBusiness = {
            businessId:        found._id,
            name:              found.name,
            brandName:         found.brandName,
            businessCode:      found.businessCode,
            memberType:        assignType,
            status:            "ACTIVE",
            isDefaultBusiness: assignDefault,
          };
          setSelectedUser((prev) => {
            if (!prev) return prev;
            const filtered = prev.businesses.filter((b) => b.businessId !== assignBiz);
            return { ...prev, businesses: [...filtered, newBiz] };
          });
          setUsers((prev) =>
            prev.map((u) => {
              if ((u._id || u.id) === (selectedUser._id || selectedUser.id)) {
                const filtered = u.businesses.filter((b) => b.businessId !== assignBiz);
                return { ...u, businesses: [...filtered, newBiz] };
              }
              return u;
            })
          );
        }
        setAssignBiz("");
        setAssignDefault(false);
        setBizDropdown(false);
      } else {
        setToast(data.message || "Failed to assign");
      }
    } catch {
      setToast("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function removeBusiness(userId: string, businessId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/businesses`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (data.success) {
        setToast("Business removed");
        setSelectedUser((prev) => {
          if (!prev) return prev;
          return { ...prev, businesses: prev.businesses.filter((b) => b.businessId !== businessId) };
        });
        setUsers((prev) =>
          prev.map((u) => {
            if ((u._id || u.id) === userId) {
              return { ...u, businesses: u.businesses.filter((b) => b.businessId !== businessId) };
            }
            return u;
          })
        );
      } else {
        setToast(data.message || "Failed");
      }
    } catch {
      setToast("Network error");
    }
  }

  const filtered = users.filter(
    (u) =>
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm text-gray-900 shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500">Admin</p>
          <h1 className="mt-2 text-4xl font-semibold">User Management</h1>
        </div>
      </div>

      {/* Search + refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers()}
            placeholder="Search users by name or email…"
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none"
          />
        </div>
        <button
          onClick={fetchUsers}
          className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm hover:bg-gray-100 transition"
        >
          Search
        </button>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-gray-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">No users found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.4em] text-gray-500 font-normal">User</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.4em] text-gray-500 font-normal">Role</th>
                <th className="px-6 py-4 text-left text-[10px] uppercase tracking-[0.4em] text-gray-500 font-normal">Businesses</th>
                <th className="px-6 py-4 text-right text-[10px] uppercase tracking-[0.4em] text-gray-500 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u._id || u.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{u.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
                      <Shield size={10} />
                      {u.role || "USER"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {(u.businesses || []).length === 0 ? (
                      <span className="text-xs text-gray-600">None assigned</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(u.businesses || []).slice(0, 3).map((b) => (
                          <span key={b.businessId} className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-500">
                            <Building2 size={9} />
                            {b.brandName || b.name || b.businessId?.slice(-6)}
                          </span>
                        ))}
                        {(u.businesses || []).length > 3 && (
                          <span className="text-xs text-gray-600">+{(u.businesses || []).length - 3}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openPanel(u)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs hover:bg-gray-100 transition"
                    >
                      <UserCog size={12} />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Side panel */}
      {panelOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />
          <div className="w-full max-w-md bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold">{selectedUser.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>
              </div>
              <button onClick={() => setPanelOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 px-6 py-6 space-y-6">

              {/* Current businesses */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-3">Business Access</p>
                {selectedUser.businesses.length === 0 ? (
                  <p className="text-sm text-gray-600">No businesses assigned</p>
                ) : (
                  <div className="space-y-2">
                    {selectedUser.businesses.map((b) => (
                      <div key={b.businessId} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{b.brandName || b.name || b.businessId}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-gray-500">{b.memberType}</span>
                            {b.isDefaultBusiness && (
                              <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => removeBusiness(selectedUser._id || selectedUser.id || "", b.businessId)}
                          className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Remove access"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assign new business */}
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <p className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-4">Assign Business</p>

                {/* Business select */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1.5">Business</label>
                  <div className="relative">
                    <select
                      value={assignBiz}
                      onChange={(e) => setAssignBiz(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-gray-400 appearance-none"
                    >
                      <option value="">Select a business…</option>
                      {businesses.map((b) => (
                        <option key={b._id} value={b._id} className="bg-white">
                          {b.brandName || b.name} {b.businessCode ? `(${b.businessCode})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  </div>
                </div>

                {/* Member type */}
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1.5">Role in Business</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MEMBER_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => setAssignType(t)}
                        className={`rounded-xl border px-3 py-2 text-xs transition ${
                          assignType === t
                            ? "border-gray-300 bg-gray-50 text-gray-900"
                            : "border-gray-200 bg-white text-gray-500 hover:text-gray-900"
                        }`}
                      >
                        {assignType === t && <Check size={10} className="inline mr-1" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Set as default */}
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignDefault}
                    onChange={(e) => setAssignDefault(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-500">Set as default business</span>
                </label>

                <button
                  onClick={assignBusiness}
                  disabled={!assignBiz || saving}
                  className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? "Assigning…" : "Assign Business"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

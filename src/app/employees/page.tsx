"use client";

import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/layout";
import {
  Users,
  Plus,
  Search,
  X,
  Edit2,
  Eye,
  Trash2,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  ChevronDown,
  Phone,
  Mail,
  Calendar,
  Briefcase,
  IndianRupee,
  AlertCircle,
} from "lucide-react";
import { useActiveBusinessId } from "@/hooks/useActiveBusinessId";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRef {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
}

interface Employee {
  _id: string;
  userId: UserRef;
  employeeId: string;
  department?: string;
  designation?: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERN";
  status: "ACTIVE" | "ON_LEAVE" | "TERMINATED";
  joiningDate?: string;
  salary?: number;
  emergencyContact?: { name?: string; phone?: string; relationship?: string };
  createdAt: string;
}

interface Stats {
  total: number;
  active: number;
  onLeave: number;
  newThisMonth: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEPARTMENTS = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "HR",
  "Operations",
  "Legal",
  "Product",
  "Design",
  "Customer Support",
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "ON_LEAVE", label: "On Leave" },
  { value: "TERMINATED", label: "Terminated" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    ACTIVE: "text-emerald-700 bg-emerald-500/10",
    ON_LEAVE: "text-amber-700 bg-amber-500/10",
    TERMINATED: "text-red-700 bg-red-500/10",
  };
  const label: Record<string, string> = {
    ACTIVE: "Active",
    ON_LEAVE: "On Leave",
    TERMINATED: "Terminated",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "text-gray-500 bg-white"}`}>
      {label[status] ?? status}
    </span>
  );
}

function empTypeBadge(type: string) {
  const map: Record<string, string> = {
    FULL_TIME: "text-blue-700 bg-blue-500/10",
    PART_TIME: "text-purple-400 bg-purple-500/10",
    CONTRACT: "text-orange-400 bg-orange-500/10",
    INTERN: "text-gray-500 bg-white",
  };
  const label: Record<string, string> = {
    FULL_TIME: "Full Time",
    PART_TIME: "Part Time",
    CONTRACT: "Contract",
    INTERN: "Intern",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[type] ?? "text-gray-500 bg-white"}`}>
      {label[type] ?? type}
    </span>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface RoleOption {
  code: string;
  name: string;
  description?: string;
}

function EmployeeModal({
  mode,
  employee,
  businessId,
  onClose,
  onSaved,
}: {
  mode: "add" | "edit";
  employee?: Employee;
  businessId: string;
  onClose: () => void;
  onSaved: (createdLogin?: { username: string; temporaryPassword: string }) => void;
}) {
  const [form, setForm] = useState({
    employeeUserId: "",
    employeeUserEmail: "",
    employeeId: "",
    department: employee?.department ?? "",
    designation: employee?.designation ?? "",
    employmentType: employee?.employmentType ?? "FULL_TIME",
    joiningDate: employee?.joiningDate ? employee.joiningDate.split("T")[0] : "",
    salary: employee?.salary?.toString() ?? "",
    status: employee?.status ?? "ACTIVE",
    ecName: employee?.emergencyContact?.name ?? "",
    ecPhone: employee?.emergencyContact?.phone ?? "",
    ecRelationship: employee?.emergencyContact?.relationship ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState<UserRef[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRef | null>(
    mode === "edit" ? (employee?.userId as UserRef) : null
  );
  const [userDropOpen, setUserDropOpen] = useState(false);
  // "existing" picks an already-registered account (the original flow);
  // "new" creates a brand-new login for someone who has never signed up
  // anywhere -- per explicit direction, this page shouldn't be limited to
  // only attaching pre-existing accounts.
  const [addMode, setAddMode] = useState<"existing" | "new">("existing");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [roleCode, setRoleCode] = useState("");

  // Fetched regardless of add/edit mode -- "Designation" is now a picker
  // scoped strictly to this business's own roles (Admin > Access), not a
  // free-text field, per explicit direction.
  useEffect(() => {
    if (!businessId) return;
    fetch(`/api/admin/roles?businessId=${businessId}`)
      .then((r) => r.json())
      .then((d) => setRoles(d.roles || []))
      .catch(() => setRoles([]));
  }, [businessId]);

  const searchUsers = useCallback(
    async (q: string) => {
      if (!q || q.length < 2) { setUserResults([]); return; }
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&limit=10`);
        const d = await res.json();
        if (d.success) setUserResults(d.users ?? []);
      } catch {
        setUserResults([]);
      }
    },
    []
  );

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch, searchUsers]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setError("");
    if (mode === "add" && addMode === "existing" && !selectedUser) { setError("Please select a user"); return; }
    if (mode === "add" && addMode === "new" && !newName.trim()) { setError("Name is required"); return; }
    setSaving(true);
    try {
      let res: Response;
      if (mode === "add" && addMode === "new") {
        res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            createNew: true,
            name: newName,
            email: newEmail || undefined,
            phone: newPhone || undefined,
            roleCode: roleCode || undefined,
            department: form.department || undefined,
            designation: form.designation || undefined,
            employmentType: form.employmentType,
            joiningDate: form.joiningDate || undefined,
            salary: form.salary || undefined,
            status: form.status,
            emergencyContact: form.ecName || form.ecPhone
              ? { name: form.ecName, phone: form.ecPhone, relationship: form.ecRelationship }
              : undefined,
          }),
        });
      } else if (mode === "add") {
        res = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            name: selectedUser!.name,
            email: selectedUser!.email,
            userId: selectedUser!._id,
            department: form.department || undefined,
            designation: form.designation || undefined,
            employmentType: form.employmentType,
            joiningDate: form.joiningDate || undefined,
            salary: form.salary || undefined,
            status: form.status,
            emergencyContact: form.ecName || form.ecPhone
              ? { name: form.ecName, phone: form.ecPhone, relationship: form.ecRelationship }
              : undefined,
          }),
        });
      } else {
        res = await fetch(`/api/employees/${employee!._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: form.department || undefined,
            designation: form.designation || undefined,
            employmentType: form.employmentType,
            joiningDate: form.joiningDate || undefined,
            salary: form.salary || undefined,
            status: form.status,
            emergencyContact: form.ecName || form.ecPhone
              ? { name: form.ecName, phone: form.ecPhone, relationship: form.ecRelationship }
              : undefined,
          }),
        });
      }
      const d = await res.json();
      if (!d.success) { setError(d.error ?? "Failed to save"); return; }
      onSaved(d.login);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">
            {mode === "add" ? "Add Employee" : "Edit Employee"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 text-xs">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {mode === "add" && (
            <div className="flex rounded-xl border border-gray-200 p-1 bg-white text-sm">
              <button
                type="button"
                onClick={() => setAddMode("existing")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${addMode === "existing" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}
              >
                Existing user
              </button>
              <button
                type="button"
                onClick={() => setAddMode("new")}
                className={`flex-1 py-1.5 rounded-lg font-medium transition ${addMode === "new" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}
              >
                Create new employee
              </button>
            </div>
          )}

          {/* User selection (add mode, existing user) */}
          {mode === "add" && addMode === "existing" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">User *</label>
              {selectedUser ? (
                <div className="flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900">{selectedUser.name}</p>
                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                  </div>
                  <button
                    onClick={() => { setSelectedUser(null); setUserSearch(""); }}
                    className="text-gray-500 hover:text-gray-900"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserDropOpen(true); }}
                    onFocus={() => setUserDropOpen(true)}
                    placeholder="Search by name or email…"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                  />
                  {userDropOpen && userResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xl">
                      {userResults.map((u) => (
                        <button
                          key={u._id}
                          className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
                          onClick={() => { setSelectedUser(u); setUserDropOpen(false); setUserSearch(""); }}
                        >
                          <p className="text-sm text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* New employee's own details (add mode, brand-new account) */}
          {mode === "add" && addMode === "new" && (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Full Name *</label>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Leave blank if they have none"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Phone (optional)</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role (optional)</label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  title="Select a role"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
                >
                  <option value="">No role — assign later</option>
                  {roles.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <p className="text-[10px] text-gray-400">
                A brand-new login is created for this person — you&apos;ll get their ID and a
                temporary password to hand them once saved.
              </p>
            </div>
          )}

          {/* Employee ID */}
          {mode === "add" && addMode === "existing" && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Employee ID (auto-generated if blank)</label>
              <input
                value={form.employeeId}
                onChange={(e) => set("employeeId", e.target.value)}
                placeholder="EMP0001"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Department */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Department</label>
              <select
                value={form.department}
                onChange={(e) => set("department", e.target.value)}
                title="Select department"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
              >
                <option value="">Select…</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Designation -- a picker over this business's own roles
                (Admin > Access), not free text, so it can never drift from
                what actually exists for this business. */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Designation</label>
              <select
                value={form.designation}
                onChange={(e) => set("designation", e.target.value)}
                title="Select designation"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
              >
                <option value="">Select…</option>
                {roles.map((r) => (
                  <option key={r.code} value={r.name}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Employment Type */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Employment Type</label>
              <select
                value={form.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
                title="Select employment type"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                title="Select employee status"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Joining Date */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Joining Date</label>
              <input
                type="date"
                value={form.joiningDate}
                onChange={(e) => set("joiningDate", e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* Salary */}
            <div>
              <label className="text-xs text-gray-500 block mb-1">Monthly Salary (₹)</label>
              <input
                type="number"
                value={form.salary}
                onChange={(e) => set("salary", e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="50000"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Emergency Contact</p>
            <div className="space-y-2">
              <input
                value={form.ecName}
                onChange={(e) => set("ecName", e.target.value)}
                placeholder="Contact name"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.ecPhone}
                  onChange={(e) => set("ecPhone", e.target.value)}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
                <input
                  value={form.ecRelationship}
                  onChange={(e) => set("ecRelationship", e.target.value)}
                  placeholder="Relationship"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "add" ? "Add Employee" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── View Detail Modal ────────────────────────────────────────────────────────

interface EmployeeRole { _id: string; name: string; code: string }

function RoleAssignmentSection({ userId, businessId }: { userId: string; businessId: string }) {
  const [currentRoles, setCurrentRoles] = useState<EmployeeRole[]>([]);
  const [availableRoles, setAvailableRoles] = useState<EmployeeRole[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [userRes, rolesRes] = await Promise.all([
        fetch(`/api/admin/users/${userId}`),
        fetch(`/api/admin/roles?businessId=${businessId}`),
      ]);
      const userData = await userRes.json();
      const rolesData = await rolesRes.json();
      setCurrentRoles((userData.user?.roles || []).filter(Boolean));
      setAvailableRoles(rolesData.roles || []);
    } catch {
      /* leave lists empty on failure */
    }
  }, [userId, businessId]);

  useEffect(() => { load(); }, [load]);

  async function assign() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleId: selected, businessId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Failed to assign role"); return; }
      setSelected("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(roleId: string) {
    setBusy(true);
    try {
      await fetch(`/api/users/${userId}/roles/${roleId}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const assignable = availableRoles.filter((r) => !currentRoles.some((cr) => cr._id === r._id));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Role &amp; Access</p>
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      {currentRoles.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {currentRoles.map((r) => (
            <span key={r._id} className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
              {r.name || r.code}
              <button onClick={() => remove(r._id)} disabled={busy} className="opacity-60 hover:opacity-100">
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-3">No role assigned yet.</p>
      )}
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          title="Select a role to assign"
          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none"
        >
          <option value="">Select a role…</option>
          {assignable.map((r) => (
            <option key={r._id} value={r._id}>{r.name}</option>
          ))}
        </select>
        <button
          onClick={assign}
          disabled={!selected || busy}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          Assign
        </button>
      </div>
    </div>
  );
}

function ViewModal({ employee, businessId, onClose, onEdit }: { employee: Employee; businessId: string; onClose: () => void; onEdit: () => void }) {
  const user = employee.userId as UserRef;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-900">Employee Details</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-400 flex items-center gap-1.5">
              <Edit2 size={11} /> Edit
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Avatar + name */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-gray-50 flex items-center justify-center text-xl font-bold text-gray-900">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{employee.designation || "—"}</p>
              <div className="flex items-center gap-2 mt-1">
                {statusBadge(employee.status)}
                {empTypeBadge(employee.employmentType)}
              </div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Briefcase size={13} />, label: "Employee ID", value: employee.employeeId },
              { icon: <Users size={13} />, label: "Department", value: employee.department || "—" },
              { icon: <Mail size={13} />, label: "Email", value: user?.email },
              { icon: <Phone size={13} />, label: "Phone", value: user?.phone || "—" },
              { icon: <Calendar size={13} />, label: "Joining Date", value: fmtDate(employee.joiningDate) },
              { icon: <IndianRupee size={13} />, label: "Salary / Month", value: employee.salary ? inr(employee.salary) : "—" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-3">
                <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                  {item.icon}
                  <span className="text-xs">{item.label}</span>
                </div>
                <p className="text-sm text-gray-900 font-medium truncate">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Role & Access */}
          {user?._id && <RoleAssignmentSection userId={user._id} businessId={businessId} />}

          {/* Emergency Contact */}
          {(employee.emergencyContact?.name || employee.emergencyContact?.phone) && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Emergency Contact</p>
              <div className="space-y-1.5">
                {employee.emergencyContact.name && (
                  <p className="text-sm text-gray-900">{employee.emergencyContact.name}</p>
                )}
                {employee.emergencyContact.relationship && (
                  <p className="text-xs text-gray-500">{employee.emergencyContact.relationship}</p>
                )}
                {employee.emergencyContact.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Phone size={11} /> {employee.emergencyContact.phone}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const { businessId } = useActiveBusinessId();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, onLeave: 0, newThisMonth: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [createdLogin, setCreatedLogin] = useState<{ username: string; temporaryPassword: string } | null>(null);

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId });
      if (search) params.set("search", search);
      if (filterDept) params.set("department", filterDept);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/employees?${params}`);
      const d = await res.json();
      if (d.success) {
        setEmployees(d.employees ?? []);
        if (d.stats) setStats(d.stats);
      }
    } finally {
      setLoading(false);
    }
  }, [businessId, search, filterDept, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this employee profile?")) return;
    setDeleting(id);
    try {
      await fetch(`/api/employees/${id}`, { method: "DELETE" });
      await load();
    } finally {
      setDeleting(null);
    }
  };

  // Unique departments from current data
  const depts = Array.from(new Set(employees.map((e) => e.department).filter(Boolean))) as string[];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Employees</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage your HR team and employee records</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800"
          >
            <Plus size={14} /> Add Employee
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Employees", value: stats.total, icon: <Users size={16} className="text-gray-500" /> },
            { label: "Active", value: stats.active, icon: <UserCheck size={16} className="text-emerald-700" /> },
            { label: "On Leave", value: stats.onLeave, icon: <Clock size={16} className="text-amber-700" /> },
            { label: "New This Month", value: stats.newThisMonth, icon: <TrendingUp size={16} className="text-blue-700" /> },
          ].map((s, i) => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{s.label}</p>
                {s.icon}
              </div>
              <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, ID…"
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400"
            />
          </div>
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            title="Filter by department"
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none min-w-[150px]"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            title="Filter by status"
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none min-w-[130px]"
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          {(filterDept || filterStatus || search) && (
            <button
              onClick={() => { setSearch(""); setFilterDept(""); setFilterStatus(""); }}
              className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-white">
              <tr>
                {["Employee", "Department", "Designation", "Type", "Status", "Joining Date", "Salary", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">
                    Loading…
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="py-16 text-center">
                      <Users size={36} className="mx-auto text-gray-700 mb-3" />
                      <p className="text-sm text-gray-500 mb-1">No employees found</p>
                      <p className="text-xs text-gray-600 mb-4">Add your first employee to get started</p>
                      <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 mx-auto"
                      >
                        <Plus size={14} /> Add Employee
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const user = emp.userId as UserRef;
                  return (
                    <tr key={emp._id} className="hover:bg-gray-50 transition-colors">
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-gray-50 flex items-center justify-center text-sm font-semibold text-gray-900 flex-shrink-0">
                            {user?.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 font-medium truncate">{user?.name ?? "Unknown"}</p>
                            <p className="text-xs text-gray-500 truncate">{emp.employeeId}</p>
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{emp.department || "—"}</span>
                      </td>

                      {/* Designation */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{emp.designation || "—"}</span>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3">{empTypeBadge(emp.employmentType)}</td>

                      {/* Status */}
                      <td className="px-4 py-3">{statusBadge(emp.status)}</td>

                      {/* Joining Date */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-500 whitespace-nowrap">{fmtDate(emp.joiningDate)}</span>
                      </td>

                      {/* Salary */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {emp.salary ? inr(emp.salary) : "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setViewEmployee(emp)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                            title="View details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => setEditEmployee(emp)}
                            className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-50 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(emp._id)}
                            disabled={deleting === emp._id}
                            className="p-1.5 text-gray-500 hover:text-red-700 rounded-lg hover:bg-red-500/[0.06] transition-colors disabled:opacity-40"
                            title="Remove"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Row count */}
        {!loading && employees.length > 0 && (
          <p className="text-xs text-gray-600 text-right">
            Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {createdLogin && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start justify-between gap-4">
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Employee created — share these login details now, they won&apos;t be shown again:</p>
            <p className="mt-1 font-mono text-xs">
              ID: {createdLogin.username} &nbsp;•&nbsp; Temp password: {createdLogin.temporaryPassword}
            </p>
          </div>
          <button onClick={() => setCreatedLogin(null)} className="p-1 rounded-lg hover:bg-emerald-100 flex-shrink-0">
            <X size={16} className="text-emerald-700" />
          </button>
        </div>
      )}

      {/* Modals */}
      {showAdd && businessId && (
        <EmployeeModal
          mode="add"
          businessId={businessId}
          onClose={() => setShowAdd(false)}
          onSaved={(login) => { setShowAdd(false); if (login) setCreatedLogin(login); load(); }}
        />
      )}

      {editEmployee && businessId && (
        <EmployeeModal
          mode="edit"
          employee={editEmployee}
          businessId={businessId}
          onClose={() => setEditEmployee(null)}
          onSaved={() => { setEditEmployee(null); load(); }}
        />
      )}

      {viewEmployee && businessId && (
        <ViewModal
          employee={viewEmployee}
          businessId={businessId}
          onClose={() => setViewEmployee(null)}
          onEdit={() => { setEditEmployee(viewEmployee); setViewEmployee(null); }}
        />
      )}
    </Layout>
  );
}

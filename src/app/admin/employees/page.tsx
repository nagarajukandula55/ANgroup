'use client'

import { useState, useEffect, useCallback, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Users,
  UserCheck,
  UserMinus,
  Calendar,
  Search,
  Edit2,
  Eye,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  IndianRupee,
  AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
// Employee shape mirrors src/models/Employee.ts (the model actually backing
// GET/POST /api/employees) — note this is a flat name/email/phone record,
// NOT the separate EmployeeProfile/userId-populated model used by some
// other UI attempts. We keep userId optional/loose here because the API
// can return either a populated user object or a raw id/undefined.
interface UserRef {
  _id: string
  name: string
  email: string
  phone?: string
}

interface Employee {
  _id: string
  employeeId?: string
  userId?: { name: string; email: string } | string
  name?: string
  email?: string
  phone?: string
  department?: string
  designation?: string
  employmentType?: string
  status?: string
  joiningDate?: string
  salary?: number
  emergencyContact?: { name?: string; phone?: string; relation?: string }
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  ON_LEAVE: 'bg-yellow-500/20 text-yellow-400',
  INACTIVE: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-500/20 text-red-400',
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

// Employee name can come from a populated userId (legacy records created
// through the old /employees flow) or from the flat name/email fields that
// the current POST /api/employees route actually writes. Check both so
// rows never render "Unknown" for employees created via the new form.
function getEmpName(emp: Employee): string {
  if (emp.name) return emp.name
  if (!emp.userId) return 'Unknown'
  if (typeof emp.userId === 'string') return emp.userId
  return emp.userId.name ?? emp.userId.email ?? 'Unknown'
}

function getEmpEmail(emp: Employee): string {
  if (emp.email) return emp.email
  if (emp.userId && typeof emp.userId !== 'string') return emp.userId.email ?? ''
  return ''
}

export default function EmployeesPage() {
  const router = useRouter()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // View / edit / delete state — merged in from the orphaned root
  // src/app/employees/page.tsx, which had a fuller CRUD flow than this
  // page did. Kept as separate pieces of state (rather than one big modal
  // union) to match this page's existing flat-state style.
  const [viewEmployee, setViewEmployee] = useState<Employee | null>(null)
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    designation: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: '',
    salary: '',
  })

  // User-search autocomplete, merged in from the root page. It calls
  // /api/users?search=&limit=10 (admin-only endpoint) to look up an
  // existing platform user so their name/email/phone can be prefilled
  // into the employee form instead of retyped by hand. Selecting a user
  // does NOT change the POST contract — /api/employees (Employee model)
  // stores name/email/phone directly, it has no employeeUserId field —
  // so this is purely a prefill convenience, not a foreign-key link.
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<UserRef[]>([])
  const [userDropOpen, setUserDropOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRef | null>(null)

  const searchUsers = useCallback(async (q: string) => {
    if (!q || q.length < 2) {
      setUserResults([])
      return
    }
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(q)}&limit=10`)
      const d = await res.json()
      if (d.success) setUserResults(d.users ?? [])
    } catch {
      setUserResults([])
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300)
    return () => clearTimeout(t)
  }, [userSearch, searchUsers])

  function pickUser(u: UserRef) {
    setSelectedUser(u)
    setUserDropOpen(false)
    setUserSearch('')
    // Prefill the flat fields the API actually persists.
    setForm((p: typeof form) => ({ ...p, name: u.name ?? p.name, email: u.email ?? p.email, phone: u.phone ?? p.phone }))
  }

  function clearSelectedUser() {
    setSelectedUser(null)
    setUserSearch('')
  }

  // businessId resolution stays exactly as it was in this page — via
  // /api/auth/me — so we don't introduce a second, competing mechanism
  // (the root page used localStorage.getItem('businessId'), which is not
  // this page's pattern and was deliberately NOT carried over).
  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const d = await res.json()
          const user = d.user ?? d
          const bId = user.activeBusinessId ?? user.businessId ?? null
          setBusinessId(bId)
          if (bId) {
            fetchEmployees(bId)
          } else {
            setLoading(false)
          }
        } else {
          setLoading(false)
        }
      } catch {
        setError('Failed to load user info')
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchEmployees(bId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/employees?businessId=${bId}`)
      if (res.ok) {
        const d = await res.json()
        setEmployees(Array.isArray(d) ? d : (d.employees ?? []))
      } else {
        setError('Failed to load employees')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setForm({
      name: '',
      email: '',
      phone: '',
      department: '',
      designation: '',
      employmentType: 'FULL_TIME',
      status: 'ACTIVE',
      joiningDate: '',
      salary: '',
    })
    clearSelectedUser()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          businessId,
          salary: parseFloat(form.salary) || 0,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.success === false) {
        throw new Error(d.message ?? d.error ?? 'Failed to add employee')
      }
      setShowForm(false)
      resetForm()
      if (businessId) fetchEmployees(businessId)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  // Edit flow, merged in from the root page's fuller CRUD. PATCHes
  // /api/employees/[id]. Note: that route is backed by the EmployeeProfile
  // model rather than the Employee model used by the list/create route —
  // a pre-existing backend inconsistency, not something introduced here.
  // It's still the only edit endpoint available, so we call it as-is;
  // fixing that mismatch is a backend task outside this merge's scope.
  const [editForm, setEditForm] = useState({
    department: '',
    designation: '',
    employmentType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: '',
    salary: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function openEdit(emp: Employee) {
    setEditForm({
      department: emp.department ?? '',
      designation: emp.designation ?? '',
      employmentType: emp.employmentType ?? 'FULL_TIME',
      status: emp.status ?? 'ACTIVE',
      joiningDate: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      salary: emp.salary?.toString() ?? '',
    })
    setEditError(null)
    setEditEmployee(emp)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editEmployee) return
    setEditSubmitting(true)
    setEditError(null)
    try {
      const res = await fetch(`/api/employees/${editEmployee._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department: editForm.department || undefined,
          designation: editForm.designation || undefined,
          employmentType: editForm.employmentType,
          joiningDate: editForm.joiningDate || undefined,
          salary: editForm.salary || undefined,
          status: editForm.status,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok || d.success === false) {
        throw new Error(d.error ?? 'Failed to save changes')
      }
      setEditEmployee(null)
      if (businessId) fetchEmployees(businessId)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this employee profile?')) return
    setDeletingId(id)
    try {
      await fetch(`/api/employees/${id}`, { method: 'DELETE' })
      if (businessId) fetchEmployees(businessId)
    } finally {
      setDeletingId(null)
    }
  }

  const now = new Date()
  const total = employees.length
  const active = employees.filter((e: Employee) => e.status === 'ACTIVE').length
  const onLeave = employees.filter((e: Employee) => e.status === 'ON_LEAVE').length
  const newThisMonth = employees.filter((e: Employee) => {
    if (!e.joiningDate) return false
    const d = new Date(e.joiningDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const departments: string[] = ['ALL', ...Array.from(new Set<string>(employees.map((e: Employee) => e.department ?? '').filter(Boolean)))]

  const filtered = employees.filter((emp: Employee) => {
    const name = getEmpName(emp).toLowerCase()
    const matchSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      emp.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
      getEmpEmail(emp).toLowerCase().includes(search.toLowerCase())
    const matchDept = deptFilter === 'ALL' || emp.department === deptFilter
    const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center gap-4">
        <Users className="w-12 h-12 text-gray-400" />
        <h2 className="text-xl font-medium">No Business Selected</h2>
        <p className="text-gray-400">Select a business first to manage employees.</p>
        <button
          onClick={() => router.push('/admin')}
          className="mt-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition"
        >
          Go to Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Employees</h1>
            <p className="text-sm text-gray-400">Workforce management</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: 'Total', value: String(total), filterValue: 'ALL' as const },
            { icon: UserCheck, label: 'Active', value: String(active), filterValue: 'ACTIVE' as const },
            { icon: UserMinus, label: 'On Leave', value: String(onLeave), filterValue: 'ON_LEAVE' as const },
            { icon: Calendar, label: 'New This Month', value: String(newThisMonth), filterValue: null },
          ].map(({ icon: Icon, label, value, filterValue }) => {
            const isActive = filterValue !== null && statusFilter === filterValue;
            return (
              <button
                key={label}
                type="button"
                disabled={filterValue === null}
                onClick={() =>
                  filterValue &&
                  setStatusFilter(statusFilter === filterValue ? 'ALL' : filterValue)
                }
                className={`text-left rounded-2xl border bg-white p-6 transition-colors ${
                  filterValue === null ? 'cursor-default' : ''
                } ${
                  isActive
                    ? 'border-gray-900 ring-2 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-700" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-white/20"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setDeptFilter(e.target.value)}
            title="Filter by department"
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none"
          >
            {departments.map((d: string) => (
              <option key={d} value={d} className="bg-white">
                {d === 'ALL' ? 'All Departments' : d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
            title="Filter by status"
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none"
          >
            {['ALL', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'].map((s: string) => (
              <option key={s} value={s} className="bg-white">
                {s === 'ALL' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">ID</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Department</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Designation</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Type</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((emp: Employee) => (
                  <tr key={emp._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-gray-400 font-mono text-xs">{emp.employeeId ?? emp._id.slice(-6)}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{getEmpName(emp)}</td>
                    <td className="px-6 py-3 text-gray-500">{emp.department ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{emp.designation ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{emp.employmentType ?? '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[emp.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                        {emp.status ?? 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewEmployee(emp)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(emp)}
                          className="p-1.5 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(emp._id)}
                          disabled={deletingId === emp._id}
                          className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition disabled:opacity-40"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: Add Employee */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Add Employee</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}

              {/* User-search autocomplete: merged in from the orphaned root
                  src/app/employees/page.tsx. Purely a lookup/prefill helper
                  against /api/users — selecting a result fills name/email/
                  phone below rather than sending a separate user reference,
                  since the Employee model/POST route has no such field. */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Link Existing User (optional)</label>
                {selectedUser ? (
                  <div className="flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl">
                    <div>
                      <p className="text-sm text-gray-900">{selectedUser.name}</p>
                      <p className="text-xs text-gray-500">{selectedUser.email}</p>
                    </div>
                    <button type="button" onClick={clearSelectedUser} className="text-gray-500 hover:text-gray-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setUserSearch(e.target.value)
                        setUserDropOpen(true)
                      }}
                      onFocus={() => setUserDropOpen(true)}
                      placeholder="Search by name or email…"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-white/20"
                    />
                    {userDropOpen && userResults.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
                        {userResults.map((u: UserRef) => (
                          <button
                            type="button"
                            key={u._id}
                            className="w-full px-4 py-2.5 text-left hover:bg-gray-50 transition"
                            onClick={() => pickUser(u)}
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

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Employee full name"
                  value={form.name}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={form.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phone</label>
                <input
                  type="text"
                  placeholder="9876543210"
                  value={form.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Department *</label>
                <input
                  type="text"
                  required
                  placeholder="Engineering"
                  value={form.department}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, department: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Designation *</label>
                <input
                  type="text"
                  required
                  placeholder="Software Engineer"
                  value={form.designation}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, designation: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Joining Date *</label>
                <input
                  type="date"
                  required
                  placeholder="Select joining date"
                  value={form.joiningDate}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, joiningDate: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Salary (₹)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={form.salary}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setForm((p: typeof form) => ({ ...p, salary: e.target.value }))}
                  onFocus={(e) => e.target.select()}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Employment Type</label>
                <select
                  value={form.employmentType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((p: typeof form) => ({ ...p, employmentType: e.target.value }))}
                  title="Select employment type"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                >
                  {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map((t: string) => (
                    <option key={t} value={t} className="bg-white">{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm((p: typeof form) => ({ ...p, status: e.target.value }))}
                  title="Select employee status"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                >
                  {['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'].map((s: string) => (
                    <option key={s} value={s} className="bg-white">{s}</option>
                  ))}
                </select>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View detail modal — merged in from the root page's ViewModal */}
      {viewEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900">Employee Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    openEdit(viewEmployee)
                    setViewEmployee(null)
                  }}
                  className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-400 flex items-center gap-1.5"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => setViewEmployee(null)} className="text-gray-500 hover:text-gray-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-gray-50 flex items-center justify-center text-xl font-bold text-gray-900">
                  {getEmpName(viewEmployee)?.[0]?.toUpperCase() ?? '?'}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">{getEmpName(viewEmployee)}</p>
                  <p className="text-sm text-gray-500">{viewEmployee.designation || '—'}</p>
                  <span className={`inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[viewEmployee.status ?? ''] ?? 'bg-gray-100 text-gray-500'}`}>
                    {viewEmployee.status ?? 'UNKNOWN'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: <Briefcase className="w-3.5 h-3.5" />, label: 'Employee ID', value: viewEmployee.employeeId ?? '—' },
                  { icon: <Users className="w-3.5 h-3.5" />, label: 'Department', value: viewEmployee.department || '—' },
                  { icon: <Mail className="w-3.5 h-3.5" />, label: 'Email', value: getEmpEmail(viewEmployee) || '—' },
                  { icon: <Phone className="w-3.5 h-3.5" />, label: 'Phone', value: viewEmployee.phone || '—' },
                  { icon: <Calendar className="w-3.5 h-3.5" />, label: 'Joining Date', value: fmtDate(viewEmployee.joiningDate) },
                  { icon: <IndianRupee className="w-3.5 h-3.5" />, label: 'Salary / Month', value: viewEmployee.salary ? inr(viewEmployee.salary) : '—' },
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
            </div>
          </div>
        </div>
      )}

      {/* Edit modal — merged in from the root page's fuller edit flow.
          PATCHes /api/employees/[id]; see comment above handleEditSubmit
          about the pre-existing Employee/EmployeeProfile model mismatch. */}
      {editEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-sm font-semibold text-gray-900">Edit Employee</h2>
              <button onClick={() => setEditEmployee(null)} className="text-gray-500 hover:text-gray-900">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {editError && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" /> {editError}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Department</label>
                  <input
                    value={editForm.department}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p: typeof editForm) => ({ ...p, department: e.target.value }))}
                    placeholder="Engineering"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Designation</label>
                  <input
                    value={editForm.designation}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p: typeof editForm) => ({ ...p, designation: e.target.value }))}
                    placeholder="Software Engineer"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Employment Type</label>
                  <select
                    value={editForm.employmentType}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditForm((p: typeof editForm) => ({ ...p, employmentType: e.target.value }))}
                    title="Select employment type"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 outline-none"
                  >
                    {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map((t: string) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => setEditForm((p: typeof editForm) => ({ ...p, status: e.target.value }))}
                    title="Select employee status"
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 outline-none"
                  >
                    {['ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'].map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Joining Date</label>
                  <input
                    type="date"
                    placeholder="Select joining date"
                    value={editForm.joiningDate}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p: typeof editForm) => ({ ...p, joiningDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Monthly Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={editForm.salary}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEditForm((p: typeof editForm) => ({ ...p, salary: e.target.value }))}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setEditEmployee(null)}
                className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:text-gray-900 hover:border-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                disabled={editSubmitting}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

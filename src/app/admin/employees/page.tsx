'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'

interface Employee {
  _id: string
  employeeId?: string
  userId?: { name: string; email: string } | string
  department?: string
  designation?: string
  employmentType?: string
  status?: string
  joiningDate?: string
  salary?: number
}

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/20 text-green-400',
  ON_LEAVE: 'bg-yellow-500/20 text-yellow-400',
  INACTIVE: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-500/20 text-red-400',
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function getEmpName(emp: Employee): string {
  if (!emp.userId) return 'Unknown'
  if (typeof emp.userId === 'string') return emp.userId
  return emp.userId.name ?? emp.userId.email ?? 'Unknown'
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

  const [form, setForm] = useState({
    userId: '',
    department: '',
    designation: '',
    employmentType: 'FULL_TIME',
    joiningDate: '',
    salary: '',
  })

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId, salary: parseFloat(form.salary) || 0 }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to add employee')
      }
      setShowForm(false)
      setForm({ userId: '', department: '', designation: '', employmentType: 'FULL_TIME', joiningDate: '', salary: '' })
      if (businessId) fetchEmployees(businessId)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const now = new Date()
  const total = employees.length
  const active = employees.filter((e) => e.status === 'ACTIVE').length
  const onLeave = employees.filter((e) => e.status === 'ON_LEAVE').length
  const newThisMonth = employees.filter((e) => {
    if (!e.joiningDate) return false
    const d = new Date(e.joiningDate)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const departments = ['ALL', ...Array.from(new Set(employees.map((e) => e.department ?? '').filter(Boolean)))]

  const filtered = employees.filter((emp) => {
    const name = getEmpName(emp).toLowerCase()
    const matchSearch = !search || name.includes(search.toLowerCase()) || emp.employeeId?.toLowerCase().includes(search.toLowerCase())
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
            { icon: Users, label: 'Total', value: String(total) },
            { icon: UserCheck, label: 'Active', value: String(active) },
            { icon: UserMinus, label: 'On Leave', value: String(onLeave) },
            { icon: Calendar, label: 'New This Month', value: String(newThisMonth) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-700" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-white/20"
            />
          </div>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none"
          >
            {departments.map((d) => (
              <option key={d} value={d} className="bg-white">
                {d === 'ALL' ? 'All Departments' : d}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none"
          >
            {['ALL', 'ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED'].map((s) => (
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
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    No employees found
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
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
              {([
                { field: 'userId', label: 'User Email *', type: 'email', required: true, placeholder: 'employee@company.com' },
                { field: 'department', label: 'Department *', type: 'text', required: true, placeholder: 'Engineering' },
                { field: 'designation', label: 'Designation *', type: 'text', required: true, placeholder: 'Software Engineer' },
                { field: 'joiningDate', label: 'Joining Date *', type: 'date', required: true, placeholder: '' },
                { field: 'salary', label: 'Salary (₹)', type: 'number', required: false, placeholder: '50000' },
              ] as const).map(({ field, label, type, required, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    placeholder={placeholder}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Employment Type</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                >
                  {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'].map((t) => (
                    <option key={t} value={t} className="bg-white">{t}</option>
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
    </div>
  )
}

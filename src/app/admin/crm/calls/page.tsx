'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, X, Phone, Clock, AlertCircle,
} from 'lucide-react'

interface Call {
  _id: string
  callNumber: string
  customerName: string
  company?: string
  phone: string
  email?: string
  subject: string
  product?: string
  deviceModel?: string
  brandId?: { name?: string } | string
  status: string
  priority: string
  nextFollowUpAt?: string
  createdAt: string
  assignedTo?: { name?: string; email?: string }
}

interface Brand { _id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-500/10 text-blue-600',
  CONTACTED: 'bg-yellow-500/10 text-yellow-700',
  QUALIFIED: 'bg-purple-500/10 text-purple-700',
  JOB_CREATED: 'bg-cyan-500/10 text-cyan-700',
  IN_PROGRESS: 'bg-indigo-500/10 text-indigo-700',
  CLOSED_WON: 'bg-emerald-500/10 text-emerald-700',
  CLOSED_LOST: 'bg-red-500/10 text-red-700',
  NOT_INTERESTED: 'bg-gray-200 text-gray-500',
  NO_RESPONSE: 'bg-gray-200 text-gray-500',
}

const OPEN_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'IN_PROGRESS'])

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-500',
  MEDIUM: 'bg-blue-100 text-blue-600',
  HIGH: 'bg-orange-100 text-orange-600',
  URGENT: 'bg-red-100 text-red-600',
}

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'JOB_CREATED', 'IN_PROGRESS', 'CLOSED_WON', 'CLOSED_LOST', 'NOT_INTERESTED', 'NO_RESPONSE']

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Ageing since creation, in whole days. Only meaningful while the
// appointment is still open (not yet dispositioned/converted) -- per spec,
// an appointment crossing day 2 should visibly flag as overdue attention.
function ageingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

function AgeingBadge({ call }: { call: Call }) {
  if (!OPEN_STATUSES.has(call.status)) return <span className="text-gray-300 text-xs">—</span>
  const days = ageingDays(call.createdAt)
  const overdue = days >= 2
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
      {days}d
    </span>
  )
}

export default function CrmCallsPage() {
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])

  // A super admin browsing with no active business selected (the "all
  // businesses" view) has no x-active-business-id header, so POST /api/crm/calls
  // would 400 on "businessId is required". Same resolution pattern as
  // admin/employees/page.tsx: read it from /api/auth/me and gate creation
  // on it being present, rather than letting the request fail.
  const [businessId, setBusinessId] = useState<string | null>(null)

  useEffect(() => {
    async function loadBusinessId() {
      try {
        const res = await fetch('/api/auth/me')
        if (res.ok) {
          const d = await res.json()
          const user = d.user ?? d
          setBusinessId(user.activeBusinessId ?? user.businessId ?? null)
        }
      } catch {}
    }
    loadBusinessId()
  }, [])

  useEffect(() => {
    if (!businessId) return
    fetch(`/api/brands?businessId=${businessId}`).then(r => r.json()).then(d => setBrands(d.brands || d.data || [])).catch(() => {})
  }, [businessId])

  // Required set per spec: customer name, phone, email, source, product,
  // device brand, model, and the issue itself -- nothing else. "source" is
  // deliberately just Website (auto/public form) vs User Contact (staff
  // took it directly) rather than the old open-ended text field.
  const [form, setForm] = useState({
    customerName: '', phone: '', email: '',
    source: 'User Contact', product: '', brandId: '', deviceModel: '',
    subject: '',
  })

  const fetchCalls = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/crm/calls${qs}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load appointments')
      setCalls(d.calls || [])
      setStatusCounts(d.statusCounts || {})
    } catch (err: any) {
      setError(err.message || 'Could not load appointments. Please try again.')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) {
      setFormError('Select a business first (top-right business switcher) before creating an appointment.')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/crm/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to create appointment')
      setShowForm(false)
      setForm({ customerName: '', phone: '', email: '', source: 'User Contact', product: '', brandId: '', deviceModel: '', subject: '' })
      fetchCalls()
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const totalOpen = Object.entries(statusCounts)
    .filter(([k]) => !['CLOSED_WON', 'CLOSED_LOST', 'NOT_INTERESTED', 'NO_RESPONSE'].includes(k))
    .reduce((s, [, v]) => s + v, 0)
  const won = statusCounts.CLOSED_WON || 0
  const lost = statusCounts.CLOSED_LOST || 0
  const followUpDue = calls.filter((c) => c.nextFollowUpAt && new Date(c.nextFollowUpAt) <= new Date()).length

  if (loading && calls.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin/crm')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Appointments</h1>
            <p className="text-sm text-gray-400">Appointment entry, disposition, and follow-up pipeline</p>
          </div>
          <button
            onClick={() => router.push('/admin/crm/jobsheets?new=1')}
            className="ml-auto flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <Plus className="w-4 h-4" /> New Job Sheet (no appointment)
          </button>
          <button
            onClick={() => setShowForm(true)}
            disabled={!businessId}
            title={businessId ? undefined : 'Select a business first to create a call'}
            className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>

        {!businessId && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            No business selected — showing appointments across all businesses. Select a business (top-right switcher) to create a new appointment.
          </div>
        )}

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Phone, label: 'Open Appointments', value: String(totalOpen), filterValue: null },
            { icon: Clock, label: 'Follow-ups Due', value: String(followUpDue), filterValue: null },
            { icon: AlertCircle, label: 'Closed Won', value: String(won), filterValue: 'CLOSED_WON' },
            { icon: AlertCircle, label: 'Closed Lost', value: String(lost), filterValue: 'CLOSED_LOST' },
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

        <div className="flex gap-1 flex-wrap mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {s.replace(/_/g, ' ')}{statusCounts[s] ? ` (${statusCounts[s]})` : ''}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Appt #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Device</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Issue</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Priority</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Ageing</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    No appointments found
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr
                    key={call._id}
                    className="hover:bg-gray-50 transition cursor-pointer"
                    onClick={() => router.push(`/admin/crm/calls/${call._id}`)}
                  >
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{call.callNumber}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {call.customerName}
                      <p className="text-gray-400 text-xs">{call.phone}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {[call.product, typeof call.brandId === 'object' ? call.brandId?.name : undefined, call.deviceModel].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{call.subject}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[call.priority] ?? 'bg-gray-100 text-gray-500'}`}>
                        {call.priority}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[call.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {call.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center"><AgeingBadge call={call} /></td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(call.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-3xl max-h-[90vh] bg-gray-50 border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Appointment</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Customer Name *</label>
                <input
                  type="text" required value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Contact No *</label>
                <input
                  type="tel" required value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email *</label>
                <input
                  type="email" required value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Source *</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                >
                  <option value="Website">Website</option>
                  <option value="User Contact">User Contact</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Product *</label>
                <input
                  type="text" required value={form.product} placeholder="e.g. AC, Washing Machine"
                  onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Device Brand *</label>
                <select
                  required value={form.brandId}
                  onChange={(e) => setForm((p) => ({ ...p, brandId: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                >
                  <option value="">Select brand…</option>
                  {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Model *</label>
                <input
                  type="text" required value={form.deviceModel}
                  onChange={(e) => setForm((p) => ({ ...p, deviceModel: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Issue with Device *</label>
                <textarea
                  required value={form.subject} rows={3}
                  onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none"
                />
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Phone, X } from 'lucide-react'

interface Call {
  _id: string
  callNumber: string
  customerName: string
  phone: string
  subject: string
  status: string
  priority: string
  createdAt: string
  assignedTo?: { name?: string; email?: string }
}

interface StaffMember {
  _id: string
  userId: { _id: string; name: string; email: string } | string
}

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

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'JOB_CREATED', 'IN_PROGRESS', 'CLOSED_WON', 'CLOSED_LOST', 'NOT_INTERESTED', 'NO_RESPONSE']

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Vendor's own view of the same CRM Calls feature (see /admin/crm/calls) --
// reuses the exact same /api/crm/calls endpoint (already permission-gated
// on crm_calls.view/create, which a vendor's CCO/Engineer/Centre Manager
// already holds via MEMBER_TYPE_IMPLIED_MODULES) rather than duplicating
// the business logic into a second API, per this model's own top comment
// warning against exactly that class of duplication bug. The only real
// difference from the admin page: defaults to "assigned to my vendor
// team" (assignedToIn) instead of showing the whole business's calls.
export default function VendorCrmCallsPage() {
  const router = useRouter()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    customerName: '', phone: '', email: '', subject: '', product: '',
    appointmentType: 'WALKIN', requestType: 'REPAIR', priority: 'MEDIUM', assignedTo: '',
  })

  useEffect(() => {
    fetch('/api/vendor/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const ids = (d.staff || [])
            .map((s: StaffMember) => (typeof s.userId === 'string' ? s.userId : s.userId?._id))
            .filter(Boolean)
          setTeamIds(ids)
        }
      })
      .catch(() => {})
  }, [])

  const fetchCalls = useCallback(async () => {
    if (teamIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      params.set('assignedToIn', teamIds.join(','))
      const res = await fetch(`/api/crm/calls?${params.toString()}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load appointments')
      setCalls(d.calls || [])
    } catch (err: any) {
      setError(err.message || 'Could not load appointments')
      setCalls([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, teamIds])

  useEffect(() => { fetchCalls() }, [fetchCalls])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/crm/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to create appointment')
      setShowForm(false)
      setForm({ customerName: '', phone: '', email: '', subject: '', product: '', appointmentType: 'WALKIN', requestType: 'REPAIR', priority: 'MEDIUM', assignedTo: '' })
      fetchCalls()
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/vendor')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Appointments</h1>
            <p className="text-sm text-gray-400">Your team's calls & appointments</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Appointment
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-1 flex-wrap mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Appt #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Issue</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Assigned To</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No appointments found</td></tr>
              ) : (
                calls.map((call) => (
                  <tr key={call._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{call.callNumber}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">
                      {call.customerName}
                      <p className="text-gray-400 text-xs">{call.phone}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-500">{call.subject}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{call.assignedTo?.name || '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[call.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {call.status.replace(/_/g, ' ')}
                      </span>
                    </td>
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
          <div className="relative w-full max-w-md max-h-[90vh] bg-gray-50 border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Appointment</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Customer Name *</label>
                <input required value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Phone *</label>
                <input required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Fault in Device *</label>
                <input required value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. AC not cooling"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Product</label>
                <input value={form.product} onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Priority</label>
                <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
                  title="Select priority" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none">
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="px-0 pt-4 flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

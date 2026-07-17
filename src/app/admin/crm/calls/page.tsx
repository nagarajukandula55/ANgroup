'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, Phone, Clock, AlertCircle,
} from 'lucide-react'
import { formatAgeing } from '@/lib/format/ageing'

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
      {formatAgeing(call.createdAt)}
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
          setBusinessId(user.activeBusinessId ?? d.businesses?.[0]?._id ?? null)
        }
      } catch {}
    }
    loadBusinessId()
  }, [])

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
      <div className="px-6 py-10">
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
            onClick={() => router.push('/admin/crm/jobsheets/new')}
            className="ml-auto flex items-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-100 transition"
          >
            <Plus className="w-4 h-4" /> New Job Sheet (no appointment)
          </button>
          <button
            onClick={() => router.push('/admin/crm/calls/new')}
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

        <div className={`rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto transition-opacity ${loading ? 'opacity-60' : 'opacity-100'}`}>
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

    </div>
  )
}

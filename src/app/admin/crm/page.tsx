'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PhoneCall,
  ClipboardList,
  ArrowRight,
} from 'lucide-react'

interface Lead {
  _id: string
  name: string
  email?: string
  phone?: string
  status: string
  source?: string
  notes?: string
  createdAt: string
}

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-500/20 text-blue-400',
  CONTACTED: 'bg-yellow-500/20 text-yellow-400',
  QUALIFIED: 'bg-purple-500/20 text-purple-400',
  WON: 'bg-green-500/20 text-green-400',
  LOST: 'bg-red-500/20 text-red-400',
}

const STATUSES = ['ALL', 'NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST']

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function CRMPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    source: '',
    notes: '',
  })

  useEffect(() => {
    fetchLeads()
  }, [])

  async function fetchLeads() {
    setLoading(true)
    try {
      const res = await fetch('/api/crm/leads')
      if (res.ok) {
        const d = await res.json()
        setLeads(Array.isArray(d) ? d : (d.leads ?? []))
      } else {
        setError('Could not load leads. Please try again.')
        setLeads([])
      }
    } catch {
      setError('Failed to connect. Please check your connection.')
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to create lead')
      }
      setShowForm(false)
      setForm({ name: '', email: '', phone: '', source: '', notes: '' })
      fetchLeads()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const total = leads.length
  const won = leads.filter((l) => l.status === 'WON').length
  const lost = leads.filter((l) => l.status === 'LOST').length
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0

  const filtered = leads.filter((l) => statusFilter === 'ALL' || l.status === statusFilter)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
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
            <h1 className="text-2xl font-semibold">CRM</h1>
            <p className="text-sm text-gray-400">Manage leads and customer relationships</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Lead
          </button>
        </div>

        {/* Full call-entry -> job sheet -> invoice -> closure lifecycle
            lives under these two sections — the lead list above is kept for
            backward compatibility (existing /api/crm/leads data) but new
            work should flow through Calls -> Job Sheets. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <Link
            href="/admin/crm/calls"
            className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-sm hover:border-gray-300 transition group flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Calls</h3>
              <p className="text-sm text-gray-500">Call entry, disposition, and follow-ups</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
          </Link>
          <Link
            href="/admin/crm/jobsheets"
            className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-sm hover:border-gray-300 transition group flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Job Sheets</h3>
              <p className="text-sm text-gray-500">Scheduled work through invoicing</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
          </Link>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Users, label: 'Total Leads', value: String(total), filterValue: null },
            { icon: TrendingUp, label: 'Won', value: String(won), filterValue: 'WON' },
            { icon: TrendingDown, label: 'Lost', value: String(lost), filterValue: 'LOST' },
            { icon: BarChart3, label: 'Conversion Rate', value: `${conversionRate}%`, filterValue: null },
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

        {/* Status Filter */}
        <div className="flex gap-1 flex-wrap mb-6">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Leads Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Contact</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Source</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                    No leads found
                  </td>
                </tr>
              ) : (
                filtered.map((lead) => (
                  <tr key={lead._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-6 py-3 text-gray-500">
                      <p>{lead.email}</p>
                      {lead.phone && <p className="text-gray-400 text-xs">{lead.phone}</p>}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{lead.source ?? '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[lead.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(lead.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: New Lead */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Lead</h2>
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
                { field: 'name', label: 'Full Name *', required: true, type: 'text' },
                { field: 'email', label: 'Email', required: false, type: 'email' },
                { field: 'phone', label: 'Phone', required: false, type: 'tel' },
                { field: 'source', label: 'Source', required: false, type: 'text' },
              ] as const).map(({ field, label, required, type }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20 resize-none"
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
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

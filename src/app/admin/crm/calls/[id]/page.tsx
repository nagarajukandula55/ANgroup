'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Phone, Mail, MapPin, Briefcase, Clock, Send, ArrowRightCircle } from 'lucide-react'

interface CallLog {
  _id: string
  disposition: string
  notes?: string
  nextFollowUpAt?: string
  calledAt: string
  calledBy?: { name?: string; email?: string }
}

interface Call {
  _id: string
  callNumber: string
  customerName: string
  company?: string
  phone: string
  email?: string
  address?: string
  subject: string
  description?: string
  status: string
  priority: string
  source?: string
  estimatedValue?: number
  currency: string
  nextFollowUpAt?: string
  callLogs: CallLog[]
  jobSheetId?: string
  createdAt: string
}

const DISPOSITIONS = [
  'INTERESTED', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'NO_ANSWER', 'WRONG_NUMBER', 'OTHER',
]

const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function CallDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [call, setCall] = useState<Call | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [disposition, setDisposition] = useState('INTERESTED')
  const [notes, setNotes] = useState('')
  const [nextFollowUpAt, setNextFollowUpAt] = useState('')
  const [logging, setLogging] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  const [showConvert, setShowConvert] = useState(false)
  const [jobTitle, setJobTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  const fetchCall = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/calls/${id}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load call')
      setCall(d.call)
      setJobTitle(d.call?.subject || '')
    } catch (err: any) {
      setError(err.message || 'Could not load call.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchCall() }, [fetchCall])

  async function submitLog(e: React.FormEvent) {
    e.preventDefault()
    setLogging(true)
    setLogError(null)
    try {
      const res = await fetch(`/api/crm/calls/${id}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposition, notes, nextFollowUpAt: nextFollowUpAt || undefined }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to log call')
      setNotes('')
      setNextFollowUpAt('')
      fetchCall()
    } catch (err: any) {
      setLogError(err.message || 'Something went wrong')
    } finally {
      setLogging(false)
    }
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault()
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch(`/api/crm/calls/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: jobTitle, scheduledAt: scheduledAt || undefined }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to convert call')
      router.push(`/admin/crm/jobsheets/${d.jobSheet._id}`)
    } catch (err: any) {
      setConvertError(err.message || 'Something went wrong')
    } finally {
      setConverting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error || !call) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 text-sm">{error || 'Call not found'}</p>
        <button onClick={() => router.push('/admin/crm/calls')} className="text-sm text-gray-500 underline">Back to Calls</button>
      </div>
    )
  }

  const canConvert = !call.jobSheetId && !['CLOSED_WON', 'CLOSED_LOST', 'NOT_INTERESTED', 'NO_RESPONSE'].includes(call.status)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin/crm/calls')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{call.customerName}</h1>
            <p className="text-sm text-gray-400 font-mono">{call.callNumber} · {call.subject}</p>
          </div>
          {call.jobSheetId && (
            <button
              onClick={() => router.push(`/admin/crm/jobsheets/${call.jobSheetId}`)}
              className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              View Job Sheet <ArrowRightCircle className="w-4 h-4" />
            </button>
          )}
          {canConvert && (
            <button
              onClick={() => setShowConvert(true)}
              className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              Convert to Job Sheet <ArrowRightCircle className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {call.phone}</p>
                {call.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {call.email}</p>}
                {call.company && <p className="flex items-center gap-2"><Briefcase className="w-3.5 h-3.5 text-gray-400" /> {call.company}</p>}
                {call.address && <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {call.address}</p>}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <p><span className="text-gray-400">Status:</span> {call.status.replace(/_/g, ' ')}</p>
                <p><span className="text-gray-400">Priority:</span> {call.priority}</p>
                <p><span className="text-gray-400">Source:</span> {call.source || '—'}</p>
                <p><span className="text-gray-400">Est. value:</span> ₹{(call.estimatedValue || 0).toLocaleString('en-IN')}</p>
                {call.nextFollowUpAt && (
                  <p className="flex items-center gap-2 text-amber-600"><Clock className="w-3.5 h-3.5" /> Follow-up: {fmtDateTime(call.nextFollowUpAt)}</p>
                )}
              </div>
              {call.description && <p className="mt-3 text-sm text-gray-500 border-t border-gray-100 pt-3">{call.description}</p>}
            </div>
          </div>

          {/* Right: log call + history */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Log a Call</h3>
              {logError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{logError}</div>}
              <form onSubmit={submitLog} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={disposition}
                    onChange={(e) => setDisposition(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                  >
                    {DISPOSITIONS.map((d) => <option key={d} value={d}>{d.replace(/_/g, ' ')}</option>)}
                  </select>
                  <input
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                    className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                    title="Next follow-up (optional)"
                  />
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What was discussed?"
                  rows={2}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none"
                />
                <button
                  disabled={logging}
                  className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {logging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Log Call
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Call History</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {call.callLogs.length === 0 ? (
                  <p className="px-5 py-8 text-center text-sm text-gray-400">No calls logged yet</p>
                ) : (
                  [...call.callLogs].reverse().map((log) => (
                    <div key={log._id} className="px-5 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-900">{log.disposition.replace(/_/g, ' ')}</span>
                        <span className="text-xs text-gray-400">{fmtDateTime(log.calledAt)}</span>
                      </div>
                      {log.notes && <p className="text-sm text-gray-500 mt-1">{log.notes}</p>}
                      {log.calledBy?.name && <p className="text-xs text-gray-400 mt-1">by {log.calledBy.name}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Convert to Job Sheet</h2>
            {convertError && <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{convertError}</div>}
            <form onSubmit={submitConvert} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Job Title *</label>
                <input
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowConvert(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500">Cancel</button>
                <button disabled={converting} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {converting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Job Sheet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

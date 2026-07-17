'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, X, Wrench } from 'lucide-react'

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
  jobSheetId?: string
}

interface StaffMember {
  _id: string
  userId: { _id: string; name: string; email: string } | string
}

interface Brand {
  _id: string
  name: string
}

interface FaultCode {
  _id: string
  code: string
  description: string
}

interface DeviceModelOption {
  _id: string
  name: string
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
  const [convertingCall, setConvertingCall] = useState<Call | null>(null)
  const [convertForm, setConvertForm] = useState({
    warrantyStatus: '', deviceAppearance: '', fileBackupDescription: '', brandId: '', deviceModel: '', faultCodeId: '',
  })
  const [faultCodes, setFaultCodes] = useState<FaultCode[]>([])
  const [converting, setConverting] = useState(false)
  const [convertError, setConvertError] = useState<string | null>(null)

  const [businessId, setBusinessId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [convertModels, setConvertModels] = useState<DeviceModelOption[]>([])
  const [loadingConvertModels, setLoadingConvertModels] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const bId = d.user?.activeBusinessId ?? d.businesses?.[0]?._id ?? null
        setBusinessId(bId)
        if (bId) {
          fetch(`/api/brands?businessId=${bId}`)
            .then((r) => r.json())
            .then((bd) => setBrands(bd.brands || bd.data || []))
            .catch(() => {})
          fetch(`/api/fault-codes?businessId=${bId}`)
            .then((r) => r.json())
            .then((fd) => setFaultCodes(fd.faultCodes || []))
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!convertForm.brandId || !businessId) { setConvertModels([]); return }
    setLoadingConvertModels(true)
    fetch(`/api/device-models?businessId=${businessId}&brandId=${convertForm.brandId}`)
      .then((r) => r.json())
      .then((d) => setConvertModels(d.models || []))
      .catch(() => setConvertModels([]))
      .finally(() => setLoadingConvertModels(false))
  }, [convertForm.brandId, businessId])

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

  function openConvert(call: Call) {
    setConvertingCall(call)
    setConvertForm({ warrantyStatus: '', deviceAppearance: '', fileBackupDescription: '', brandId: '', deviceModel: '', faultCodeId: '' })
    setConvertError(null)
  }

  async function submitConvert(e: React.FormEvent) {
    e.preventDefault()
    if (!convertingCall) return
    setConverting(true)
    setConvertError(null)
    try {
      const res = await fetch(`/api/crm/calls/${convertingCall._id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: convertingCall.subject,
          warrantyStatus: convertForm.warrantyStatus || undefined,
          deviceAppearance: convertForm.deviceAppearance || undefined,
          fileBackupDescription: convertForm.fileBackupDescription || undefined,
          // Left blank = keep the appointment's own brand/model (the
          // convert route falls back to call.brandId/call.deviceModel);
          // only override when the CCO actually picked one here.
          brandId: convertForm.brandId || undefined,
          deviceModel: convertForm.deviceModel || undefined,
          faultCodeId: convertForm.faultCodeId || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to convert to workorder')
      setConvertingCall(null)
      fetchCalls()
      router.push('/vendor/crm/jobsheets')
    } catch (err: any) {
      setConvertError(err.message || 'Something went wrong')
    } finally {
      setConverting(false)
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
            onClick={() => router.push('/vendor/crm/calls/new')}
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
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : calls.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center text-gray-400">No appointments found</td></tr>
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
                    <td className="px-6 py-3 text-right">
                      {!call.jobSheetId && call.status !== 'JOB_CREATED' && call.status !== 'CLOSED_LOST' && call.status !== 'NOT_INTERESTED' ? (
                        <button
                          onClick={() => openConvert(call)}
                          className="flex items-center gap-1.5 ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800"
                        >
                          <Wrench className="w-3.5 h-3.5" /> Convert to Workorder
                        </button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>


      {convertingCall && (
        // `flex-1` on this backdrop (inside a `flex items-center
        // justify-center` parent) made it grow to fill the row and push
        // the actual dialog to the right edge of the screen instead of
        // centering it -- `absolute inset-0` takes it out of flex flow
        // entirely so `justify-center` on the parent centers the dialog
        // like it was always meant to.
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-50/60 backdrop-blur-sm" onClick={() => setConvertingCall(null)} />
          <div className="relative w-full max-w-md max-h-[90vh] bg-gray-50 border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Convert to Workorder</h2>
              <button onClick={() => setConvertingCall(null)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitConvert} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {convertError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{convertError}</div>
              )}
              <p className="text-xs text-gray-500">{convertingCall.customerName} — {convertingCall.subject}</p>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Brand (leave blank to keep the appointment's)</label>
                <select
                  value={convertForm.brandId}
                  onChange={(e) => setConvertForm((p) => ({ ...p, brandId: e.target.value, deviceModel: '' }))}
                  title="Select brand"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                >
                  <option value="">Select…</option>
                  {brands.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Model</label>
                <select
                  value={convertForm.deviceModel}
                  onChange={(e) => setConvertForm((p) => ({ ...p, deviceModel: e.target.value }))}
                  disabled={!convertForm.brandId || loadingConvertModels}
                  title="Select model"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none disabled:opacity-50"
                >
                  <option value="">{!convertForm.brandId ? 'Select a brand first' : loadingConvertModels ? 'Loading…' : 'Select…'}</option>
                  {convertModels.map((m) => <option key={m._id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Fault Code</label>
                <select
                  value={convertForm.faultCodeId}
                  onChange={(e) => setConvertForm((p) => ({ ...p, faultCodeId: e.target.value }))}
                  title="Select fault code"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                >
                  <option value="">Select…</option>
                  {faultCodes.map((f) => <option key={f._id} value={f._id}>{f.code} — {f.description}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Warranty Status</label>
                <select
                  value={convertForm.warrantyStatus}
                  onChange={(e) => setConvertForm((p) => ({ ...p, warrantyStatus: e.target.value }))}
                  title="Select warranty status"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                >
                  <option value="">Select…</option>
                  <option value="IW">In Warranty (IW)</option>
                  <option value="OOW">Out of Warranty (OOW)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Device Appearance</label>
                <select
                  value={convertForm.deviceAppearance}
                  onChange={(e) => setConvertForm((p) => ({ ...p, deviceAppearance: e.target.value }))}
                  title="Select device appearance"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                >
                  <option value="">Select…</option>
                  <option value="GOOD">Good</option>
                  <option value="USED">Used</option>
                  <option value="DENTS">Dents</option>
                  <option value="BROKEN">Broken</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">File Backup Done?</label>
                <select
                  value={convertForm.fileBackupDescription}
                  onChange={(e) => setConvertForm((p) => ({ ...p, fileBackupDescription: e.target.value }))}
                  title="Select whether file backup was done"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none"
                >
                  <option value="">Select…</option>
                  <option value="YES">Yes</option>
                  <option value="NO">No</option>
                </select>
              </div>
              <div className="px-0 pt-4 flex gap-3">
                <button type="button" onClick={() => setConvertingCall(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">Cancel</button>
                <button type="submit" disabled={converting} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {converting && <Loader2 className="w-4 h-4 animate-spin" />} Convert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

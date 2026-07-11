'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, ClipboardList, Plus, X } from 'lucide-react'

interface JobSheet {
  _id: string
  jobSheetNumber: string
  customerName: string
  title: string
  product?: string
  deviceModel?: string
  brandId?: { name?: string } | string
  status: string
  scheduledAt?: string
  invoiceNumber?: string
  createdAt: string
  assignedTo?: { name?: string }
}

interface Brand { _id: string; name: string }

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500/10 text-blue-600',
  REPAIR_STARTED: 'bg-indigo-500/10 text-indigo-700',
  REPAIR_IN_PROGRESS: 'bg-amber-500/10 text-amber-700',
  REPAIR_COMPLETED: 'bg-cyan-500/10 text-cyan-700',
  CLOSED: 'bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'bg-red-500/10 text-red-700',
}

const STATUSES = ['ALL', 'CREATED', 'REPAIR_STARTED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED', 'CLOSED', 'CANCELLED']
const OPEN_STATUSES = new Set(['CREATED', 'REPAIR_STARTED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED'])

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

function ageingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

// Per spec: a workorder crossing day 7 without closing needs to visibly
// stand out in the list -- highlighted, not just a number.
function AgeingBadge({ js }: { js: JobSheet }) {
  if (!OPEN_STATUSES.has(js.status)) return <span className="text-gray-300 text-xs">—</span>
  const days = ageingDays(js.createdAt)
  const overdue = days >= 7
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
      {days}d
    </span>
  )
}

function JobSheetsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [faultCodes, setFaultCodes] = useState<{ _id: string; name: string }[]>([])
  const [warehouses, setWarehouses] = useState<{ _id: string; warehouseName: string }[]>([])
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [form, setForm] = useState({
    customerName: '', company: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    product: '', brandId: '', deviceModel: '', imeiOrSerialNumber: '',
    issueDescription: '', faultCodeId: '', remark: '',
    appointmentType: '', requestType: '', brandJobNoForPartOrder: '',
    warehouseId: '', title: '', description: '',
  })

  useEffect(() => {
    if (searchParams?.get('new') === '1') setShowForm(true)
  }, [searchParams])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const user = d.user ?? d
      setBusinessId(user.activeBusinessId ?? user.businessId ?? null)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!businessId) return
    fetch(`/api/brands?businessId=${businessId}`).then(r => r.json()).then(d => setBrands(d.brands || d.data || [])).catch(() => {})
    fetch(`/api/fault-codes?businessId=${businessId}`).then(r => r.json()).then(d => setFaultCodes(d.faultCodes || d.data || [])).catch(() => {})
    fetch(`/api/warehouses?businessId=${businessId}`).then(r => r.json()).then(d => setWarehouses(d.warehouses || d.data || [])).catch(() => {})
  }, [businessId])

  const fetchJobSheets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''
      const res = await fetch(`/api/crm/jobsheets${qs}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load job sheets')
      setJobSheets(d.jobSheets || [])
    } catch (err: any) {
      setError(err.message || 'Could not load job sheets.')
      setJobSheets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchJobSheets() }, [fetchJobSheets])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) {
      setFormError('Select a business first (top-right business switcher).')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/crm/jobsheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, businessId }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to create job sheet')
      router.push(`/admin/crm/jobsheets/${d.jobSheet._id}`)
    } catch (err: any) {
      setFormError(err.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading && jobSheets.length === 0) {
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
          <button onClick={() => router.push('/admin/crm')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Workorders</h1>
            <p className="text-sm text-gray-400">Work scheduled, in progress, and invoiced</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Job Sheet
          </button>
        </div>

        {error && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

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
          <table className="w-full text-sm min-w-[880px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Workorder #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Device</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Title</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Ageing</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Invoice</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobSheets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                    <ClipboardList className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    No workorders found
                  </td>
                </tr>
              ) : (
                jobSheets.map((js) => (
                  <tr key={js._id} className="hover:bg-gray-50 transition cursor-pointer" onClick={() => router.push(`/admin/crm/jobsheets/${js._id}`)}>
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{js.jobSheetNumber}</td>
                    <td className="px-6 py-3 font-medium text-gray-900">{js.customerName}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {[js.product, typeof js.brandId === 'object' ? js.brandId?.name : undefined, js.deviceModel].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{js.title}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[js.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {js.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center"><AgeingBadge js={js} /></td>
                    <td className="px-6 py-3 text-gray-500 font-mono text-xs">{js.invoiceNumber || '—'}</td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(js.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Job Sheet</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="px-6 pt-4 text-xs text-gray-400">For a direct walk-in — no appointment needed first.</p>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {formError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Customer Name *</label>
                <input required value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Company</label>
                <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Contact No *</label>
                <input required type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Address</label>
                <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="City" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
                <input placeholder="State" value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
                <input placeholder="Pincode" value={form.pincode} onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                  className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Product *</label>
                <input required value={form.product} placeholder="e.g. AC, Washing Machine" onChange={e => setForm(p => ({ ...p, product: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Device Brand *</label>
                <select required value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                  <option value="">Select brand…</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Model *</label>
                <input required value={form.deviceModel} onChange={e => setForm(p => ({ ...p, deviceModel: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">IMEI / Serial Number</label>
                <input value={form.imeiOrSerialNumber} onChange={e => setForm(p => ({ ...p, imeiOrSerialNumber: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Appointment Type</label>
                  <select value={form.appointmentType} onChange={e => setForm(p => ({ ...p, appointmentType: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                    <option value="">—</option>
                    <option value="ONSITE">Onsite</option>
                    <option value="WALKIN">Walk-in</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Request Type</label>
                  <select value={form.requestType} onChange={e => setForm(p => ({ ...p, requestType: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                    <option value="">—</option>
                    <option value="REPAIR">Repair</option>
                    <option value="INSTALLATION">Installation</option>
                  </select>
                </div>
              </div>
              {warehouses.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Service Center / Warehouse</label>
                  <select value={form.warehouseId} onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                    <option value="">—</option>
                    {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseName}</option>)}
                  </select>
                </div>
              )}
              {faultCodes.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Fault Code</label>
                  <select value={form.faultCodeId} onChange={e => setForm(p => ({ ...p, faultCodeId: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400">
                    <option value="">—</option>
                    {faultCodes.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Issue with Device *</label>
                <textarea required rows={3} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Voice of Customer (issue description)</label>
                <textarea rows={2} value={form.issueDescription} onChange={e => setForm(p => ({ ...p, issueDescription: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Additional Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Remark</label>
                <input value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Brand Job No. (for part order)</label>
                <input value={form.brandJobNoForPartOrder} onChange={e => setForm(p => ({ ...p, brandJobNoForPartOrder: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400" />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Job Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function JobSheetsPage() {
  return (
    <Suspense fallback={null}>
      <JobSheetsPageInner />
    </Suspense>
  )
}

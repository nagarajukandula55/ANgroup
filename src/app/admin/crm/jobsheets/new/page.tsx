'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { StateSelect, CitySelect, PincodeInput } from '@/components/shared/LocationSelect'

interface Brand { _id: string; name: string; parentId?: string | null }
interface FaultCode { _id: string; code: string; description: string }
interface CrmOption { _id: string; code: string; label: string }
interface Warehouse { _id: string; warehouseName: string }

export default function NewJobSheetPage() {
  const router = useRouter()
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [faultCodes, setFaultCodes] = useState<FaultCode[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<CrmOption[]>([])
  const [requestTypes, setRequestTypes] = useState<CrmOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    customerName: '', company: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    product: '', brandId: '', deviceModel: '', imeiOrSerialNumber: '',
    issueDescription: '', faultCodeId: '', remark: '',
    appointmentType: '', requestType: '',
    warehouseId: '', title: '',
  })

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
    fetch(`/api/crm-option-lists?listType=APPOINTMENT_TYPE&businessId=${businessId}`).then(r => r.json()).then(d => setAppointmentTypes(d.options || [])).catch(() => {})
    fetch(`/api/crm-option-lists?listType=REQUEST_TYPE&businessId=${businessId}`).then(r => r.json()).then(d => setRequestTypes(d.options || [])).catch(() => {})
  }, [businessId])

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

  const inputCls = "w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
  const labelCls = "block text-xs text-gray-500 mb-1.5"

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin/crm/jobsheets')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">New Job Sheet</h1>
            <p className="text-sm text-gray-400">For a direct walk-in — no appointment needed first.</p>
          </div>
        </div>

        {formError && (
          <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Customer</h2>
            <div>
              <label className={labelCls}>Customer Name *</label>
              <input required value={form.customerName} onChange={e => setForm(p => ({ ...p, customerName: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                Company <span className="text-gray-400 font-normal">(optional — only if this is a B2B customer needing a company name on the invoice)</span>
              </label>
              <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contact No *</label>
                <input required type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Address</h2>
            <div>
              <label className={labelCls}>Address</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Pincode</label>
                <PincodeInput
                  value={form.pincode}
                  onChange={(value) => setForm(p => ({ ...p, pincode: value }))}
                  onResolved={({ state, city }) => setForm(p => ({ ...p, state: p.state || state, city: p.city || city }))}
                  placeholder="400001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <StateSelect
                  value={form.state}
                  onChange={(value) => setForm(p => ({ ...p, state: value, city: '' }))}
                  className={`${inputCls} appearance-none`}
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <CitySelect
                  value={form.city}
                  state={form.state}
                  onChange={(value) => setForm(p => ({ ...p, city: value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Device</h2>
            <div>
              <label className={labelCls}>Product *</label>
              <input required value={form.product} placeholder="e.g. AC, Washing Machine" onChange={e => setForm(p => ({ ...p, product: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Device Brand *</label>
                <select required value={form.brandId} onChange={e => setForm(p => ({ ...p, brandId: e.target.value }))} className={inputCls}>
                  <option value="">Select brand…</option>
                  {brands.map(b => (
                    <option key={b._id} value={b._id}>{b.parentId ? `↳ ${b.name}` : b.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Model *</label>
                <input required value={form.deviceModel} onChange={e => setForm(p => ({ ...p, deviceModel: e.target.value }))} className={inputCls} placeholder="No model master list yet — type it" />
              </div>
            </div>
            <div>
              <label className={labelCls}>IMEI / Serial Number</label>
              <input value={form.imeiOrSerialNumber} onChange={e => setForm(p => ({ ...p, imeiOrSerialNumber: e.target.value }))} className={inputCls} />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Visit</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Appointment Type</label>
                <select value={form.appointmentType} onChange={e => setForm(p => ({ ...p, appointmentType: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {appointmentTypes.map(o => <option key={o._id} value={o.code}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Request Type</label>
                <select value={form.requestType} onChange={e => setForm(p => ({ ...p, requestType: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {requestTypes.map(o => <option key={o._id} value={o.code}>{o.label}</option>)}
                </select>
              </div>
            </div>
            {warehouses.length > 0 && (
              <div>
                <label className={labelCls}>Service Center / Warehouse</label>
                <select value={form.warehouseId} onChange={e => setForm(p => ({ ...p, warehouseId: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {warehouses.map(w => <option key={w._id} value={w._id}>{w.warehouseName}</option>)}
                </select>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Issue</h2>
            {faultCodes.length > 0 && (
              <div>
                <label className={labelCls}>Fault Code</label>
                <select value={form.faultCodeId} onChange={e => setForm(p => ({ ...p, faultCodeId: e.target.value }))} className={inputCls}>
                  <option value="">—</option>
                  {faultCodes.map(f => <option key={f._id} value={f._id}>{f.code} — {f.description}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className={labelCls}>Issue with Device *</label>
              <textarea required rows={3} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Voice of Customer</label>
              <textarea rows={2} value={form.issueDescription} onChange={e => setForm(p => ({ ...p, issueDescription: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Remark</label>
              <input value={form.remark} onChange={e => setForm(p => ({ ...p, remark: e.target.value }))} className={inputCls} />
            </div>
          </section>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/admin/crm/jobsheets')} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Job Sheet
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { StateSelect, CitySelect, PincodeInput } from '@/components/shared/LocationSelect'
import { TreeSelect } from '@/components/shared/TreeSelect'
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId'

interface Brand { _id: string; name: string; parentId?: string | null; logoUrl?: string }
interface FaultCode { _id: string; code: string; description: string }
interface ProductCategory { _id: string; name: string; parentId?: { _id: string; name: string } | null }
interface DeviceModelOption { _id: string; name: string }

export default function NewAppointmentPage() {
  const router = useRouter()
  const { businessId } = useActiveBusinessId()
  const [brands, setBrands] = useState<Brand[]>([])
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([])
  const [faultCodes, setFaultCodes] = useState<FaultCode[]>([])
  const [models, setModels] = useState<DeviceModelOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    customerName: '', phone: '', email: '',
    address: '', city: '', state: '', pincode: '',
    source: 'User Contact', product: '', brandId: '', deviceModelId: '', deviceModel: '',
    faultCodeId: '', subject: '',
  })

  useEffect(() => {
    if (!businessId) return
    fetch(`/api/brands?businessId=${businessId}`).then(r => r.json()).then(d => setBrands(d.brands || d.data || [])).catch(() => {})
    fetch(`/api/product-categories?businessId=${businessId}`).then(r => r.json()).then(d => setProductCategories(d.categories || d.productCategories || d.data || [])).catch(() => {})
    fetch(`/api/fault-codes?businessId=${businessId}`).then(r => r.json()).then(d => setFaultCodes(d.faultCodes || d.data || [])).catch(() => {})
  }, [businessId])

  useEffect(() => {
    if (!form.brandId || !businessId) { setModels([]); return }
    fetch(`/api/device-models?businessId=${businessId}&brandId=${form.brandId}`)
      .then(r => r.json())
      .then(d => setModels(d.models || []))
      .catch(() => setModels([]))
  }, [form.brandId, businessId])

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
      router.push(`/admin/crm/calls/${d.call._id}`)
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
      <div className="max-w-[1800px] mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin/crm/calls')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">New Appointment</h1>
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
              <input type="text" required value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Contact No *</label>
                <input type="tel" required value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Email *</label>
                <input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Source *</label>
              <select value={form.source} onChange={(e) => setForm((p) => ({ ...p, source: e.target.value }))} className={inputCls}>
                <option value="Website">Website</option>
                <option value="User Contact">User Contact</option>
              </select>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Address</h2>
            <div>
              <label className={labelCls}>Address</label>
              <input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} className={inputCls} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Pincode</label>
                <PincodeInput
                  value={form.pincode}
                  onChange={(value) => setForm((p) => ({ ...p, pincode: value }))}
                  onResolved={({ state, city }) => setForm((p) => ({ ...p, state: p.state || state, city: p.city || city }))}
                  placeholder="400001"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>State</label>
                <StateSelect
                  value={form.state}
                  onChange={(value) => setForm((p) => ({ ...p, state: value, city: '' }))}
                  className={`${inputCls} appearance-none`}
                />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <CitySelect
                  value={form.city}
                  state={form.state}
                  onChange={(value) => setForm((p) => ({ ...p, city: value }))}
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Device & Issue</h2>
            <div>
              <label className={labelCls}>Product *</label>
              <select required value={form.product} onChange={(e) => setForm((p) => ({ ...p, product: e.target.value }))} className={inputCls}>
                <option value="">Select product category…</option>
                {productCategories.map((c) => (
                  <option key={c._id} value={c.name}>{c.parentId ? `↳ ${c.name}` : c.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Device Brand *</label>
                <TreeSelect
                  items={brands}
                  value={form.brandId}
                  onChange={(id) => setForm((p) => ({ ...p, brandId: id, deviceModelId: '', deviceModel: '' }))}
                  placeholder="Select brand…"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Model *</label>
                <select
                  required
                  value={form.deviceModelId}
                  onChange={(e) => {
                    const m = models.find((mm) => mm._id === e.target.value)
                    setForm((p) => ({ ...p, deviceModelId: e.target.value, deviceModel: m?.name || '' }))
                  }}
                  disabled={!form.brandId}
                  title="Select model"
                  className={`${inputCls} disabled:opacity-50`}
                >
                  <option value="">{!form.brandId ? 'Select a brand first' : 'Select model…'}</option>
                  {models.map((m) => <option key={m._id} value={m._id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Fault Code</label>
              <select value={form.faultCodeId} onChange={(e) => setForm((p) => ({ ...p, faultCodeId: e.target.value }))} className={inputCls}>
                <option value="">Select fault code…</option>
                {faultCodes.map((f) => (
                  <option key={f._id} value={f._id}>{f.code} — {f.description}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Fault in Device *</label>
              <textarea required value={form.subject} rows={3} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className={`${inputCls} resize-none`} />
            </div>
          </section>

          <div className="flex gap-3">
            <button type="button" onClick={() => router.push('/admin/crm/calls')} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

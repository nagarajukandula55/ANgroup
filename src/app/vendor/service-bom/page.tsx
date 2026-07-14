'use client'

/**
 * Vendor UI for managing this vendor's ServiceCenterBOM parts -- the price
 * list used both for repair-workorder part selection and for GST-correct
 * invoicing (HSN + GST% + unit + part type are all captured on the part
 * itself, not derived/guessed at billing time).
 */

import { useState, useEffect, useCallback } from 'react'

interface Brand { _id: string; name: string }
interface Part {
  _id: string
  partName: string
  partCode: string
  description?: string
  partType: 'SPARE_PART' | 'LABOUR' | 'CONSUMABLE'
  unit: string
  hsnCode: string
  gstRate: number
  rate: number
  warrantyDays?: number
  brandId?: { _id: string; name: string } | string
  isActive: boolean
}

const emptyForm = {
  partName: '', description: '', partType: 'SPARE_PART', unit: 'pcs',
  hsnCode: '', gstRate: '18', rate: '', warrantyDays: '', brandId: '',
}

export default function ServiceCenterBOMPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/service-center-bom')
      const d = await res.json()
      if (d.success) setParts(d.parts)
      else setError(d.error || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const businessId = (d.user ?? d)?.activeBusinessId
      if (!businessId) return
      fetch(`/api/brands?businessId=${businessId}`).then(r => r.json()).then(bd => setBrands(bd.brands || bd.data || [])).catch(() => {})
    }).catch(() => {})
  }, [])

  async function addPart(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/service-center-bom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partName: form.partName,
          description: form.description,
          partType: form.partType,
          unit: form.unit,
          hsnCode: form.hsnCode,
          gstRate: parseFloat(form.gstRate) || 0,
          rate: parseFloat(form.rate) || 0,
          warrantyDays: form.warrantyDays ? parseInt(form.warrantyDays) : undefined,
          brandId: form.brandId || undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Failed to add part')
      setForm(emptyForm)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(id: string) {
    await fetch(`/api/service-center-bom/${id}`, { method: 'DELETE' })
    load()
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900'
  const labelCls = 'block text-xs text-gray-500 mb-1'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Service Center BOM</h1>
        <p className="text-sm text-gray-500">Your spare-part / labour / consumable price list — used for workorder line items and GST-correct invoicing.</p>
      </div>

      <form onSubmit={addPart} className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white border border-gray-200 rounded-xl p-4">
        <div className="col-span-2">
          <label className={labelCls}>Part Name *</label>
          <input required value={form.partName} onChange={e => setForm({ ...form, partName: e.target.value })} className={inputCls} placeholder="e.g. Compressor Relay" />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Description <span className="text-gray-400">(optional, shows on GST invoice)</span></label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} placeholder="Spec/detail for the invoice line" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select value={form.partType} onChange={e => setForm({ ...form, partType: e.target.value })} className={inputCls}>
            <option value="SPARE_PART">Spare Part</option>
            <option value="LABOUR">Labour</option>
            <option value="CONSUMABLE">Consumable</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Brand <span className="text-gray-400">(optional)</span></label>
          <select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value })} className={inputCls}>
            <option value="">Any / Universal</option>
            {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Unit</label>
          <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputCls} placeholder="pcs" />
        </div>
        <div>
          <label className={labelCls}>Warranty (days) <span className="text-gray-400">(optional)</span></label>
          <input type="number" value={form.warrantyDays} onChange={e => setForm({ ...form, warrantyDays: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>HSN Code *</label>
          <input required value={form.hsnCode} onChange={e => setForm({ ...form, hsnCode: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>GST % *</label>
          <input required type="number" step="0.01" value={form.gstRate} onChange={e => setForm({ ...form, gstRate: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Rate (excl. tax) *</label>
          <input required type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })} className={inputCls} />
        </div>
        <div className="col-span-2 md:col-span-4 flex justify-end">
          <button disabled={saving} className="bg-gray-900 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
            {saving ? 'Saving…' : 'Add Part'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-500">
              <th className="px-4 py-2">Part Code</th>
              <th className="px-4 py-2">Part Name</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Brand</th>
              <th className="px-4 py-2">Unit</th>
              <th className="px-4 py-2">HSN</th>
              <th className="px-4 py-2">GST%</th>
              <th className="px-4 py-2">Rate</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-400">Loading…</td></tr>
            ) : parts.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-6 text-center text-gray-400">No parts yet</td></tr>
            ) : (
              parts.map((p) => (
                <tr key={p._id}>
                  <td className="px-4 py-2 font-mono text-xs">{p.partCode}</td>
                  <td className="px-4 py-2">
                    {p.partName}
                    {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{p.partType.replace('_', ' ')}</td>
                  <td className="px-4 py-2 text-gray-500">{typeof p.brandId === 'object' ? p.brandId?.name : '—'}</td>
                  <td className="px-4 py-2 text-gray-500">{p.unit}</td>
                  <td className="px-4 py-2 text-gray-500">{p.hsnCode}</td>
                  <td className="px-4 py-2 text-gray-500">{p.gstRate}%</td>
                  <td className="px-4 py-2">₹{p.rate}</td>
                  <td className="px-4 py-2">{p.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2">
                    {p.isActive && (
                      <button onClick={() => deactivate(p._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

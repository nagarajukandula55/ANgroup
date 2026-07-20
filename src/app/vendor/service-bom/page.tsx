'use client'

/**
 * Vendor UI for managing this vendor's ServiceCenterBOM parts -- the price
 * list used both for repair-workorder part selection and for GST-correct
 * invoicing (HSN + GST% + unit + part type are all captured on the part
 * itself, not derived/guessed at billing time).
 *
 * Organized as a Brand -> Model -> Part tree, per explicit direction, so a
 * vendor with a large price list can actually browse/manage it instead of
 * scrolling one flat table. A part can sit at any level: brand-less
 * ("Universal"), brand-wide but no specific model ("Any Model" under that
 * brand), or scoped to one exact model.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronDown, Download, Upload } from 'lucide-react'

interface UploadRowResult { row: number; status: 'created' | 'error'; partCode?: string; error?: string }
interface UploadSummary { total: number; created: number; failed: number }

interface Brand { _id: string; name: string; logoUrl?: string }
interface DeviceModelOption { _id: string; name: string }
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
  deviceModelId?: { _id: string; name: string } | string
  isActive: boolean
}

const emptyForm = {
  partName: '', description: '', partType: 'SPARE_PART', unit: 'pcs',
  hsnCode: '', gstRate: '18', rate: '', warrantyDays: '', brandId: '', deviceModelId: '',
}

function idOf(ref: any): string {
  return (ref && typeof ref === 'object' ? ref._id : ref) || ''
}
function nameOf(ref: any): string | undefined {
  return ref && typeof ref === 'object' ? ref.name : undefined
}

function PartsTable({ parts, onDeactivate, canManage }: { parts: Part[]; onDeactivate: (id: string) => void; canManage: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 text-left text-gray-500">
          <th className="px-4 py-2">Part Code</th>
          <th className="px-4 py-2">Part Name</th>
          <th className="px-4 py-2">Type</th>
          <th className="px-4 py-2">Unit</th>
          <th className="px-4 py-2">HSN</th>
          <th className="px-4 py-2">GST%</th>
          <th className="px-4 py-2">Rate</th>
          <th className="px-4 py-2">Status</th>
          {canManage && <th className="px-4 py-2"></th>}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {parts.map((p) => (
          <tr key={p._id}>
            <td className="px-4 py-2 font-mono text-xs">{p.partCode}</td>
            <td className="px-4 py-2">
              {p.partName}
              {p.description && <p className="text-xs text-gray-400">{p.description}</p>}
            </td>
            <td className="px-4 py-2 text-gray-500">{p.partType.replace('_', ' ')}</td>
            <td className="px-4 py-2 text-gray-500">{p.unit}</td>
            <td className="px-4 py-2 text-gray-500">{p.hsnCode}</td>
            <td className="px-4 py-2 text-gray-500">{p.gstRate}%</td>
            <td className="px-4 py-2">₹{p.rate}</td>
            <td className="px-4 py-2">{p.isActive ? 'Active' : 'Inactive'}</td>
            {canManage && (
              <td className="px-4 py-2">
                {p.isActive && (
                  <button onClick={() => onDeactivate(p._id)} className="text-xs text-red-500 hover:underline">Deactivate</button>
                )}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TreeNode({ label, count, children, defaultOpen }: { label: string; count: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
      >
        {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        <span className="font-medium text-gray-900">{label}</span>
        <span className="text-xs text-gray-400">({count})</span>
      </button>
      {open && <div className="border-t border-gray-100">{children}</div>}
    </div>
  )
}

export default function ServiceCenterBOMPage() {
  const [parts, setParts] = useState<Part[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [formModels, setFormModels] = useState<DeviceModelOption[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [businessId, setBusinessId] = useState<string | null>(null)
  // Add/edit is Owner/Manager only, per explicit direction -- everyone
  // else on the vendor's team can view and export but not change the
  // price list. GET /api/service-center-bom is readable by any team
  // member (see resolveVendorForRead), so this page loaded fine for
  // everyone already; the Add Part form just had no role gate of its
  // own, so a non-Owner/Manager saw a fully "working" form that 403'd
  // silently on submit (POST is Owner/Manager-only server-side) -- easy
  // to mistake for "the Brand dropdown doesn't work" when it's actually
  // the whole form being submitted by someone who was never allowed to.
  const [canManage, setCanManage] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<UploadRowResult[] | null>(null)
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const bId = (d.user ?? d)?.activeBusinessId
      setBusinessId(bId || null)
      if (!bId) return
      fetch(`/api/brands?businessId=${bId}`).then(r => r.json()).then(bd => setBrands(bd.brands || bd.data || [])).catch(() => {})
    }).catch(() => {})
    // /api/vendor/settings is Owner/Manager-only -- same detection
    // pattern vendor/profile page already uses for its Business Settings
    // section.
    fetch('/api/vendor/settings').then(r => r.json()).then(d => setCanManage(!!d.success)).catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.brandId || !businessId) { setFormModels([]); return }
    fetch(`/api/device-models?businessId=${businessId}&brandId=${form.brandId}`)
      .then(r => r.json())
      .then(d => setFormModels(d.models || []))
      .catch(() => setFormModels([]))
  }, [form.brandId, businessId])

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
          deviceModelId: form.deviceModelId || undefined,
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

  // Client-side CSV export -- available to everyone (view-only staff
  // still need a way to get this list out, per explicit direction "can
  // view or export but not edit"), no backend endpoint needed for it.
  function exportCsv() {
    const header = ['Part Code', 'Part Name', 'Description', 'Type', 'Brand', 'Model', 'Unit', 'HSN', 'GST%', 'Rate', 'Status']
    const rows = parts.map((p) => [
      p.partCode, p.partName, p.description || '', p.partType, nameOf(p.brandId) || '', nameOf(p.deviceModelId) || '',
      p.unit, p.hsnCode, String(p.gstRate), String(p.rate), p.isActive ? 'Active' : 'Inactive',
    ])
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'service-center-bom.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Client-side download of the CSV column headers + example rows a vendor
  // can fill in and hand to Bulk Upload -- same Blob+anchor pattern as
  // exportCsv() above.
  function downloadTemplate() {
    const header = ['partName', 'brandName', 'seriesName', 'modelName', 'partType', 'unit', 'hsnCode', 'gstRate', 'rate', 'warrantyDays', 'description']
    const examples = [
      ['Battery', 'Samsung', 'Galaxy S', 'Galaxy S21', 'SPARE_PART', 'pcs', '85076000', '18', '1200', '180', 'Original battery'],
      ['Screen Guard', 'Samsung', 'Galaxy S', '', 'CONSUMABLE', 'pcs', '39199090', '18', '150', '', 'Fits any Galaxy S model'],
    ]
    const csv = [header, ...examples].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'service-center-bom-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleBulkUpload(file: File) {
    setUploading(true)
    setUploadResults(null)
    setUploadSummary(null)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/service-center-bom/upload', { method: 'POST', body: fd })
      const d = await res.json()
      if (!res.ok || !d.success) throw new Error(d.error || 'Bulk upload failed')
      setUploadResults(d.results || [])
      setUploadSummary(d.summary || null)
      load()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900'
  const labelCls = 'block text-xs text-gray-500 mb-1'

  // Group parts: Brand -> (Any Model | specific Model) -> parts. No brand
  // at all = "Universal" bucket, shown last.
  const brandGroups = new Map<string, { name: string; parts: Part[] }>()
  const universal: Part[] = []
  for (const p of parts) {
    const bId = idOf(p.brandId)
    if (!bId) { universal.push(p); continue }
    if (!brandGroups.has(bId)) brandGroups.set(bId, { name: nameOf(p.brandId) || 'Unknown Brand', parts: [] })
    brandGroups.get(bId)!.parts.push(p)
  }
  const sortedBrandGroups = Array.from(brandGroups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Service Center BOM</h1>
          <p className="text-sm text-gray-500">
            Your spare-part / labour / consumable price list, organized Brand → Model → Part — used for workorder line items and GST-correct invoicing.
            {!canManage && ' You can view and export this list; only an Owner or Manager can add or deactivate parts.'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition"
          >
            <Download className="w-4 h-4" /> Download Template
          </button>
          {canManage && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Bulk Upload'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleBulkUpload(file)
                  e.target.value = ''
                }}
              />
            </>
          )}
          <button
            onClick={exportCsv}
            disabled={parts.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {uploadSummary && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Bulk upload: <span className="font-medium text-emerald-600">{uploadSummary.created} created</span>
              {uploadSummary.failed > 0 && <span className="text-red-600"> · {uploadSummary.failed} failed</span>}
              {' '}of {uploadSummary.total} rows.
            </p>
            <button onClick={() => { setUploadSummary(null); setUploadResults(null) }} className="text-xs text-gray-400 hover:text-gray-700">Dismiss</button>
          </div>
          {uploadResults && uploadResults.some((r) => r.status === 'error') && (
            <div className="max-h-48 overflow-y-auto border border-gray-100 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-500">
                    <th className="px-3 py-1.5">Row</th>
                    <th className="px-3 py-1.5">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {uploadResults.filter((r) => r.status === 'error').map((r) => (
                    <tr key={r.row}>
                      <td className="px-3 py-1.5">{r.row}</td>
                      <td className="px-3 py-1.5 text-red-600">{r.error}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {canManage && (
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
          <label className={labelCls}>Brand <span className="text-gray-400">(optional — blank = Universal)</span></label>
          <select value={form.brandId} onChange={e => setForm({ ...form, brandId: e.target.value, deviceModelId: '' })} className={inputCls}>
            <option value="">Universal / Any Brand</option>
            {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Model <span className="text-gray-400">(optional — blank = Any Model)</span></label>
          <select value={form.deviceModelId} onChange={e => setForm({ ...form, deviceModelId: e.target.value })} disabled={!form.brandId} className={`${inputCls} disabled:opacity-50`}>
            <option value="">{form.brandId ? 'Any Model' : 'Select a brand first'}</option>
            {formModels.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
          </select>
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
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-2">
        {loading ? (
          <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
        ) : parts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No parts yet</p>
        ) : (
          <>
            {sortedBrandGroups.map(([brandId, group]) => {
              const anyModelParts = group.parts.filter((p) => !idOf(p.deviceModelId))
              const modelGroups = new Map<string, { name: string; parts: Part[] }>()
              for (const p of group.parts) {
                const mId = idOf(p.deviceModelId)
                if (!mId) continue
                if (!modelGroups.has(mId)) modelGroups.set(mId, { name: nameOf(p.deviceModelId) || 'Unknown Model', parts: [] })
                modelGroups.get(mId)!.parts.push(p)
              }
              const sortedModelGroups = Array.from(modelGroups.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name))
              return (
                <TreeNode key={brandId} label={group.name} count={group.parts.length}>
                  <div className="p-2 space-y-2 bg-gray-50">
                    {anyModelParts.length > 0 && (
                      <TreeNode label="Any Model" count={anyModelParts.length}>
                        <PartsTable parts={anyModelParts} onDeactivate={deactivate} canManage={canManage} />
                      </TreeNode>
                    )}
                    {sortedModelGroups.map(([modelId, mg]) => (
                      <TreeNode key={modelId} label={mg.name} count={mg.parts.length}>
                        <PartsTable parts={mg.parts} onDeactivate={deactivate} canManage={canManage} />
                      </TreeNode>
                    ))}
                  </div>
                </TreeNode>
              )
            })}
            {universal.length > 0 && (
              <TreeNode label="Universal / No Brand" count={universal.length} defaultOpen={sortedBrandGroups.length === 0}>
                <PartsTable parts={universal} onDeactivate={deactivate} canManage={canManage} />
              </TreeNode>
            )}
          </>
        )}
      </div>
    </div>
  )
}

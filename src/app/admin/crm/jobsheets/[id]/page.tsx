'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, FileText, PauseCircle } from 'lucide-react'

interface LineItem {
  description: string
  quantity: number
  unit: string
  unitPrice: number
  taxRate: number
  hsnCode?: string
  serviceCenterBOMId?: string
}

interface BOMPart {
  _id: string
  partName: string
  partCode: string
  hsnCode: string
  rate: number
}

interface JobSheet {
  _id: string
  jobSheetNumber: string
  customerName: string
  phone: string
  email?: string
  address?: string
  title: string
  description?: string
  status: string
  lineItems: LineItem[]
  workPerformed?: string
  materialsUsed?: string
  invoiceId?: string
  invoiceNumber?: string
  brandJobNoForPartOrder?: string
  callId?: { callNumber?: string; status?: string } | string
}

const emptyLine = (): LineItem => ({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, taxRate: 0 })

export default function JobSheetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<JobSheet | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [workPerformed, setWorkPerformed] = useState('')
  const [materialsUsed, setMaterialsUsed] = useState('')

  const [bomParts, setBomParts] = useState<BOMPart[]>([])
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null)

  const [showPartPending, setShowPartPending] = useState(false)
  const [brandJobNoForPartOrder, setBrandJobNoForPartOrder] = useState('')

  const fetchJob = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load workorder')
      setJob(d.jobSheet)
      setLineItems(d.jobSheet.lineItems?.length ? d.jobSheet.lineItems : [emptyLine()])
      setWorkPerformed(d.jobSheet.workPerformed || '')
      setMaterialsUsed(d.jobSheet.materialsUsed || '')
      setBrandJobNoForPartOrder(d.jobSheet.brandJobNoForPartOrder || '')
    } catch (err: any) {
      setError(err.message || 'Could not load workorder.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  // Vendor's Service Center BOM parts — used as an alternative to free-text
  // description entry (autofills partName/rate/HSN-derived tax%). Silently
  // ignored (empty list) if this account has no vendor profile / BOM parts.
  useEffect(() => {
    fetch('/api/service-center-bom')
      .then((r) => r.json())
      .then((d) => { if (d.success) setBomParts(d.parts || []) })
      .catch(() => {})
  }, [])

  function updateLine(i: number, updates: Partial<LineItem>) {
    setLineItems((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...updates } : l)))
  }
  function addLine() { setLineItems((prev) => [...prev, emptyLine()]) }
  function removeLine(i: number) { setLineItems((prev) => prev.filter((_, idx) => idx !== i)) }

  async function pickBomPart(i: number, part: BOMPart) {
    let taxRate = lineItems[i]?.taxRate || 0
    try {
      const res = await fetch(`/api/hsn-tax-rates?hsnCode=${encodeURIComponent(part.hsnCode)}`)
      const d = await res.json()
      if (d.success && d.rate) taxRate = d.rate.gstRate
    } catch {}
    updateLine(i, {
      description: part.partName,
      unitPrice: part.rate,
      hsnCode: part.hsnCode,
      serviceCenterBOMId: part._id,
      taxRate,
    })
    setPickerOpenIndex(null)
  }

  const isLocked = job?.status === 'INVOICED' || job?.status === 'CANCELLED'

  async function saveLineItems(extra: Record<string, unknown> = {}) {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, workPerformed, materialsUsed, ...extra }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to save')
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function markInProgress() {
    setSaving(true)
    try {
      await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'IN_PROGRESS' }),
      })
      fetchJob()
    } finally {
      setSaving(false)
    }
  }

  // "Part pending" — per spec, if the call is getting changed into part
  // pending status, ask whether they have a Brand Job No for the part
  // order (optional).
  async function submitPartPending() {
    setSaving(true)
    try {
      await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PART_PENDING',
          brandJobNoForPartOrder: brandJobNoForPartOrder || undefined,
        }),
      })
      setShowPartPending(false)
      fetchJob()
    } finally {
      setSaving(false)
    }
  }

  async function closeJob() {
    setClosing(true)
    setActionError(null)
    try {
      // Persist any pending edits first so closure invoices the latest line items.
      await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, workPerformed, materialsUsed, status: 'COMPLETED' }),
      })
      const res = await fetch(`/api/crm/jobsheets/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workPerformed, materialsUsed }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to close workorder')
      router.push(`/admin/crm/invoices/${d.invoice._id}`)
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setClosing(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-8 h-8 text-gray-500 animate-spin" /></div>
  }
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-3">
        <p className="text-red-600 text-sm">{error || 'Workorder not found'}</p>
        <button onClick={() => router.push('/admin/crm/jobsheets')} className="text-sm text-gray-500 underline">Back to Workorders</button>
      </div>
    )
  }

  const subtotal = lineItems.reduce((s, l) => s + (l.quantity || 0) * (l.unitPrice || 0), 0)
  const taxTotal = lineItems.reduce((s, l) => s + ((l.quantity || 0) * (l.unitPrice || 0)) * ((l.taxRate || 0) / 100), 0)
  const grandTotal = subtotal + taxTotal

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/admin/crm/jobsheets')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">{job.title}</h1>
            <p className="text-sm text-gray-400 font-mono">{job.jobSheetNumber} · {job.customerName} · {job.status.replace(/_/g, ' ')}</p>
          </div>
          {job.invoiceId ? (
            <button
              onClick={() => router.push(`/admin/crm/invoices/${job.invoiceId}`)}
              className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
            >
              <FileText className="w-4 h-4" /> View Invoice ({job.invoiceNumber})
            </button>
          ) : (
            <div className="ml-auto flex gap-2">
              {job.status === 'SCHEDULED' && (
                <button onClick={markInProgress} disabled={saving} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition">
                  Start Job
                </button>
              )}
              {(job.status === 'IN_PROGRESS' || job.status === 'PART_PENDING') && (
                <button onClick={() => setShowPartPending(true)} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700 hover:bg-amber-100 transition">
                  <PauseCircle className="w-4 h-4" /> Part Pending
                </button>
              )}
              <button
                onClick={closeJob}
                disabled={closing || lineItems.every((l) => !l.description.trim())}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Close & Generate Invoice
              </button>
            </div>
          )}
        </div>

        {actionError && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</div>}

        {job.status === 'PART_PENDING' && job.brandJobNoForPartOrder && (
          <div className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Part pending — Brand Job No: <span className="font-mono">{job.brandJobNoForPartOrder}</span>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
            {!isLocked && (
              <button onClick={addLine} className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900">
                <Plus className="w-3.5 h-3.5" /> Add Item
              </button>
            )}
          </div>

          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    disabled={isLocked}
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLine(i, { description: e.target.value, serviceCenterBOMId: undefined })}
                    className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  <input
                    disabled={isLocked}
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLine(i, { quantity: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  <input
                    disabled={isLocked}
                    type="number"
                    placeholder="Rate"
                    value={item.unitPrice}
                    onChange={(e) => updateLine(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  <input
                    disabled={isLocked}
                    type="number"
                    placeholder="Tax %"
                    value={item.taxRate}
                    onChange={(e) => updateLine(i, { taxRate: parseFloat(e.target.value) || 0 })}
                    onFocus={(e) => e.target.select()}
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  {!isLocked && bomParts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPickerOpenIndex(pickerOpenIndex === i ? null : i)}
                      className="col-span-1 text-xs text-blue-600 hover:underline"
                      title="Pick from Service Center BOM"
                    >
                      BOM
                    </button>
                  )}
                  {!isLocked && (
                    <button onClick={() => removeLine(i)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {pickerOpenIndex === i && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
                    {bomParts.map((p) => (
                      <button
                        key={p._id}
                        type="button"
                        onClick={() => pickBomPart(i, p)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex justify-between"
                      >
                        <span>{p.partName} <span className="text-gray-400">({p.partCode})</span></span>
                        <span className="text-gray-500">HSN {p.hsnCode} · ₹{p.rate}</span>
                      </button>
                    ))}
                  </div>
                )}
                {item.hsnCode && (
                  <p className="mt-1 text-[11px] text-gray-400 pl-1">HSN: {item.hsnCode}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 text-sm text-gray-600 gap-6">
            <span>Subtotal: ₹{subtotal.toLocaleString('en-IN')}</span>
            <span>Tax: ₹{taxTotal.toLocaleString('en-IN')}</span>
            <span className="font-semibold text-gray-900">Total: ₹{grandTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 space-y-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Work Performed</label>
            <textarea
              disabled={isLocked}
              value={workPerformed}
              onChange={(e) => setWorkPerformed(e.target.value)}
              placeholder="Describe the work performed"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Materials Used</label>
            <textarea
              disabled={isLocked}
              value={materialsUsed}
              onChange={(e) => setMaterialsUsed(e.target.value)}
              placeholder="List materials used"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-50"
            />
          </div>
          {!isLocked && (
            <button onClick={() => saveLineItems()} disabled={saving} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {showPartPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Mark as Part Pending</h2>
            <p className="text-xs text-gray-500 mb-4">If you have a Brand Job No for the part order, enter it below (optional).</p>
            <input
              value={brandJobNoForPartOrder}
              onChange={(e) => setBrandJobNoForPartOrder(e.target.value)}
              placeholder="Brand Job No (optional)"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowPartPending(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500">Cancel</button>
              <button onClick={submitPartPending} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                {saving ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

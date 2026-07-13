'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Plus, Trash2, CheckCircle2, FileText, PauseCircle,
  Check, Wrench, Printer,
} from 'lucide-react'

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
  description?: string
  partType: 'SPARE_PART' | 'LABOUR' | 'CONSUMABLE'
  unit: string
  hsnCode: string
  gstRate: number
  rate: number
  brandId?: { _id: string; name: string } | string
  materialId?: string
}

interface Solution {
  _id: string
  code: string
  description: string
}

interface SymptomCode {
  _id: string
  code: string
  description: string
}

interface JobSheet {
  _id: string
  jobSheetNumber: string
  businessId?: string
  customerName: string
  company?: string
  phone: string
  email?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  title: string
  description?: string
  product?: string
  deviceModel?: string
  imeiOrSerialNumber?: string
  brandId?: { _id?: string; name?: string } | string
  status: string
  createdAt: string
  lineItems: LineItem[]
  workPerformed?: string
  materialsUsed?: string
  solutionId?: { _id?: string } | string
  invoiceId?: string
  invoiceNumber?: string
  brandJobNoForPartOrder?: string
  callId?: { callNumber?: string; status?: string } | string
  assignedTo?: { _id?: string; name?: string } | string
  cancelReason?: string
  warehouseId?: string
}

interface StaffMember {
  _id: string
  vendorRole?: string
  status?: string
  userId?: { _id?: string; name?: string; email?: string }
}

const emptyLine = (): LineItem => ({ description: '', quantity: 1, unit: 'pcs', unitPrice: 0, taxRate: 0 })

// The milestone stepper -- the actual visual progress track that was
// missing entirely before (status was just a text label next to action
// buttons). CANCELLED is a branch, not a stage on the track itself.
const MILESTONES = [
  { key: 'CREATED', label: 'Created' },
  { key: 'REPAIR_STARTED', label: 'Assigned' },
  { key: 'REPAIR_IN_PROGRESS', label: 'In Repair' },
  { key: 'REPAIR_COMPLETED', label: 'Completed' },
  { key: 'CLOSED', label: 'Closed' },
] as const

function MilestoneStepper({ status }: { status: string }) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
        <PauseCircle className="w-4 h-4" /> Cancelled
      </div>
    )
  }
  if (status === 'PART_PENDING') {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium">
        <PauseCircle className="w-4 h-4" /> Part Pending — repair paused, waiting on a part order
      </div>
    )
  }
  const currentIdx = MILESTONES.findIndex((m) => m.key === status)
  return (
    <div className="flex items-center w-full">
      {MILESTONES.map((m, i) => {
        const done = i < currentIdx
        const active = i === currentIdx
        return (
          <div key={m.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                done ? 'bg-emerald-600 border-emerald-600 text-white'
                : active ? 'bg-gray-900 border-gray-900 text-white'
                : 'bg-white border-gray-200 text-gray-300'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium whitespace-nowrap ${active ? 'text-gray-900' : done ? 'text-emerald-700' : 'text-gray-400'}`}>
                {m.label}
              </span>
            </div>
            {i < MILESTONES.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < currentIdx ? 'bg-emerald-600' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ageingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

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
  const [serviceCharge, setServiceCharge] = useState(0)
  const [workPerformed, setWorkPerformed] = useState('')
  const [materialsUsed, setMaterialsUsed] = useState('')
  // Brand Job No. -- moved here from the New Job Sheet creation form per
  // explicit direction ("Brand Job No should come at the time of Part
  // opening only, not while creating a new job sheet"): this is the
  // brand's own reference number needed when actually placing a parts
  // order, which only happens once repair work has started, not at
  // intake.
  const [brandJobNo, setBrandJobNo] = useState('')
  const [solutionId, setSolutionId] = useState('')
  const [solutions, setSolutions] = useState<Solution[]>([])
  const [symptomCodes, setSymptomCodes] = useState<SymptomCode[]>([])
  const [symptomCodeId, setSymptomCodeId] = useState('')

  const [bomParts, setBomParts] = useState<BOMPart[]>([])
  const [pickerOpenIndex, setPickerOpenIndex] = useState<number | null>(null)
  const [bomSearch, setBomSearch] = useState('')

  const [engineers, setEngineers] = useState<StaffMember[]>([])
  const [selectedEngineer, setSelectedEngineer] = useState('')
  const [assigning, setAssigning] = useState(false)

  const [showHandover, setShowHandover] = useState(false)
  const [paymentCollected, setPaymentCollected] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [handingOver, setHandingOver] = useState(false)

  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchJob = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load workorder')
      setJob(d.jobSheet)
      setLineItems(d.jobSheet.lineItems?.length ? d.jobSheet.lineItems : [emptyLine()])
      setServiceCharge(d.jobSheet.serviceCharge || 0)
      setWorkPerformed(d.jobSheet.workPerformed || '')
      setMaterialsUsed(d.jobSheet.materialsUsed || '')
      setBrandJobNo(d.jobSheet.brandJobNoForPartOrder || '')
      const sid = d.jobSheet.solutionId
      setSolutionId(typeof sid === 'object' ? sid?._id || '' : sid || '')
      const symId = d.jobSheet.symptomCodeId
      setSymptomCodeId(typeof symId === 'object' ? symId?._id || '' : symId || '')
      if (d.jobSheet.businessId) {
        fetch(`/api/solutions?businessId=${d.jobSheet.businessId}`).then(r => r.json()).then(sd => setSolutions(sd.solutions || [])).catch(() => {})
        fetch(`/api/symptom-codes?businessId=${d.jobSheet.businessId}`).then(r => r.json()).then(sd => setSymptomCodes(sd.symptomCodes || [])).catch(() => {})
      }
    } catch (err: any) {
      setError(err.message || 'Could not load workorder.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchJob() }, [fetchJob])

  // Fixed Service Charge editing is restricted to Owner/Manager, per
  // explicit direction -- everyone else sees it read-only.
  const [canEditServiceCharge, setCanEditServiceCharge] = useState(false)

  // Serialized-inventory stock check on part add -- only meaningful when
  // the active business has Business.inventorySerialized = true (see
  // models/Business.ts). Fetched once the job sheet's businessId is known.
  const [inventorySerialized, setInventorySerialized] = useState(false)
  useEffect(() => {
    if (!job?.businessId) return
    fetch(`/api/businesses/${job.businessId}`).then(r => r.json()).then(d => {
      setInventorySerialized(Boolean(d?.business?.inventorySerialized))
    }).catch(() => {})
  }, [job?.businessId])

  // Brand Job No. popup -- fires the first time a BOM part is added to
  // this job sheet while brandJobNo is still empty, per explicit direction
  // ("if any call moving to part pending then a popup should come to fill
  // brand job number if required else you can leave"). Optional -- can be
  // dismissed without filling it in.
  const [showBrandJobPopup, setShowBrandJobPopup] = useState(false)
  // When opened via "Mark Part Pending" (vs. the auto-prompt on first BOM
  // part add), confirming actually transitions the job status too.
  const [brandJobPopupIsPartPending, setBrandJobPopupIsPartPending] = useState(false)
  const [markingPartPending, setMarkingPartPending] = useState(false)
  const [stockWarning, setStockWarning] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const user = d.user ?? d
      const role = String(user?.role || '').toUpperCase()
      setCanEditServiceCharge(Boolean(user?.isSuperAdmin) || role.includes('OWNER') || role.includes('MANAGER'))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/vendor/staff')
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setEngineers((d.staff || []).filter((m: StaffMember) => m.vendorRole === 'ENGINEER' && m.status === 'ACTIVE'))
        }
      })
      .catch(() => {})
  }, [])

  // Vendor's Service Center BOM parts — filtered server-side to this
  // workorder's device brand (plus brand-agnostic parts) so the picker
  // isn't a flat unfiltered dump of every part the vendor stocks.
  useEffect(() => {
    if (!job) return
    const brandId = typeof job.brandId === 'object' ? job.brandId?._id : job.brandId
    const qs = brandId ? `?brandId=${brandId}` : ''
    fetch(`/api/service-center-bom${qs}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setBomParts(d.parts || []) })
      .catch(() => {})
  }, [job?.brandId])

  function updateLine(i: number, updates: Partial<LineItem>) {
    setLineItems((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...updates } : l)))
  }
  function addLine() { setLineItems((prev) => [...prev, emptyLine()]) }
  function removeLine(i: number) { setLineItems((prev) => prev.filter((_, idx) => idx !== i)) }

  // "1-click add a labour/service-charge line" -- picks the vendor's own
  // LABOUR-type BOM entry if one exists (so the rate is whatever the
  // vendor configured), else falls back to a blank editable labour line.
  function addLabourCharge() {
    const labourPart = bomParts.find((p) => p.partType === 'LABOUR')
    setLineItems((prev) => [...prev, {
      description: labourPart?.partName || 'Labour / Service Charge',
      quantity: 1,
      unit: labourPart?.unit || 'nos',
      unitPrice: labourPart?.rate || 0,
      taxRate: labourPart?.gstRate ?? 18,
      hsnCode: labourPart?.hsnCode,
      serviceCenterBOMId: labourPart?._id,
    }])
  }

  async function pickBomPart(i: number, part: BOMPart) {
    setStockWarning(null)
    if (inventorySerialized && part.materialId) {
      try {
        const qs = job?.warehouseId ? `?warehouseId=${job.warehouseId}` : ''
        const res = await fetch(`/api/service-center-bom/${part._id}/stock${qs}`)
        const d = await res.json()
        if (d.success && d.tracked && (d.availableQuantity ?? 0) <= 0) {
          setStockWarning(`"${part.partName}" is out of stock (0 available) -- add it anyway only if you're sure, otherwise maintain sufficient stock first.`)
        }
      } catch { /* best-effort check -- don't block on a network hiccup */ }
    }

    updateLine(i, {
      description: part.partName,
      unitPrice: part.rate,
      hsnCode: part.hsnCode,
      serviceCenterBOMId: part._id,
      taxRate: part.gstRate,
      unit: part.unit,
    })
    setPickerOpenIndex(null)
    setBomSearch('')

    if (!brandJobNo.trim()) setShowBrandJobPopup(true)
  }

  const filteredBomParts = useMemo(() => {
    if (!bomSearch.trim()) return bomParts
    const q = bomSearch.trim().toLowerCase()
    return bomParts.filter((p) => p.partName.toLowerCase().includes(q) || p.partCode.toLowerCase().includes(q))
  }, [bomParts, bomSearch])

  const isLocked = job?.status === 'REPAIR_COMPLETED' || job?.status === 'CLOSED' || job?.status === 'CANCELLED'

  async function saveLineItems(extra: Record<string, unknown> = {}) {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, workPerformed, materialsUsed, brandJobNoForPartOrder: brandJobNo || null, solutionId: solutionId || null, symptomCodeId: symptomCodeId || null, serviceCharge, ...extra }),
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

  async function assignEngineer() {
    if (!selectedEngineer) return
    setAssigning(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/assign-engineer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engineerId: selectedEngineer }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to assign engineer')
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setAssigning(false)
    }
  }

  async function startRepair() {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/start-repair`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to start repair')
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function resumeRepair() {
    setSaving(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/resume-repair`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to resume repair')
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  async function confirmPartPending() {
    setMarkingPartPending(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/part-pending`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandJobNoForPartOrder: brandJobNo || null }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to mark part pending')
      setShowBrandJobPopup(false)
      setBrandJobPopupIsPartPending(false)
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setMarkingPartPending(false)
    }
  }

  async function completeRepair() {
    setClosing(true)
    setActionError(null)
    try {
      // Persist any pending edits first so completion invoices the latest line items.
      await fetch(`/api/crm/jobsheets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineItems, workPerformed, materialsUsed, solutionId: solutionId || null, symptomCodeId: symptomCodeId || null, serviceCharge }),
      })
      const res = await fetch(`/api/crm/jobsheets/${id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workPerformed, materialsUsed }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to complete repair')
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setClosing(false)
    }
  }

  async function submitHandover() {
    setHandingOver(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/handover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentCollected: parseFloat(paymentCollected) || 0, paymentMode }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to hand over')
      setShowHandover(false)
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setHandingOver(false)
    }
  }

  async function submitCancel() {
    if (!cancelReason.trim()) return
    setCancelling(true)
    setActionError(null)
    try {
      const res = await fetch(`/api/crm/jobsheets/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to cancel')
      setShowCancel(false)
      fetchJob()
    } catch (err: any) {
      setActionError(err.message || 'Something went wrong')
    } finally {
      setCancelling(false)
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
  const grandTotal = subtotal + taxTotal + (serviceCharge || 0)
  const days = ageingDays(job.createdAt)
  const isOpen = job.status !== 'CLOSED' && job.status !== 'CANCELLED'
  const overdue = isOpen && days >= 7
  const deviceLine = [job.product, typeof job.brandId === 'object' ? job.brandId?.name : undefined, job.deviceModel].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin/crm/jobsheets')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold font-mono">{job.jobSheetNumber}</h1>
            <p className="text-sm text-gray-400">
              {job.customerName} · {job.title}
              {deviceLine && <> · {deviceLine}</>}
            </p>
          </div>
          {isOpen && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
              {days}d open
            </span>
          )}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => window.open(`/admin/crm/jobsheets/${id}/print?doc=workorder`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition"
            >
              <Printer className="w-4 h-4" /> Print Workorder
            </button>
            <button
              onClick={() => window.open(`/admin/crm/jobsheets/${id}/print?doc=estimate`, '_blank')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition"
            >
              <Printer className="w-4 h-4" /> Print Estimate
            </button>
            {job.invoiceId && (
              <button
                onClick={() => router.push(`/admin/crm/invoices/${job.invoiceId}`)}
                className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
              >
                <FileText className="w-4 h-4" /> View Invoice ({job.invoiceNumber})
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Customer</h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{job.customerName}</p>
              {job.company && <p className="text-gray-500">{job.company}</p>}
              <p>{job.phone}{job.email ? ` · ${job.email}` : ''}</p>
              {(job.address || job.city || job.state || job.pincode) && (
                <p className="text-gray-500">
                  {[job.address, job.city, job.state, job.pincode].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Device & Reported Issue</h3>
            <div className="space-y-1.5 text-sm text-gray-700">
              <p className="font-medium text-gray-900">{deviceLine || '—'}</p>
              {job.imeiOrSerialNumber && <p className="text-gray-500 font-mono text-xs">IMEI/SN: {job.imeiOrSerialNumber}</p>}
              <p className="text-gray-500">{job.title}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <MilestoneStepper status={job.status} />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {job.status === 'CREATED' && (
            <>
              <select
                value={selectedEngineer}
                onChange={(e) => setSelectedEngineer(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Select engineer…</option>
                {engineers.map((e) => (
                  <option key={e._id} value={e.userId?._id}>{e.userId?.name || e.userId?.email}</option>
                ))}
              </select>
              <button onClick={assignEngineer} disabled={assigning || !selectedEngineer} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition disabled:opacity-50">
                {assigning ? 'Assigning…' : 'Assign Engineer'}
              </button>
            </>
          )}
          {job.status === 'REPAIR_STARTED' && (
            <button onClick={startRepair} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:bg-gray-100 transition">
              <Wrench className="w-4 h-4" /> Start Repair
            </button>
          )}
          {job.status === 'REPAIR_IN_PROGRESS' && (
            <>
              <button
                onClick={completeRepair}
                disabled={closing || lineItems.every((l) => !l.description.trim())}
                className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
              >
                {closing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Complete Repair & Generate Invoice
              </button>
              <button
                onClick={() => { setBrandJobPopupIsPartPending(true); setShowBrandJobPopup(true) }}
                disabled={markingPartPending}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800 hover:bg-amber-100 transition disabled:opacity-50"
              >
                <PauseCircle className="w-4 h-4" /> Mark Part Pending
              </button>
            </>
          )}
          {job.status === 'PART_PENDING' && (
            <button onClick={resumeRepair} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition disabled:opacity-50">
              <Wrench className="w-4 h-4" /> Part Arrived — Resume Repair
            </button>
          )}
          {job.status === 'REPAIR_COMPLETED' && (
            <button onClick={() => setShowHandover(true)} className="flex items-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition">
              <CheckCircle2 className="w-4 h-4" /> Handover to Customer
            </button>
          )}
          {job.status !== 'CLOSED' && job.status !== 'CANCELLED' && (
            <button onClick={() => setShowCancel(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 hover:bg-red-100 transition">
              <PauseCircle className="w-4 h-4" /> Cancel
            </button>
          )}
        </div>

        {actionError && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{actionError}</div>}

        {job.status === 'CANCELLED' && job.cancelReason && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            Cancelled — Reason: {job.cancelReason}
          </div>
        )}

        {stockWarning && (
          <div className="mb-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
            <span>{stockWarning}</span>
            <button onClick={() => setStockWarning(null)} className="text-amber-600 hover:text-amber-800 shrink-0">✕</button>
          </div>
        )}

        {job.status === 'CREATED' ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6 text-center py-12">
            <Wrench className="w-8 h-8 mx-auto mb-3 text-gray-300" />
            <p className="text-sm text-gray-500">Assign an engineer above to begin repair work.</p>
            <p className="text-xs text-gray-400 mt-1">Parts, symptoms, solutions and service charge become available once someone is assigned.</p>
          </div>
        ) : (
        <>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Line Items</h3>
            {!isLocked && (
              <div className="flex items-center gap-3">
                <button onClick={addLabourCharge} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800">
                  <Wrench className="w-3.5 h-3.5" /> Add Labour Charge
                </button>
                <button onClick={addLine} className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-12 gap-2 px-2 pb-1 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
            <span className="col-span-4">Description</span>
            <span className="col-span-2">Qty</span>
            <span className="col-span-2">Rate</span>
            <span className="col-span-2">Tax %</span>
            <span className="col-span-2 text-right pr-8">Part</span>
          </div>

          <div className="space-y-2">
            {lineItems.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-lg p-2 relative">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <input
                    disabled={isLocked}
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateLine(i, { description: e.target.value, serviceCenterBOMId: undefined })}
                    className="col-span-4 border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
                  />
                  <input
                    disabled
                    type="number"
                    placeholder="Qty"
                    value={1}
                    title="Quantity is fixed at 1 per line -- add another line for more"
                    className="col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
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
                      onClick={() => { setPickerOpenIndex(pickerOpenIndex === i ? null : i); setBomSearch('') }}
                      className="col-span-1 text-xs text-blue-600 hover:underline text-right"
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
                  <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200">
                      <input
                        autoFocus
                        value={bomSearch}
                        onChange={(e) => setBomSearch(e.target.value)}
                        placeholder="Type at least 2 characters to search spare parts by name or code…"
                        className="w-full text-xs px-2 py-1 border border-gray-200 rounded"
                      />
                    </div>
                    <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                      <span className="col-span-5">Part</span>
                      <span className="col-span-2">Code</span>
                      <span className="col-span-2">HSN</span>
                      <span className="col-span-1">GST%</span>
                      <span className="col-span-2 text-right">Rate</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                      {filteredBomParts.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">No matching parts in this vendor's BOM.</p>
                      ) : (
                        filteredBomParts.map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            onClick={() => pickBomPart(i, p)}
                            className="w-full grid grid-cols-12 gap-2 text-left px-3 py-1.5 text-xs hover:bg-gray-50"
                          >
                            <span className="col-span-5 truncate">{p.partName}</span>
                            <span className="col-span-2 font-mono text-gray-400">{p.partCode}</span>
                            <span className="col-span-2 text-gray-500">{p.hsnCode}</span>
                            <span className="col-span-1 text-gray-500">{p.gstRate}%</span>
                            <span className="col-span-2 text-right text-gray-700">₹{p.rate}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
                {item.hsnCode && (
                  <p className="mt-1 text-[11px] text-gray-400 pl-1">HSN: {item.hsnCode}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end mt-4 gap-2 text-sm">
            <label className="text-gray-500">Service Charge:</label>
            <span className="text-gray-400">₹</span>
            <input
              type="number"
              disabled={isLocked || !canEditServiceCharge}
              value={serviceCharge}
              onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
              title={canEditServiceCharge ? undefined : 'Only an Owner or Manager can edit the service charge'}
              className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>

          <div className="flex justify-end mt-2 text-sm text-gray-600 gap-6">
            <span>Subtotal: ₹{subtotal.toLocaleString('en-IN')}</span>
            <span>Tax: ₹{taxTotal.toLocaleString('en-IN')}</span>
            <span>Service Charge: ₹{(serviceCharge || 0).toLocaleString('en-IN')}</span>
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
          {symptomCodes.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Symptom</label>
              <select
                disabled={isLocked}
                value={symptomCodeId}
                onChange={(e) => setSymptomCodeId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-50"
              >
                <option value="">— None —</option>
                {symptomCodes.map((s) => (
                  <option key={s._id} value={s._id}>{s.code} — {s.description}</option>
                ))}
              </select>
            </div>
          )}
          {solutions.length > 0 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Solution</label>
              <select
                disabled={isLocked}
                value={solutionId}
                onChange={(e) => setSolutionId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-50"
              >
                <option value="">— None —</option>
                {solutions.map((s) => (
                  <option key={s._id} value={s._id}>{s.code} — {s.description}</option>
                ))}
              </select>
            </div>
          )}
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
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Brand Job No. (for part order)</label>
            <input
              disabled={isLocked}
              value={brandJobNo}
              onChange={(e) => setBrandJobNo(e.target.value)}
              placeholder="Enter once a part order is actually being placed"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm disabled:bg-gray-50"
            />
          </div>
          {!isLocked && (
            <button onClick={() => saveLineItems()} disabled={saving} className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
        </>
        )}
      </div>

      {showHandover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Handover to Customer</h2>
            <p className="text-xs text-gray-500 mb-4">Record what was collected before closing this workorder.</p>
            <input
              type="number"
              value={paymentCollected}
              onChange={(e) => setPaymentCollected(e.target.value)}
              placeholder="Amount collected"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-3"
            />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-4"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowHandover(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500">Cancel</button>
              <button onClick={submitHandover} disabled={handingOver || !paymentCollected} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50">
                {handingOver ? 'Saving…' : 'Confirm Handover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Cancel Workorder</h2>
            <p className="text-xs text-gray-500 mb-4">This will be routed to the manager. Provide a reason.</p>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Cancellation reason"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCancel(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500">Back</button>
              <button onClick={submitCancel} disabled={cancelling || !cancelReason.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition disabled:opacity-50">
                {cancelling ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBrandJobPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-2">Brand Job Number</h2>
            <p className="text-xs text-gray-500 mb-4">
              {brandJobPopupIsPartPending
                ? 'If this brand requires their own job reference number for the part order, enter it now. Leave blank if not required, then confirm to mark this workorder Part Pending.'
                : "If this brand requires their own job reference number for the part order, enter it now. Leave blank if not required."}
            </p>
            <input
              value={brandJobNo}
              onChange={(e) => setBrandJobNo(e.target.value)}
              placeholder="Brand's job number (optional)"
              autoFocus
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowBrandJobPopup(false); setBrandJobPopupIsPartPending(false) }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500"
              >
                {brandJobPopupIsPartPending ? 'Cancel' : 'Skip'}
              </button>
              {brandJobPopupIsPartPending ? (
                <button
                  onClick={confirmPartPending}
                  disabled={markingPartPending}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition disabled:opacity-50"
                >
                  {markingPartPending ? 'Marking…' : 'Confirm Part Pending'}
                </button>
              ) : (
                <button
                  onClick={() => setShowBrandJobPopup(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
                >
                  OK (saved with line items)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

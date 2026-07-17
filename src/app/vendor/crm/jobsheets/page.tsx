'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ClipboardList, FileText, Printer, Receipt, Plus } from 'lucide-react'

interface JobSheet {
  _id: string
  jobSheetNumber: string
  customerName: string
  title: string
  status: string
  createdAt: string
  assignedTo?: { name?: string }
  warrantyStatus?: 'IW' | 'OOW'
  deviceAppearance?: 'GOOD' | 'USED' | 'DENTS' | 'BROKEN'
  fileBackupDescription?: 'YES' | 'NO'
  standardAccessories?: string
  specialDescription?: string
}

interface StaffMember {
  _id: string
  userId: { _id: string; name: string; email: string } | string
}

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'bg-blue-500/10 text-blue-600',
  REPAIR_STARTED: 'bg-indigo-500/10 text-indigo-700',
  REPAIR_IN_PROGRESS: 'bg-amber-500/10 text-amber-700',
  PART_PENDING: 'bg-orange-500/10 text-orange-700',
  REPAIR_COMPLETED: 'bg-cyan-500/10 text-cyan-700',
  CLOSED: 'bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'bg-red-500/10 text-red-700',
}

const STATUSES = ['ALL', 'CREATED', 'REPAIR_STARTED', 'REPAIR_IN_PROGRESS', 'PART_PENDING', 'REPAIR_COMPLETED', 'CLOSED', 'CANCELLED']

// Which action moves a job sheet forward from its current status -- mirrors
// the real lifecycle (CREATED -[assign-engineer]-> REPAIR_STARTED
// -[start-repair]-> REPAIR_IN_PROGRESS -[close]-> REPAIR_COMPLETED
// -[handover]-> CLOSED, with PART_PENDING/resume-repair as a side branch --
// see each api/crm/jobsheets/[id]/*/route.ts's own docstring for the exact
// milestone), exposed as one quick action per row instead of a separate
// detail page. CREATED has no quick action here since assign-engineer
// needs an engineer picked, not a single click. REPAIR_IN_PROGRESS used to
// have a one-click "Close (Invoice)" here too, but that blind-closed
// whatever line items already happened to be saved -- now that the actual
// repair page (line items, Fault Phenomenon/Symptom/Solution, Mark Part
// Pending) lives at /vendor/crm/jobsheets/[id], closing from here would
// skip filling those in and invoice an empty/stale job. That status now
// only opens the detail page (see the jobSheetNumber link below).
const NEXT_ACTION: Record<string, { label: string; action: string } | undefined> = {
  REPAIR_STARTED: { label: 'Start Repair', action: 'start-repair' },
  PART_PENDING: { label: 'Resume Repair', action: 'resume-repair' },
  REPAIR_COMPLETED: { label: 'Hand Over', action: 'handover' },
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Vendor's own view of CRM Job Sheets (see /admin/crm/jobsheets) -- reuses
// the same /api/crm/jobsheets endpoint, scoped to this vendor's own team
// via assignedToIn instead of the whole business.
export default function VendorCrmJobSheetsPage() {
  const router = useRouter()
  const [jobSheets, setJobSheets] = useState<JobSheet[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [actingId, setActingId] = useState<string | null>(null)

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

  const fetchJobSheets = useCallback(async () => {
    if (teamIds.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      params.set('assignedToIn', teamIds.join(','))
      const res = await fetch(`/api/crm/jobsheets?${params.toString()}`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load job sheets')
      setJobSheets(d.jobSheets || [])
    } catch (err: any) {
      setError(err.message || 'Could not load job sheets')
      setJobSheets([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter, teamIds])

  useEffect(() => { fetchJobSheets() }, [fetchJobSheets])

  async function runAction(jobSheetId: string, action: string) {
    setActingId(jobSheetId)
    try {
      const res = await fetch(`/api/crm/jobsheets/${jobSheetId}/${action}`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Action failed')
      fetchJobSheets()
    } catch (err: any) {
      setError(err.message || 'Action failed')
    } finally {
      setActingId(null)
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
            <h1 className="text-2xl font-semibold">Workorders</h1>
            <p className="text-sm text-gray-400">Your team's repair jobs</p>
          </div>
          <button
            onClick={() => router.push('/vendor/crm/jobsheets/new')}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Workorder
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
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Workorder #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Title</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Assigned To</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Intake</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : jobSheets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    <ClipboardList className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    No workorders found
                  </td>
                </tr>
              ) : (
                jobSheets.map((js) => {
                  const next = NEXT_ACTION[js.status]
                  return (
                    <tr key={js._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-mono text-xs">
                        <button
                          onClick={() => router.push(`/vendor/crm/jobsheets/${js._id}`)}
                          className="text-gray-700 hover:text-gray-900 hover:underline"
                          title="Open workorder"
                        >
                          {js.jobSheetNumber}
                        </button>
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900">{js.customerName}</td>
                      <td className="px-6 py-3 text-gray-500">{js.title}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{js.assignedTo?.name || '—'}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[js.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {js.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {/* Edit removed -- intake details are edited from the
                            actual repair page now, not a separate quick-edit
                            here. Print options only: intake receipt, current
                            workorder, and estimate. */}
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => router.push(`/vendor/crm/jobsheets/${js._id}/intake-receipt`)}
                            title="Print intake receipt"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => window.open(`/admin/crm/jobsheets/${js._id}/print?doc=workorder`, '_blank')}
                            title="Print current workorder"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => window.open(`/admin/crm/jobsheets/${js._id}/print?doc=estimate`, '_blank')}
                            title="Print estimate"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {js.status === 'CLOSED' ? (
                          <button
                            onClick={() => router.push(`/vendor/crm/jobsheets/${js._id}/service-record`)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Service Record
                          </button>
                        ) : next ? (
                          <button
                            onClick={() => runAction(js._id, next.action)}
                            disabled={actingId === js._id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {actingId === js._id ? '...' : next.label}
                          </button>
                        ) : js.status === 'CANCELLED' ? (
                          <span className="text-gray-300 text-xs">—</span>
                        ) : (
                          // CREATED (needs an engineer picked, not a single
                          // click) and REPAIR_IN_PROGRESS (needs the actual
                          // repair page for line items/Mark Part Pending) --
                          // both just open the detail page instead.
                          <button
                            onClick={() => router.push(`/vendor/crm/jobsheets/${js._id}`)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
                          >
                            Open Workorder
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

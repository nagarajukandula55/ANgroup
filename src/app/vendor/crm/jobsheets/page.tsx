'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, ClipboardList, FileText, Pencil, X } from 'lucide-react'

interface JobSheet {
  _id: string
  jobSheetNumber: string
  customerName: string
  title: string
  status: string
  createdAt: string
  assignedTo?: { name?: string }
  warrantyStatus?: 'IW' | 'OOW'
  deviceAppearance?: string
  fileBackupDescription?: string
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
// needs an engineer picked, not a single click.
const NEXT_ACTION: Record<string, { label: string; action: string } | undefined> = {
  REPAIR_STARTED: { label: 'Start Repair', action: 'start-repair' },
  PART_PENDING: { label: 'Resume Repair', action: 'resume-repair' },
  REPAIR_IN_PROGRESS: { label: 'Close (Invoice)', action: 'close' },
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
  const [editingIntake, setEditingIntake] = useState<JobSheet | null>(null)
  const [intakeForm, setIntakeForm] = useState({
    warrantyStatus: '', deviceAppearance: '', fileBackupDescription: '', standardAccessories: '', specialDescription: '',
  })
  const [savingIntake, setSavingIntake] = useState(false)

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

  function openIntakeEdit(js: JobSheet) {
    setEditingIntake(js)
    setIntakeForm({
      warrantyStatus: js.warrantyStatus || '',
      deviceAppearance: js.deviceAppearance || '',
      fileBackupDescription: js.fileBackupDescription || '',
      standardAccessories: js.standardAccessories || '',
      specialDescription: js.specialDescription || '',
    })
  }

  async function saveIntake() {
    if (!editingIntake) return
    setSavingIntake(true)
    try {
      const res = await fetch(`/api/crm/jobsheets/${editingIntake._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warrantyStatus: intakeForm.warrantyStatus || undefined,
          deviceAppearance: intakeForm.deviceAppearance,
          fileBackupDescription: intakeForm.fileBackupDescription,
          standardAccessories: intakeForm.standardAccessories,
          specialDescription: intakeForm.specialDescription,
        }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to save')
      setEditingIntake(null)
      fetchJobSheets()
    } catch (err: any) {
      setError(err.message || 'Failed to save intake details')
    } finally {
      setSavingIntake(false)
    }
  }

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
                      <td className="px-6 py-3 font-mono text-xs text-gray-500">{js.jobSheetNumber}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{js.customerName}</td>
                      <td className="px-6 py-3 text-gray-500">{js.title}</td>
                      <td className="px-6 py-3 text-gray-500 text-xs">{js.assignedTo?.name || '—'}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[js.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {js.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openIntakeEdit(js)}
                            title="Edit intake details"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => router.push(`/vendor/crm/jobsheets/${js._id}/intake-receipt`)}
                            title="Print intake receipt"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                          >
                            <FileText className="w-3.5 h-3.5" />
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
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
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

      {editingIntake && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setEditingIntake(null)} />
          <div className="relative w-full max-w-md max-h-[90vh] bg-gray-50 border border-gray-200 rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Intake Details — {editingIntake.jobSheetNumber}</h2>
              <button onClick={() => setEditingIntake(null)} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Warranty Status</label>
                <select
                  value={intakeForm.warrantyStatus}
                  onChange={(e) => setIntakeForm((p) => ({ ...p, warrantyStatus: e.target.value }))}
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
                <input value={intakeForm.deviceAppearance} onChange={(e) => setIntakeForm((p) => ({ ...p, deviceAppearance: e.target.value }))}
                  placeholder="e.g. Intact, Scratched, Dented"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Description of File Backup</label>
                <input value={intakeForm.fileBackupDescription} onChange={(e) => setIntakeForm((p) => ({ ...p, fileBackupDescription: e.target.value }))}
                  placeholder="e.g. No backup required"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Standard Accessories</label>
                <input value={intakeForm.standardAccessories} onChange={(e) => setIntakeForm((p) => ({ ...p, standardAccessories: e.target.value }))}
                  placeholder="e.g. Card tray, Charger"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Special Description</label>
                <textarea value={intakeForm.specialDescription} onChange={(e) => setIntakeForm((p) => ({ ...p, specialDescription: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button onClick={() => setEditingIntake(null)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition">Cancel</button>
              <button onClick={saveIntake} disabled={savingIntake} className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {savingIntake && <Loader2 className="w-4 h-4 animate-spin" />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

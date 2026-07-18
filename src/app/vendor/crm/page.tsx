'use client'

/**
 * Vendor-side CRM Overview -- the landing page for Engineer/CCO vendor-team
 * members (see src/app/login/page.tsx's redirect logic). Mirrors
 * src/app/admin/crm/page.tsx's stats/recent-activity structure, but scoped
 * to this vendor's own team (same `assignedToIn` teamIds pattern the
 * existing /vendor/crm/calls and /vendor/crm/jobsheets list pages already
 * use) instead of a whole business -- Engineer/CCO previously landed on
 * the generic Owner/Manager sales dashboard (/vendor), which showed
 * nothing relevant to their role.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, PhoneCall, ClipboardList, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'

interface StaffMember { _id: string; userId: { _id: string } | string }
interface Appointment { _id: string; customerName: string; subject?: string; status: string; createdAt: string }
interface Workorder { _id: string; jobSheetNumber: string; customerName: string; title: string; status: string; createdAt: string }

const OPEN_APPOINTMENT_STATUSES = new Set(['NEW', 'CONTACTED', 'QUALIFIED', 'IN_PROGRESS'])
const OPEN_WORKORDER_STATUSES = new Set(['CREATED', 'REPAIR_STARTED', 'REPAIR_IN_PROGRESS', 'REPAIR_COMPLETED'])

function ageingDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000)
}

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function VendorCrmOverviewPage() {
  const router = useRouter()
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [workorders, setWorkorders] = useState<Workorder[]>([])
  const [loading, setLoading] = useState(true)

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

  const load = useCallback(async () => {
    if (teamIds.length === 0) return
    setLoading(true)
    const params = new URLSearchParams({ assignedToIn: teamIds.join(','), limit: '100' })
    try {
      const [callsRes, jobsRes] = await Promise.all([
        fetch(`/api/crm/calls?${params.toString()}`).then((r) => r.json()),
        fetch(`/api/crm/jobsheets?${params.toString()}`).then((r) => r.json()),
      ])
      setAppointments(callsRes.calls || [])
      setWorkorders(jobsRes.jobSheets || [])
    } catch {
      /* stats/recent-activity just stay empty on failure */
    } finally {
      setLoading(false)
    }
  }, [teamIds])

  useEffect(() => { load() }, [load])

  const workorderStatusBreakdown = workorders.reduce<Record<string, number>>((acc, w) => {
    acc[w.status] = (acc[w.status] || 0) + 1
    return acc
  }, {})
  const appointmentStatusBreakdown = appointments.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1
    return acc
  }, {})

  const openAppointments = appointments.filter((a) => OPEN_APPOINTMENT_STATUSES.has(a.status)).length
  const openWorkorders = workorders.filter((w) => OPEN_WORKORDER_STATUSES.has(w.status)).length
  const overdueWorkorders = workorders.filter((w) => OPEN_WORKORDER_STATUSES.has(w.status) && ageingDays(w.createdAt) >= 7).length
  const now = new Date()
  const closedThisMonth = workorders.filter((w) => {
    if (w.status !== 'CLOSED') return false
    const d = new Date(w.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const recentActivity = [
    ...appointments.map((a) => ({ id: a._id, kind: 'Appointment' as const, title: a.customerName, sub: a.subject || a.status, date: a.createdAt, href: `/vendor/crm/calls/${a._id}` })),
    ...workorders.map((w) => ({ id: w._id, kind: 'Workorder' as const, title: w.jobSheetNumber, sub: w.title, date: w.createdAt, href: `/vendor/crm/jobsheets/${w._id}` })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">CRM Overview</h1>
          <p className="text-sm text-gray-400">Your team's appointments and workorders</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: PhoneCall, label: 'Open Appointments', value: String(openAppointments) },
            { icon: ClipboardList, label: 'Open Workorders', value: String(openWorkorders) },
            { icon: AlertCircle, label: 'Overdue (7d+)', value: String(overdueWorkorders) },
            { icon: CheckCircle2, label: 'Closed This Month', value: String(closedThisMonth) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-700" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {[
            { title: 'Appointments by Status', data: appointmentStatusBreakdown, total: appointments.length },
            { title: 'Workorders by Status', data: workorderStatusBreakdown, total: workorders.length },
          ].map(({ title, data, total }) => (
            <div key={title} className="rounded-2xl border border-gray-200 bg-white p-6">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400 mb-4">{title}</p>
              {Object.keys(data).length === 0 ? (
                <p className="text-sm text-gray-400">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data).map(([status, count]) => (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-gray-600">{status}</span>
                        <span className="text-gray-400">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className="h-full bg-gray-900 rounded-full"
                          style={{ width: `${total ? Math.round((count / total) * 100) : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {recentActivity.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Recent Activity</p>
            </div>
            <div className="divide-y divide-gray-100">
              {recentActivity.map((item) => (
                <button
                  key={`${item.kind}-${item.id}`}
                  onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${item.kind === 'Appointment' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {item.kind}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{item.title}</span>
                    <span className="text-sm text-gray-400">{item.sub}</span>
                  </div>
                  <span className="text-xs text-gray-400">{fmtDate(item.date)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/vendor/crm/calls"
            className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-sm hover:border-gray-300 transition group flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Appointments</h3>
              <p className="text-sm text-gray-500">Appointment entry, disposition, and follow-ups</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
          </Link>
          <Link
            href="/vendor/crm/jobsheets"
            className="rounded-2xl border border-gray-200 bg-white p-6 hover:shadow-sm hover:border-gray-300 transition group flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">Workorders</h3>
              <p className="text-sm text-gray-500">Scheduled work through invoicing</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition" />
          </Link>
        </div>
      </div>
    </div>
  )
}

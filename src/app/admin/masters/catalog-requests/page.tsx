'use client'

/**
 * Approval queue for CatalogChangeRequest -- staff propose a new Brand/
 * Series/DeviceModel/Variant from the CRM call/jobsheet creation forms
 * ("Can't find it? Request to add"); this page is where a Super Admin
 * approves or rejects them. Bare-bones per the other masters pages in this
 * folder (table + inline actions, no polish).
 *
 * Approve/Reject buttons are hidden for non-Super-Admins (checked via
 * /api/auth/me, same pattern as admin/users/page.tsx) -- purely a UX nicety,
 * the actual enforcement is server-side (both routes hardcode
 * session.isSuperAdmin, see api/catalog/requests/[id]/approve).
 */

import { useState, useEffect, useCallback } from 'react'
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId'

interface CatalogRequest {
  _id: string
  kind: 'BRAND' | 'SERIES' | 'MODEL' | 'VARIANT'
  name: string
  category?: string
  brandId?: { _id: string; name: string } | null
  seriesId?: { _id: string; name: string } | null
  modelId?: { _id: string; name: string } | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requestedBy?: { _id: string; name: string; email: string } | null
  createdAt: string
  rejectionReason?: string
}

function scopeLabel(r: CatalogRequest) {
  const parts: string[] = []
  if (r.category) parts.push(r.category)
  if (r.brandId?.name) parts.push(`Brand: ${r.brandId.name}`)
  if (r.seriesId?.name) parts.push(`Series: ${r.seriesId.name}`)
  if (r.modelId?.name) parts.push(`Model: ${r.modelId.name}`)
  return parts.join(' / ') || '—'
}

export default function CatalogChangeRequestsPage() {
  const { businessId } = useActiveBusinessId()
  const [items, setItems] = useState<CatalogRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING')
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [sendingReport, setSendingReport] = useState(false)
  const [reportMessage, setReportMessage] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => setIsSuperAdmin(!!d?.user?.isSuperAdmin))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!businessId) return
    setLoading(true)
    try {
      const qs = statusFilter === 'ALL' ? '' : `&status=${statusFilter}`
      const res = await fetch(`/api/catalog/requests?businessId=${businessId}${qs}`)
      const d = await res.json()
      if (d.success) setItems(d.requests || [])
    } finally {
      setLoading(false)
    }
  }, [businessId, statusFilter])

  useEffect(() => { load() }, [load])

  async function handleApprove(id: string) {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/catalog/requests/${id}/approve`, { method: 'POST' })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to approve')
      await load()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  async function handleReject(id: string) {
    const reason = window.prompt('Reason for rejecting this request (optional):') || ''
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch(`/api/catalog/requests/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to reject')
      await load()
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusyId(null)
    }
  }

  async function handleSendOpsReport() {
    setSendingReport(true)
    setReportMessage(null)
    try {
      const res = await fetch('/api/cron/ops-report', { method: 'POST' })
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to send ops report')
      setReportMessage(d.telegramSent ? 'Ops report sent to Telegram.' : 'Ops report generated, but Telegram delivery was skipped (not configured).')
    } catch (err: any) {
      setReportMessage(err.message || 'Something went wrong')
    } finally {
      setSendingReport(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h1 className="text-2xl font-semibold">Catalog Change Requests</h1>
          <button
            onClick={handleSendOpsReport}
            disabled={sendingReport}
            className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:border-gray-400 disabled:opacity-50"
          >
            {sendingReport ? 'Sending…' : 'Send Ops Report Now'}
          </button>
        </div>
        {reportMessage && (
          <div className="mb-4 text-xs text-gray-500">{reportMessage}</div>
        )}
        <p className="text-sm text-gray-400 mb-6">Brand / Series / Model / Variant additions proposed from the CRM creation forms.</p>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        <div className="flex gap-2 mb-4">
          {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:text-gray-900'}`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="text-left px-4 py-3">Kind</th>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Scope</th>
                <th className="text-left px-4 py-3">Requested By</th>
                <th className="text-left px-4 py-3">Requested At</th>
                <th className="text-left px-4 py-3">Status</th>
                {isSuperAdmin && <th className="text-right px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Loading…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No requests.</td></tr>
              ) : (
                items.map((r) => (
                  <tr key={r._id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-medium">{r.kind}</td>
                    <td className="px-4 py-3">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500">{scopeLabel(r)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.requestedBy?.name || r.requestedBy?.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(r.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : r.status === 'APPROVED' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {r.status}
                      </span>
                      {r.status === 'REJECTED' && r.rejectionReason && (
                        <div className="text-xs text-gray-400 mt-1">{r.rejectionReason}</div>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-right">
                        {r.status === 'PENDING' && (
                          <div className="flex gap-2 justify-end">
                            <button
                              disabled={busyId === r._id}
                              onClick={() => handleApprove(r._id)}
                              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={busyId === r._id}
                              onClick={() => handleReject(r._id)}
                              className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 text-xs font-medium hover:text-gray-900 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

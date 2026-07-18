'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, PackageCheck } from 'lucide-react'

interface GRN {
  _id: string
  grnNumber: string
  warehouseId?: { warehouseName?: string }
  totalAcceptedQty: number
  totalValue: number
  status: string
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  COMPLETED: 'bg-emerald-500/10 text-emerald-700',
  CANCELLED: 'bg-gray-200 text-gray-500',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0)

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

// Vendor's own read-only view of Goods Receipts recorded against them (see
// /admin/goods-receipts) -- reuses the exact same /api/goods-receipts
// endpoint, scoped via the vendorId query param (GoodsReceipt already
// carries vendorId natively). Read-only: the business's warehouse team is
// who actually records receipt of goods; a vendor's role is to see what's
// been confirmed received against their purchase orders.
export default function VendorGRNPage() {
  const router = useRouter()
  const [receipts, setReceipts] = useState<GRN[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ids, setIds] = useState<{ vendorId: string; businessId: string } | null>(null)

  useEffect(() => {
    fetch('/api/vendor/profile')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?._id && d.data?.businessId) {
          setIds({ vendorId: d.data._id, businessId: d.data.businessId })
        }
      })
      .catch(() => {})
  }, [])

  const fetchReceipts = useCallback(async () => {
    if (!ids) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/goods-receipts?businessId=${ids.businessId}&vendorId=${ids.vendorId}&limit=100`)
      const d = await res.json()
      if (!res.ok || d.success === false) throw new Error(d.message || 'Failed to load goods receipts')
      setReceipts(d.data || [])
    } catch (err: any) {
      setError(err.message || 'Could not load goods receipts')
      setReceipts([])
    } finally {
      setLoading(false)
    }
  }, [ids])

  useEffect(() => { fetchReceipts() }, [fetchReceipts])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push('/vendor')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Goods Receipts</h1>
            <p className="text-sm text-gray-400">What's been confirmed received against your purchase orders</p>
          </div>
        </div>

        {error && <div className="mb-6 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">GRN #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Warehouse</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Accepted Qty</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Value</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></td></tr>
              ) : receipts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    <PackageCheck className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                    No goods receipts found
                  </td>
                </tr>
              ) : (
                receipts.map((g) => (
                  <tr key={g._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-mono text-xs text-gray-500">{g.grnNumber}</td>
                    <td className="px-6 py-3 text-gray-500 text-xs">{g.warehouseId?.warehouseName || '—'}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[g.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">{g.totalAcceptedQty}</td>
                    <td className="px-6 py-3 text-right font-medium">{fmt(g.totalValue)}</td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(g.createdAt)}</td>
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

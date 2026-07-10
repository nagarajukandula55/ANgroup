'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  CheckCircle,
  Clock,
  Calendar,
  ArrowRight,
} from 'lucide-react'

interface Invoice {
  _id: string
  invoiceNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
  dueDate?: string
}

interface Payment {
  _id: string
  amount: number
  invoiceId?: string
  method?: string
  date?: string
  createdAt?: string
  reference?: string
}

const statusColors: Record<string, string> = {
  PAID: 'bg-green-500/20 text-green-400',
  DRAFT: 'bg-gray-100 text-gray-500',
  SENT: 'bg-blue-500/20 text-blue-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function FinancePage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PAID' | 'UNPAID'>('ALL')

  useEffect(() => {
    async function fetchAll() {
      try {
        // Resolve the active business the same way every other admin page
        // does (vendors/products/integrations) instead of relying on the
        // JWT cookie header alone — this keeps Finance in sync when the
        // user switches business.
        let businessId: string | null = null
        try {
          const meRes = await fetch('/api/auth/me')
          if (meRes.ok) {
            const meData = await meRes.json()
            businessId = meData.user?.activeBusinessId ?? null
          }
        } catch {
          // ignore — fall back to no explicit businessId
        }

        const invoicesUrl = businessId
          ? `/api/sales/invoices?businessId=${businessId}`
          : '/api/sales/invoices'

        const [invRes, payRes] = await Promise.all([
          fetch(invoicesUrl, businessId ? { headers: { 'x-active-business-id': businessId } } : undefined),
          fetch('/api/finance/payments', businessId ? { headers: { 'x-active-business-id': businessId } } : undefined),
        ])
        if (invRes.ok) {
          const d = await invRes.json()
          setInvoices(Array.isArray(d) ? d : (d.invoices ?? []))
        }
        if (payRes.ok) {
          const d = await payRes.json()
          // /api/finance/payments responds with { success, data }, not { payments }
          setPayments(Array.isArray(d) ? d : (d.data ?? d.payments ?? []))
        }
        // 404 on payments is acceptable — stays empty
      } catch {
        // network error — continue with empty arrays
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const totalRevenue = invoices.reduce((s, i) => s + (i.totalAmount ?? 0), 0)
  const collected = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)
  const outstanding = invoices
    .filter((i) => ['SENT', 'OVERDUE'].includes(i.status))
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  const now = new Date()
  const thisMonth = invoices
    .filter((i) => {
      const d = new Date(i.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((s, i) => s + (i.totalAmount ?? 0), 0)

  const filteredInvoices = invoices.filter((i) => {
    if (filter === 'PAID') return i.status === 'PAID'
    if (filter === 'UNPAID') return i.status !== 'PAID'
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-gray-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Finance</h1>
            <p className="text-sm text-gray-500">Revenue, collections, and payment tracking</p>
          </div>
          <Link
            href="/admin/sales"
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            New Invoice <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Total Revenue', value: fmt(totalRevenue), sub: 'All invoices', filterValue: 'ALL' as const },
            { icon: CheckCircle, label: 'Collected', value: fmt(collected), sub: 'Paid invoices', filterValue: 'PAID' as const },
            { icon: Clock, label: 'Outstanding', value: fmt(outstanding), sub: 'Sent + Overdue', filterValue: 'UNPAID' as const },
            { icon: Calendar, label: 'This Month', value: fmt(thisMonth), sub: 'Current month', filterValue: null },
          ].map(({ icon: Icon, label, value, sub, filterValue }) => {
            const isActive = filterValue !== null && filter === filterValue;
            return (
              <button
                key={label}
                type="button"
                disabled={filterValue === null}
                onClick={() =>
                  filterValue &&
                  setFilter(filter === filterValue ? 'ALL' : filterValue)
                }
                className={`text-left rounded-2xl border bg-white p-6 transition-colors ${
                  filterValue === null ? 'cursor-default' : ''
                } ${
                  isActive
                    ? 'border-gray-900 ring-2 ring-gray-900'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{value}</p>
                <p className="text-xs text-gray-600 mt-1">{sub}</p>
              </button>
            );
          })}
        </div>

        {/* Invoice Filter */}
        <div className="flex gap-1 mb-5">
          {(['ALL', 'PAID', 'UNPAID'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Invoice Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Invoice #</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3 text-gray-600">{inv.customerName}</td>
                    <td className="px-6 py-3 text-gray-500">{fmtDate(inv.createdAt)}</td>
                    <td className="px-6 py-3 text-right text-gray-900">{fmt(inv.totalAmount)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment History */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-medium text-gray-900">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <p className="px-6 py-10 text-center text-gray-500 text-sm">No payment records found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Reference</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Method</th>
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-gray-900">{pay.reference ?? pay._id.slice(-8)}</td>
                    <td className="px-6 py-3 text-gray-500">{pay.method ?? '—'}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {fmtDate(pay.date ?? pay.createdAt ?? '')}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-900">{fmt(pay.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

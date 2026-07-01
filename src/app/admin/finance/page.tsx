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
  DRAFT: 'bg-zinc-500/20 text-zinc-400',
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
        const [invRes, payRes] = await Promise.all([
          fetch('/api/sales/invoices'),
          fetch('/api/finance/payments'),
        ])
        if (invRes.ok) {
          const d = await invRes.json()
          setInvoices(Array.isArray(d) ? d : (d.invoices ?? []))
        }
        if (payRes.ok) {
          const d = await payRes.json()
          setPayments(Array.isArray(d) ? d : (d.payments ?? []))
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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">Finance</h1>
            <p className="text-sm text-zinc-500">Revenue, collections, and payment tracking</p>
          </div>
          <Link
            href="/admin/sales"
            className="ml-auto flex items-center gap-2 bg-white text-black text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-100 transition"
          >
            New Invoice <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: TrendingUp, label: 'Total Revenue', value: fmt(totalRevenue), sub: 'All invoices' },
            { icon: CheckCircle, label: 'Collected', value: fmt(collected), sub: 'Paid invoices' },
            { icon: Clock, label: 'Outstanding', value: fmt(outstanding), sub: 'Sent + Overdue' },
            { icon: Calendar, label: 'This Month', value: fmt(thisMonth), sub: 'Current month' },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white">{value}</p>
              <p className="text-xs text-zinc-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Invoice Filter */}
        <div className="flex gap-1 mb-5">
          {(['ALL', 'PAID', 'UNPAID'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filter === f
                  ? 'bg-white text-black'
                  : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Invoice Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="font-medium text-white">Invoices</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Invoice #</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Customer</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Date</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">Amount</th>
                <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-3 font-medium text-white">{inv.invoiceNumber}</td>
                    <td className="px-6 py-3 text-zinc-300">{inv.customerName}</td>
                    <td className="px-6 py-3 text-zinc-500">{fmtDate(inv.createdAt)}</td>
                    <td className="px-6 py-3 text-right text-white">{fmt(inv.totalAmount)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[inv.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}>
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
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h2 className="font-medium text-white">Payment History</h2>
          </div>
          {payments.length === 0 ? (
            <p className="px-6 py-10 text-center text-zinc-500 text-sm">No payment records found</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Reference</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Method</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-zinc-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {payments.map((pay) => (
                  <tr key={pay._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-3 text-white">{pay.reference ?? pay._id.slice(-8)}</td>
                    <td className="px-6 py-3 text-zinc-400">{pay.method ?? '—'}</td>
                    <td className="px-6 py-3 text-zinc-500">
                      {fmtDate(pay.date ?? pay.createdAt ?? '')}
                    </td>
                    <td className="px-6 py-3 text-right text-white">{fmt(pay.amount)}</td>
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

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  Download,
  AlertCircle,
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
} from 'lucide-react'

interface Transaction {
  date: string
  type: 'Invoice' | 'Payment' | 'Credit'
  reference: string
  description: string
  amount: number
  balance: number
}

interface StatementSummary {
  totalInvoiced: number
  totalPaid: number
  outstanding: number
  creditBalance: number
}

interface StatementData {
  transactions: Transaction[]
  summary: StatementSummary
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const typeColors: Record<string, string> = {
  Invoice: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Payment: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Credit: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
}

export default function VendorStatementPage() {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [fromDate, setFromDate] = useState(
    firstOfMonth.toISOString().split('T')[0]
  )
  const [toDate, setToDate] = useState(today.toISOString().split('T')[0])
  const [data, setData] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatement = useCallback(async () => {
    if (!fromDate || !toDate) return
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ from: fromDate, to: toDate })
      const res = await fetch(`/api/vendor/statement?${params}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError(json.message || 'Failed to load statement')
      }
    } catch {
      setError('Failed to load statement')
    } finally {
      setLoading(false)
    }
  }, [fromDate, toDate])

  useEffect(() => {
    fetchStatement()
  }, [fetchStatement])

  const handleDownloadPDF = () => {
    window.print()
  }

  const summary = data?.summary
  const transactions = data?.transactions || []

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest">
            Vendor Portal
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">
            Financial Statement
          </h1>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-all"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
          Date Range
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 w-8">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 w-4">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
            />
          </div>
          <button
            onClick={fetchStatement}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm bg-white/[0.07] hover:bg-white/[0.1] text-white transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500">Total Invoiced</p>
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="h-3.5 w-3.5 text-blue-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary.totalInvoiced)}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500">Total Paid</p>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500">Outstanding</p>
              <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary.outstanding)}
            </p>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-zinc-500">Credit Balance</p>
              <div className="h-7 w-7 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <CreditCard className="h-3.5 w-3.5 text-violet-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatCurrency(summary.creditBalance)}
            </p>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <h2 className="text-sm font-semibold text-white">Transactions</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {fromDate && toDate
              ? `${formatDate(fromDate)} — ${formatDate(toDate)}`
              : 'All transactions'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 text-zinc-500 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="text-zinc-400">{error}</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500">No transactions in this period</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.04]">
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600">
                  Date
                </th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600">
                  Type
                </th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600">
                  Reference
                </th>
                <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-zinc-600 hidden md:table-cell">
                  Description
                </th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-zinc-600">
                  Amount
                </th>
                <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-zinc-600">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr
                  key={idx}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-5 py-3 text-sm text-zinc-400">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                        typeColors[tx.type] ||
                        'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {tx.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-mono text-zinc-300">
                    {tx.reference}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-500 hidden md:table-cell max-w-xs truncate">
                    {tx.description}
                  </td>
                  <td
                    className={`px-5 py-3 text-sm text-right font-medium ${
                      tx.type === 'Invoice'
                        ? 'text-blue-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {tx.type !== 'Payment' ? '+' : '-'}
                    {formatCurrency(Math.abs(tx.amount))}
                  </td>
                  <td className="px-5 py-3 text-sm text-right text-white font-mono">
                    {formatCurrency(tx.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

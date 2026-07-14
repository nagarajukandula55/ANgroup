'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Loader2, AlertCircle, DollarSign, TrendingUp, Clock } from 'lucide-react'

interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  taxRate: number
  taxAmount: number
  total: number
}

interface Invoice {
  _id: string
  invoiceNumber: string
  status: string
  grandTotal: number
  subtotal: number
  taxTotal: number
  issueDate: string
  createdAt: string
  items: InvoiceItem[]
  notes?: string
}

interface Summary {
  totalInvoiced: number
  totalPaid: number
  outstanding: number
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

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-50 text-gray-600 border-gray-200',
  SENT: 'bg-amber-50 text-amber-700 border-amber-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  OVERDUE: 'bg-red-50 text-red-700 border-red-200',
  CANCELLED: 'bg-gray-50 text-gray-400 border-gray-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
  PARTIAL: 'bg-violet-50 text-violet-700 border-violet-200',
}

export default function VendorInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vendor/invoices')
      const json = await res.json()
      if (json.success) {
        setInvoices(json.invoices || [])
        setSummary(json.summary || null)
      } else {
        setError(json.message || 'Failed to load invoices')
      }
    } catch {
      setError('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            B2B invoices generated automatically when your products sell
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Total Invoiced</span>
                <FileText className="w-4 h-4 text-gray-400" />
              </div>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.totalInvoiced)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Total Paid</span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-xl font-semibold text-emerald-600">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Outstanding</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xl font-semibold text-amber-600">{formatCurrency(summary.outstanding)}</p>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <DollarSign className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm text-gray-400">No invoices yet — they&apos;ll appear here once your products start selling.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((inv) => {
                const isOpen = expanded === inv._id
                return (
                  <div key={inv._id}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : inv._id)}
                      className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 font-mono">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(inv.issueDate || inv.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(inv.grandTotal)}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${statusColors[inv.status] || statusColors.DRAFT}`}>
                          {inv.status}
                        </span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-6 pb-4">
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="text-left px-4 py-2 text-xs text-gray-400 font-medium">Item</th>
                                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Qty</th>
                                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Unit Price</th>
                                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Tax</th>
                                <th className="text-right px-4 py-2 text-xs text-gray-400 font-medium">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {(inv.items || []).map((item, i) => (
                                <tr key={i}>
                                  <td className="px-4 py-2 text-gray-700">{item.description}</td>
                                  <td className="px-4 py-2 text-right text-gray-500">{item.quantity}</td>
                                  <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(item.unitPrice)}</td>
                                  <td className="px-4 py-2 text-right text-gray-500">{formatCurrency(item.taxAmount)}</td>
                                  <td className="px-4 py-2 text-right text-gray-900 font-medium">{formatCurrency(item.total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {inv.notes && <p className="text-xs text-gray-400 mt-2">{inv.notes}</p>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

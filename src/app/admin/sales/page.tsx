'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ArrowLeft,
  Plus,
  X,
  Search,
  Eye,
  Trash2,
} from 'lucide-react'

interface Invoice {
  _id: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string
  totalAmount: number
  status: string
  createdAt: string
  dueDate?: string
}

interface Order {
  _id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
  items?: { description: string; qty: number; price: number }[]
}

interface InvoiceItem {
  description: string
  qty: number
  price: number
  taxPct: number
}

const statusColors: Record<string, string> = {
  PAID: 'bg-green-500/20 text-green-400',
  DRAFT: 'bg-zinc-500/20 text-zinc-400',
  SENT: 'bg-blue-500/20 text-blue-400',
  OVERDUE: 'bg-red-500/20 text-red-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function SalesPage() {
  const router = useRouter()
  const [tab, setTab] = useState<'invoices' | 'orders'>('invoices')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: '', qty: 1, price: 0, taxPct: 18 },
  ])

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [invRes, ordRes] = await Promise.all([
        fetch('/api/sales/invoices'),
        fetch('/api/sales/orders'),
      ])
      if (invRes.ok) {
        const d = await invRes.json()
        setInvoices(Array.isArray(d) ? d : (d.invoices ?? []))
      }
      if (ordRes.ok) {
        const d = await ordRes.json()
        setOrders(Array.isArray(d) ? d : (d.orders ?? []))
      }
    } catch {
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function getBusinessId() {
    try {
      const raw = localStorage.getItem('an_user')
      if (!raw) return null
      const parsed = JSON.parse(raw)
      return parsed.activeBusinessId ?? null
    } catch {
      return null
    }
  }

  function addItem() {
    setItems((prev) => [...prev, { description: '', qty: 1, price: 0, taxPct: 18 }])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const businessId = getBusinessId()
    try {
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerEmail,
          notes,
          items,
          businessId,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to create invoice')
      }
      setShowForm(false)
      setCustomerName('')
      setCustomerEmail('')
      setNotes('')
      setItems([{ description: '', qty: 1, price: 0, taxPct: 18 }])
      fetchData()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const STATUSES = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE']

  const filteredInvoices = invoices.filter((inv) => {
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter
    const matchSearch =
      !search ||
      inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const filteredOrders = orders.filter((ord) => {
    return (
      !search ||
      ord.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      ord.customerName?.toLowerCase().includes(search.toLowerCase())
    )
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
            <h1 className="text-2xl font-semibold">Sales</h1>
            <p className="text-sm text-zinc-500">Manage invoices and orders</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-white text-black text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-100 transition"
          >
            <Plus className="w-4 h-4" /> New Invoice
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/[0.06]">
          {(['invoices', 'orders'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                tab === t
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-white/20"
            />
          </div>
          {tab === 'invoices' && (
            <div className="flex gap-1">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    statusFilter === s
                      ? 'bg-white text-black'
                      : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Invoices Table */}
        {tab === 'invoices' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Invoice #</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Customer</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-zinc-500 font-medium">Amount</th>
                  <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">
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
                      <td className="px-6 py-3 text-right">
                        <button className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08] transition ml-auto">
                          <Eye className="w-3.5 h-3.5 text-zinc-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Table */}
        {tab === 'orders' && (
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Order #</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Customer</th>
                  <th className="text-left px-6 py-3 text-zinc-500 font-medium">Date</th>
                  <th className="text-right px-6 py-3 text-zinc-500 font-medium">Amount</th>
                  <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-zinc-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord._id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3 font-medium text-white">{ord.orderNumber}</td>
                      <td className="px-6 py-3 text-zinc-300">{ord.customerName}</td>
                      <td className="px-6 py-3 text-zinc-500">{fmtDate(ord.createdAt)}</td>
                      <td className="px-6 py-3 text-right text-white">{fmt(ord.totalAmount)}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ord.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}>
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over: New Invoice */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="w-full max-w-lg bg-zinc-950 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="font-semibold text-white">New Invoice</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center hover:bg-white/[0.08]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Customer Name *</label>
                <input
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Customer Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  placeholder="billing@acme.com"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400">Line Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Item {idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-zinc-600 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-zinc-600 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-600 mb-1">Price</label>
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-600 mb-1">Tax %</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.taxPct}
                            onChange={(e) => updateItem(idx, 'taxPct', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/20"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.04] text-sm text-zinc-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

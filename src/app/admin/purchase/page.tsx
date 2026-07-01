'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  ShoppingBag,
  CheckCircle,
  Clock,
  DollarSign,
  Trash2,
} from 'lucide-react'

interface PurchaseOrder {
  _id: string
  poNumber: string
  vendorName: string
  totalAmount: number
  status: string
  deliveryDate?: string
  createdAt: string
  items?: { description: string; qty: number; price: number }[]
}

interface POItem {
  description: string
  qty: number
  price: number
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-500/20 text-zinc-400',
  SUBMITTED: 'bg-blue-500/20 text-blue-400',
  APPROVED: 'bg-green-500/20 text-green-400',
  REJECTED: 'bg-red-500/20 text-red-400',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function PurchasePage() {
  const router = useRouter()
  const [pos, setPOs] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [vendorName, setVendorName] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<POItem[]>([{ description: '', qty: 1, price: 0 }])

  useEffect(() => {
    fetchPOs()
  }, [])

  async function fetchPOs() {
    setLoading(true)
    try {
      const res = await fetch('/api/purchase/orders')
      if (res.ok) {
        const d = await res.json()
        setPOs(Array.isArray(d) ? d : (d.orders ?? []))
      } else {
        setError('Failed to load purchase orders')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  function addItem() {
    setItems((p) => [...p, { description: '', qty: 1, price: 0 }])
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof POItem, value: string | number) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/purchase/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorName, deliveryDate, notes, items }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to create purchase order')
      }
      setShowForm(false)
      setVendorName('')
      setDeliveryDate('')
      setNotes('')
      setItems([{ description: '', qty: 1, price: 0 }])
      fetchPOs()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const totalValue = pos.reduce((s, p) => s + (p.totalAmount ?? 0), 0)
  const approved = pos.filter((p) => p.status === 'APPROVED').length
  const pending = pos.filter((p) => ['DRAFT', 'SUBMITTED'].includes(p.status)).length

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
            <h1 className="text-2xl font-semibold">Purchase Orders</h1>
            <p className="text-sm text-zinc-500">Manage procurement and vendor orders</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-white text-black text-sm font-medium px-4 py-2 rounded-xl hover:bg-zinc-100 transition"
          >
            <Plus className="w-4 h-4" /> New PO
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ShoppingBag, label: 'Total POs', value: String(pos.length) },
            { icon: CheckCircle, label: 'Approved', value: String(approved) },
            { icon: Clock, label: 'Pending', value: String(pending) },
            { icon: DollarSign, label: 'Total Value', value: fmt(totalValue) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-zinc-300" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        {/* PO Table */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">PO #</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Vendor</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Date</th>
                <th className="text-left px-6 py-3 text-zinc-500 font-medium">Delivery</th>
                <th className="text-right px-6 py-3 text-zinc-500 font-medium">Amount</th>
                <th className="text-center px-6 py-3 text-zinc-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {pos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-zinc-500">
                    No purchase orders found
                  </td>
                </tr>
              ) : (
                pos.map((po) => (
                  <tr key={po._id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-3 font-medium text-white">{po.poNumber}</td>
                    <td className="px-6 py-3 text-zinc-300">{po.vendorName}</td>
                    <td className="px-6 py-3 text-zinc-500">{fmtDate(po.createdAt)}</td>
                    <td className="px-6 py-3 text-zinc-500">
                      {po.deliveryDate ? fmtDate(po.deliveryDate) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right text-white">{fmt(po.totalAmount)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[po.status] ?? 'bg-zinc-500/20 text-zinc-400'}`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: New PO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-lg bg-zinc-950 border-l border-white/[0.06] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="font-semibold text-white">New Purchase Order</h2>
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
                <label className="block text-xs text-zinc-400 mb-1.5">Vendor Name *</label>
                <input
                  required
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                  placeholder="Supplier Ltd."
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Delivery Date</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-zinc-400">Items</label>
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
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-zinc-600 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-zinc-600 mb-1">Price</label>
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5 text-sm text-white outline-none"
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
                Create PO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

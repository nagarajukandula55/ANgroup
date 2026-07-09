'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  ShoppingCart,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Trash2,
} from 'lucide-react'

interface OrderItem {
  description: string
  qty: number
  price: number
}

interface Order {
  _id: string
  orderNumber: string
  customerName: string
  customerEmail?: string
  totalAmount: number
  status: string
  createdAt: string
  items?: OrderItem[]
}

const STATUS_TABS = ['ALL', 'DRAFT', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-500',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PROCESSING: 'bg-yellow-500/20 text-yellow-400',
  SHIPPED: 'bg-purple-500/20 text-purple-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function OrdersPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    customerName: '',
    customerEmail: '',
    notes: '',
  })
  const [items, setItems] = useState<OrderItem[]>([{ description: '', qty: 1, price: 0 }])

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    try {
      const res = await fetch('/api/sales/orders')
      if (res.ok) {
        const d = await res.json()
        setOrders(Array.isArray(d) ? d : (d.orders ?? []))
      } else {
        setError('Failed to load orders')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  async function updateStatus(id: string, newStatus: string) {
    setUpdatingId(id)
    try {
      const res = await fetch(`/api/sales/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setOrders((prev) => prev.map((o) => (o._id === id ? { ...o, status: newStatus } : o)))
      }
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null)
    }
  }

  function addItem() {
    setItems((p) => [...p, { description: '', qty: 1, price: 0 }])
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx))
  }

  function updateItem(idx: number, field: keyof OrderItem, value: string | number) {
    setItems((p) => p.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/sales/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, items }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.message ?? 'Failed to create order')
      }
      setShowForm(false)
      setForm({ customerName: '', customerEmail: '', notes: '' })
      setItems([{ description: '', qty: 1, price: 0 }])
      fetchOrders()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const total = orders.length
  const processing = orders.filter((o) => o.status === 'PROCESSING').length
  const shipped = orders.filter((o) => o.status === 'SHIPPED').length
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length
  const cancelled = orders.filter((o) => o.status === 'CANCELLED').length

  const filtered = orders.filter((o) => statusFilter === 'ALL' || o.status === statusFilter)

  const nextStatus: Record<string, string> = {
    DRAFT: 'CONFIRMED',
    CONFIRMED: 'PROCESSING',
    PROCESSING: 'SHIPPED',
    SHIPPED: 'DELIVERED',
  }

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
            <h1 className="text-2xl font-semibold">Orders</h1>
            <p className="text-sm text-gray-400">Customer order management</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> New Order
          </button>
        </div>

        {error && (
          <div className="mb-6 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {[
            { icon: ShoppingCart, label: 'Total', value: String(total) },
            { icon: Package, label: 'Processing', value: String(processing) },
            { icon: Truck, label: 'Shipped', value: String(shipped) },
            { icon: CheckCircle, label: 'Delivered', value: String(delivered) },
            { icon: XCircle, label: 'Cancelled', value: String(cancelled) },
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

        {/* Status Tabs */}
        <div className="flex gap-1 flex-wrap mb-6">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                statusFilter === s
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Order #</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Customer</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Items</th>
                <th className="text-right px-6 py-3 text-gray-400 font-medium">Amount</th>
                <th className="text-center px-6 py-3 text-gray-400 font-medium">Status</th>
                <th className="text-left px-6 py-3 text-gray-400 font-medium">Date</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                filtered.map((ord) => (
                  <tr key={ord._id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 font-medium text-gray-900">{ord.orderNumber}</td>
                    <td className="px-6 py-3 text-gray-700">{ord.customerName}</td>
                    <td className="px-6 py-3 text-center text-gray-500">{ord.items?.length ?? 0}</td>
                    <td className="px-6 py-3 text-right text-gray-900">{fmt(ord.totalAmount)}</td>
                    <td className="px-6 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[ord.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-400">{fmtDate(ord.createdAt)}</td>
                    <td className="px-6 py-3 text-right">
                      {nextStatus[ord.status] && (
                        <button
                          onClick={() => updateStatus(ord._id, nextStatus[ord.status])}
                          disabled={updatingId === ord._id}
                          className="px-3 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-white/[0.15] transition disabled:opacity-50"
                        >
                          {updatingId === ord._id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            `→ ${nextStatus[ord.status]}`
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: New Order */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-gray-50/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-lg bg-gray-50 border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">New Order</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
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
                <label className="block text-xs text-gray-500 mb-1.5">Customer Name *</label>
                <input
                  required
                  value={form.customerName}
                  onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Customer Email</label>
                <input
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => setForm((p) => ({ ...p, customerEmail: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20"
                  placeholder="customer@example.com"
                />
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">Order Items</label>
                  <button
                    type="button"
                    onClick={addItem}
                    className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3 h-3" /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">Item {idx + 1}</span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="text-gray-400 hover:text-red-400 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        value={item.description}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Product / Description"
                        className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-white/20"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Qty</label>
                          <input
                            type="number"
                            min={1}
                            value={item.qty}
                            onChange={(e) => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Quantity"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Price</label>
                          <input
                            type="number"
                            min={0}
                            value={item.price}
                            onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            placeholder="Unit price"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-white/20 resize-none"
                  placeholder="Additional notes about this order..."
                />
              </div>
            </form>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-500 hover:text-gray-900 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

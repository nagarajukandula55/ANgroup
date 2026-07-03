'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, ArrowLeft, Plus, X, Search, Eye, Trash2,
  FileText, ShoppingCart, IndianRupee, CheckCircle, Clock, Download,
} from 'lucide-react'

interface Customer {
  name: string
  email?: string
  phone?: string
  address?: string
  gstin?: string
}

interface Invoice {
  _id: string
  invoiceNumber: string
  customer: Customer
  customerName?: string   // legacy fallback
  grandTotal?: number
  totalAmount?: number    // legacy fallback
  status: string
  createdAt: string
  dueDate?: string
  supplyType?: 'INTRASTATE' | 'INTERSTATE'
  cgstTotal?: number
  sgstTotal?: number
  igstTotal?: number
  subtotal?: number
  taxTotal?: number
}

interface Order {
  _id: string
  orderNumber: string
  customerName: string
  totalAmount: number
  status: string
  createdAt: string
}

interface LineItem {
  description: string
  hsnCode: string
  qty: number
  unit: string
  price: number
  taxPct: number
}

const STATUS_COLORS: Record<string, string> = {
  PAID:       'bg-green-50 text-green-700',
  DRAFT:      'bg-gray-100 text-gray-600',
  SENT:       'bg-blue-50 text-blue-700',
  OVERDUE:    'bg-red-50 text-red-700',
  CANCELLED:  'bg-red-50 text-red-700',
  CONFIRMED:  'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  SHIPPED:    'bg-purple-50 text-purple-700',
  DELIVERED:  'bg-green-50 text-green-700',
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n)

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

function calcItems(items: LineItem[], supplyType: 'INTRASTATE' | 'INTERSTATE') {
  let subtotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0
  const rows = items.map(item => {
    const lineAmt = (item.qty || 1) * (item.price || 0)
    const taxAmt  = lineAmt * ((item.taxPct || 0) / 100)
    subtotal += lineAmt
    if (supplyType === 'INTERSTATE') {
      igstTotal += taxAmt
    } else {
      cgstTotal += taxAmt / 2
      sgstTotal += taxAmt / 2
    }
    return { ...item, lineAmount: lineAmt, taxAmount: taxAmt }
  })
  const grandTotal = subtotal + cgstTotal + sgstTotal + igstTotal
  return { rows, subtotal, cgstTotal, sgstTotal, igstTotal, grandTotal }
}

export default function SalesPage() {
  const router = useRouter()
  const [tab, setTab]             = useState<'invoices' | 'orders'>('invoices')
  const [invoices, setInvoices]   = useState<Invoice[]>([])
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [statusFilter, setStatus] = useState('ALL')
  const [search, setSearch]       = useState('')
  const [showForm, setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [preview, setPreview]     = useState<Invoice | null>(null)

  // Form state
  const [supplyType, setSupplyType] = useState<'INTRASTATE' | 'INTERSTATE'>('INTRASTATE')
  const [customer, setCustomer]     = useState<Customer>({ name: '', email: '', phone: '', address: '', gstin: '' })
  const [notes, setNotes]           = useState('')
  const [terms, setTerms]           = useState('Payment due within 30 days.')
  const [dueDate, setDueDate]       = useState('')
  const [items, setItems]           = useState<LineItem[]>([
    { description: '', hsnCode: '', qty: 1, unit: 'Nos', price: 0, taxPct: 18 },
  ])
  const [discount, setDiscount]     = useState(0)

  useEffect(() => { fetchData() }, [])

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
    } catch { setError('Failed to load data') }
    finally   { setLoading(false) }
  }

  function getBusinessId(): string | null {
    try {
      const r = localStorage.getItem('an_user')
      return r ? JSON.parse(r).activeBusinessId ?? null : null
    } catch { return null }
  }

  function addItem() {
    setItems(p => [...p, { description: '', hsnCode: '', qty: 1, unit: 'Nos', price: 0, taxPct: 18 }])
  }
  function removeItem(i: number) {
    setItems(p => p.filter((_, idx) => idx !== i))
  }
  function updateItem(i: number, field: keyof LineItem, value: string | number) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it))
  }

  const calc = calcItems(items, supplyType)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!customer.name.trim()) { setFormError('Customer name is required'); return }
    setSubmitting(true); setFormError(null)
    const businessId = getBusinessId()
    try {
      const payload = {
        businessId,
        customer,
        supplyType,
        items: items.map(it => ({
          description: it.description,
          hsnCode:     it.hsnCode,
          quantity:    it.qty,
          unit:        it.unit,
          unitPrice:   it.price,
          taxRate:     it.taxPct,
        })),
        discountAmount: discount,
        notes,
        terms,
        dueDate: dueDate || undefined,
        status: 'DRAFT',
      }
      const res = await fetch('/api/sales/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? d.message ?? 'Failed to create invoice')
      }
      setShowForm(false)
      resetForm()
      fetchData()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally { setSubmitting(false) }
  }

  function resetForm() {
    setCustomer({ name: '', email: '', phone: '', address: '', gstin: '' })
    setItems([{ description: '', hsnCode: '', qty: 1, unit: 'Nos', price: 0, taxPct: 18 }])
    setNotes(''); setTerms('Payment due within 30 days.')
    setDueDate(''); setDiscount(0); setSupplyType('INTRASTATE')
  }

  const STATUSES = ['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE']

  // Normalize invoice display fields (handle old + new format)
  const getCustomerName = (inv: Invoice) => inv.customer?.name || inv.customerName || '—'
  const getAmount       = (inv: Invoice) => inv.grandTotal ?? inv.totalAmount ?? 0

  const filteredInvoices = invoices.filter(inv => {
    const matchStatus = statusFilter === 'ALL' || inv.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !search ||
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      getCustomerName(inv).toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const filteredOrders = orders.filter(ord =>
    !search ||
    ord.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
    ord.customerName?.toLowerCase().includes(search.toLowerCase())
  )

  // Stats
  const paidTotal    = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + getAmount(i), 0)
  const pendingTotal = invoices.filter(i => ['SENT','OVERDUE'].includes(i.status)).reduce((s, i) => s + getAmount(i), 0)
  const draftCount   = invoices.filter(i => i.status === 'DRAFT').length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={15} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Sales</h1>
            <p className="text-sm text-gray-500">Invoices, orders & GST records</p>
          </div>
          <button onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition">
            <Plus size={15} /> New Invoice
          </button>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: IndianRupee, label: 'Revenue Collected', value: fmt(paidTotal), color: 'bg-green-100' },
            { icon: Clock,       label: 'Pending Payments',  value: fmt(pendingTotal), color: 'bg-orange-100' },
            { icon: FileText,    label: 'Total Invoices',    value: String(invoices.length), color: 'bg-purple-100' },
            { icon: ShoppingCart,label: 'Total Orders',      value: String(orders.length), color: 'bg-blue-100' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">{label}</span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={16} className="text-gray-600" />
                </div>
              </div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {(['invoices', 'orders'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px ${
                tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t} {t === 'invoices' ? `(${invoices.length})` : `(${orders.length})`}
            </button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by number or customer..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400 shadow-sm" />
          </div>
          {tab === 'invoices' && (
            <div className="flex gap-1">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
                  }`}>{s}</button>
              ))}
            </div>
          )}
        </div>

        {/* Invoices Table */}
        {tab === 'invoices' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400 text-sm">No invoices found</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3">
                      <p className="text-gray-900">{getCustomerName(inv)}</p>
                      {inv.customer?.gstin && <p className="text-xs text-gray-400 font-mono">{inv.customer.gstin}</p>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(inv.createdAt)}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(getAmount(inv))}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[inv.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => setPreview(inv)}
                        className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition ml-auto">
                        <Eye size={13} className="text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders Table */}
        {tab === 'orders' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Order #</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-10 text-center text-gray-400 text-sm">No orders found</td></tr>
                ) : filteredOrders.map(ord => (
                  <tr key={ord._id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-3 font-medium text-gray-900">{ord.orderNumber}</td>
                    <td className="px-5 py-3 text-gray-700">{ord.customerName}</td>
                    <td className="px-5 py-3 text-gray-500">{fmtDate(ord.createdAt)}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(ord.totalAmount)}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ord.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {ord.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── New Invoice Slide-over ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm() }} />
          <div className="w-full max-w-2xl bg-white border-l border-gray-200 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">New GST Invoice</h2>
                <p className="text-xs text-gray-500 mt-0.5">Compliant with Indian GST regulations</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm() }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={14} className="text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-6">
                {formError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</div>
                )}

                {/* Supply Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wider">Supply Type</label>
                  <div className="flex gap-2">
                    {(['INTRASTATE', 'INTERSTATE'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setSupplyType(t)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                          supplyType === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}>
                        {t === 'INTRASTATE' ? 'Intrastate (CGST + SGST)' : 'Interstate (IGST)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wider">Bill To</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Company / Customer Name *</label>
                      <input required value={customer.name}
                        onChange={e => setCustomer(p => ({ ...p, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
                        placeholder="Acme Pvt Ltd" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">GSTIN</label>
                      <input value={customer.gstin}
                        onChange={e => setCustomer(p => ({ ...p, gstin: e.target.value.toUpperCase() }))}
                        maxLength={15}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-gray-400"
                        placeholder="22AAAAA0000A1Z5" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Phone</label>
                      <input value={customer.phone}
                        onChange={e => setCustomer(p => ({ ...p, phone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                        placeholder="+91 98765 43210" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Email</label>
                      <input type="email" value={customer.email}
                        onChange={e => setCustomer(p => ({ ...p, email: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                        placeholder="billing@acme.com" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                      <input type="date" value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1">Billing Address</label>
                      <input value={customer.address}
                        onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                        placeholder="Street, City, State - PIN" />
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Line Items</label>
                    <button type="button" onClick={addItem}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 transition">
                      <Plus size={12} /> Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Item {idx + 1}</span>
                          {items.length > 1 && (
                            <button type="button" onClick={() => removeItem(idx)}
                              className="text-gray-400 hover:text-red-500 transition">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="block text-[10px] text-gray-500 mb-1">Description *</label>
                            <input value={item.description}
                              onChange={e => updateItem(idx, 'description', e.target.value)}
                              placeholder="Product or service description"
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">HSN / SAC Code</label>
                            <input value={item.hsnCode}
                              onChange={e => updateItem(idx, 'hsnCode', e.target.value)}
                              placeholder="e.g. 8471"
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400 font-mono" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Unit</label>
                            <select value={item.unit} onChange={e => updateItem(idx, 'unit', e.target.value)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400">
                              {['Nos', 'Kg', 'Litre', 'Metre', 'Sq.Ft', 'Sq.Mt', 'Box', 'Pcs', 'Set', 'Hr'].map(u =>
                                <option key={u}>{u}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Quantity</label>
                            <input type="number" min={0.01} step={0.01} value={item.qty}
                              onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Rate (₹)</label>
                            <input type="number" min={0} value={item.price}
                              onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400" />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">GST Rate %</label>
                            <select value={item.taxPct} onChange={e => updateItem(idx, 'taxPct', parseInt(e.target.value))}
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400">
                              {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-1">Taxable Value</label>
                            <div className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-500">
                              {fmt((item.qty || 1) * (item.price || 0))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* GST Summary */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal (Taxable Value)</span>
                    <span className="font-medium">{fmt(calc.subtotal)}</span>
                  </div>
                  {supplyType === 'INTRASTATE' ? (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>CGST</span>
                        <span>{fmt(calc.cgstTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>SGST</span>
                        <span>{fmt(calc.sgstTotal)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>IGST</span>
                      <span>{fmt(calc.igstTotal)}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Discount (₹)</label>
                    <input type="number" min={0} value={discount}
                      onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white outline-none focus:border-gray-400" />
                  </div>
                  <div className="flex justify-between text-base font-semibold text-gray-900 pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span>{fmt(calc.grandTotal - discount)}</span>
                  </div>
                </div>

                {/* Notes / Terms */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                      placeholder="Payment details, special instructions..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Terms & Conditions</label>
                    <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400 resize-none" />
                  </div>
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); resetForm() }}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:text-gray-900 transition">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPreview(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">Invoice Details</h3>
                <p className="text-sm text-gray-500">{preview.invoiceNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[preview.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {preview.status}
                </span>
                <button onClick={() => setPreview(null)} className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                  <X size={13} className="text-gray-500" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Customer</p>
                <p className="text-gray-900 font-medium">{getCustomerName(preview)}</p>
                {preview.customer?.gstin && <p className="text-gray-400 font-mono text-xs">{preview.customer.gstin}</p>}
              </div>
              <div>
                <p className="text-gray-500 text-xs">Date</p>
                <p className="text-gray-900">{fmtDate(preview.createdAt)}</p>
              </div>
              {preview.supplyType && (
                <div>
                  <p className="text-gray-500 text-xs">Supply Type</p>
                  <p className="text-gray-900">{preview.supplyType}</p>
                </div>
              )}
              <div className="col-span-2 border-t border-gray-100 pt-3 space-y-1">
                {preview.subtotal != null && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Subtotal</span><span>{fmt(preview.subtotal)}</span>
                  </div>
                )}
                {(preview.cgstTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>CGST</span><span>{fmt(preview.cgstTotal!)}</span>
                  </div>
                )}
                {(preview.sgstTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>SGST</span><span>{fmt(preview.sgstTotal!)}</span>
                  </div>
                )}
                {(preview.igstTotal ?? 0) > 0 && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>IGST</span><span>{fmt(preview.igstTotal!)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-gray-900 pt-1 border-t border-gray-100">
                  <span>Total</span><span>{fmt(getAmount(preview))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

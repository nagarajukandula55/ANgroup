'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  X,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
} from 'lucide-react'

interface Product {
  _id: string
  name: string
  sku?: string
  description?: string
  category?: string
  basePrice?: number
  taxRate?: number
  unit?: string
  hsn?: string
  reorderLevel?: number
  quantity?: number
  status?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

function getStatusInfo(p: Product): { label: string; cls: string } {
  const qty = p.quantity ?? 0
  const reorder = p.reorderLevel ?? 0
  if (p.status === 'INACTIVE') return { label: 'Inactive', cls: 'bg-gray-100 text-gray-500' }
  if (qty === 0) return { label: 'Out of Stock', cls: 'bg-red-500/20 text-red-400' }
  if (qty <= reorder) return { label: 'Low Stock', cls: 'bg-yellow-500/20 text-yellow-400' }
  return { label: 'Active', cls: 'bg-green-500/20 text-green-400' }
}

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    sku: '',
    description: '',
    category: '',
    basePrice: '',
    taxRate: '18',
    unit: '',
    hsn: '',
    reorderLevel: '',
  })

  const fetchProducts = useCallback(async (bId: string) => {
    setLoading(true)
    setError(null)
    try {
      // /api/products is the real Product catalog endpoint (with SEO fields,
      // HSN, slug, etc.) — the Inventory Items endpoint used previously is a
      // different data model entirely and always 400'd here since it
      // requires a businessId this page never sent.
      const res = await fetch(`/api/products?businessId=${bId}`, {
        headers: { 'x-active-business-id': bId },
      })
      if (res.ok) {
        const d = await res.json()
        const list: any[] = Array.isArray(d) ? d : (d.products ?? [])
        setProducts(
          list.map((p) => ({
            ...p,
            quantity: p.stock ?? p.quantity ?? 0,
            status: p.isActive === false ? 'INACTIVE' : 'ACTIVE',
          }))
        )
      } else {
        setError('Failed to load products')
      }
    } catch {
      setError('Failed to connect')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => {
        const bId = d.user?.activeBusinessId
        setBusinessId(bId || null)
        if (bId) {
          fetchProducts(bId)
        } else {
          setLoading(false)
          setError('No active business selected')
        }
      })
      .catch(() => {
        setLoading(false)
        setError('Failed to connect')
      })
  }, [fetchProducts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!businessId) {
      setFormError('No active business selected')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-active-business-id': businessId },
        body: JSON.stringify({
          ...form,
          businessId,
          basePrice: parseFloat(form.basePrice) || 0,
          taxRate: parseFloat(form.taxRate) || 18,
          reorderLevel: parseInt(form.reorderLevel) || 0,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? d.message ?? 'Failed to add product')
      }
      setShowForm(false)
      setForm({ name: '', sku: '', description: '', category: '', basePrice: '', taxRate: '18', unit: '', hsn: '', reorderLevel: '' })
      fetchProducts(businessId)
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const categories = ['ALL', ...Array.from(new Set(products.map((p) => p.category ?? '').filter(Boolean)))]

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
    const matchCat = categoryFilter === 'ALL' || p.category === categoryFilter
    return matchSearch && matchCat
  })

  const total = products.length
  const active = products.filter((p) => p.status !== 'INACTIVE' && (p.quantity ?? 0) > 0).length
  const inactive = products.filter((p) => p.status === 'INACTIVE').length
  const lowStock = products.filter((p) => {
    const qty = p.quantity ?? 0
    const reorder = p.reorderLevel ?? 0
    return qty > 0 && qty <= reorder
  }).length

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
            <h1 className="text-2xl font-semibold">Products</h1>
            <p className="text-sm text-gray-500">Product catalog management</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
          >
            <Plus className="w-4 h-4" /> Add Product
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
            { icon: Package, label: 'Total Products', value: String(total) },
            { icon: CheckCircle, label: 'Active', value: String(active) },
            { icon: XCircle, label: 'Inactive', value: String(inactive) },
            { icon: AlertTriangle, label: 'Low Stock', value: String(lowStock) },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-gray-200 bg-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">{label}</span>
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-gray-600" />
                </div>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search products, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-gray-400"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {categories.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">SKU</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Category</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Base Price</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Tax %</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Unit</th>
                <th className="text-right px-6 py-3 text-gray-500 font-medium">Stock</th>
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const { label, cls } = getStatusInfo(p)
                  return (
                    <tr key={p._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.sku ?? '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{p.category ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-gray-900">{p.basePrice != null ? fmt(p.basePrice) : '—'}</td>
                      <td className="px-6 py-3 text-center text-gray-500">{p.taxRate != null ? `${p.taxRate}%` : '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{p.unit ?? '—'}</td>
                      <td className="px-6 py-3 text-right text-gray-900">{p.quantity ?? 0}</td>
                      <td className="px-6 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>{label}</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over: Add Product */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Add Product</h2>
              <button
                onClick={() => setShowForm(false)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {formError && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  {formError}
                </div>
              )}
              {([
                { field: 'name', label: 'Product Name *', type: 'text', required: true },
                { field: 'sku', label: 'SKU', type: 'text', required: false },
                { field: 'category', label: 'Category', type: 'text', required: false },
                { field: 'basePrice', label: 'Base Price (₹)', type: 'number', required: false },
                { field: 'taxRate', label: 'Tax Rate (%)', type: 'number', required: false },
                { field: 'unit', label: 'Unit (e.g. pcs, kg)', type: 'text', required: false },
                { field: 'hsn', label: 'HSN Code', type: 'text', required: false },
                { field: 'reorderLevel', label: 'Reorder Level', type: 'number', required: false },
              ] as const).map(({ field, label, type, required }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-gray-400 resize-none"
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
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Package,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Pencil,
  Trash2,
  X,
} from 'lucide-react'

interface CategoryOption {
  _id: string
  name: string
}

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
  images?: string[]
  slug?: string
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  isActive?: boolean
}

const emptyForm = {
  name: '',
  sku: '',
  description: '',
  category: '',
  unit: 'pcs',
  basePrice: 0,
  taxRate: 18,
  hsn: '',
  stock: 0,
  reorderLevel: 0,
  images: '',
  slug: '',
  metaTitle: '',
  metaDescription: '',
  keywords: '',
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
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [addingCategory, setAddingCategory] = useState(false)

  const fetchCategoryOptions = useCallback(async (bId: string) => {
    try {
      const res = await fetch(`/api/product-categories?businessId=${bId}`)
      const d = await res.json()
      if (d.success) setCategoryOptions(d.categories || [])
    } catch {
      // non-fatal — form falls back to an empty dropdown
    }
  }, [])

  async function handleAddCategory() {
    if (!businessId || !newCategoryName.trim()) return
    setAddingCategory(true)
    try {
      const res = await fetch('/api/product-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim(), businessId }),
      })
      const d = await res.json()
      if (res.ok && d.success) {
        await fetchCategoryOptions(businessId)
        setForm((f) => ({ ...f, category: d.category.name }))
        setNewCategoryName('')
        setShowAddCategory(false)
      } else {
        setFormError(d.error || 'Failed to create category')
      }
    } catch {
      setFormError('Failed to connect')
    } finally {
      setAddingCategory(false)
    }
  }

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
          fetchCategoryOptions(bId)
        } else {
          setLoading(false)
          setError('No active business selected')
        }
      })
      .catch(() => {
        setLoading(false)
        setError('Failed to connect')
      })
  }, [fetchProducts, fetchCategoryOptions])

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

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm({
      name: p.name || '',
      sku: p.sku || '',
      description: p.description || '',
      category: p.category || '',
      unit: p.unit || 'pcs',
      basePrice: p.basePrice ?? 0,
      taxRate: p.taxRate ?? 18,
      hsn: p.hsn || '',
      stock: p.quantity ?? 0,
      reorderLevel: p.reorderLevel ?? 0,
      images: (p.images || []).join(', '),
      slug: p.slug || '',
      metaTitle: p.metaTitle || '',
      metaDescription: p.metaDescription || '',
      keywords: (p.keywords || []).join(', '),
    })
    setFormError(null)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!businessId) return
    if (!form.name.trim()) {
      setFormError('Product name is required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        description: form.description || undefined,
        category: form.category || undefined,
        unit: form.unit || undefined,
        basePrice: Number(form.basePrice) || 0,
        taxRate: Number(form.taxRate) || 0,
        hsn: form.hsn || undefined,
        stock: Number(form.stock) || 0,
        reorderLevel: Number(form.reorderLevel) || 0,
        images: form.images.split(',').map((s) => s.trim()).filter(Boolean),
        slug: form.slug || undefined,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        keywords: form.keywords.split(',').map((s) => s.trim()).filter(Boolean),
        businessId,
      }

      const res = editing
        ? await fetch(`/api/products/${editing._id}?businessId=${businessId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'x-active-business-id': businessId },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-active-business-id': businessId },
            body: JSON.stringify(payload),
          })

      const d = await res.json()
      if (!res.ok || !d.success) {
        setFormError(d.error || 'Failed to save product')
        setSubmitting(false)
        return
      }

      setShowForm(false)
      fetchProducts(businessId)
    } catch {
      setFormError('Failed to connect')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(p: Product) {
    if (!businessId) return
    if (!confirm(`Delete "${p.name}"? This can be restored later from the database if needed.`)) return
    try {
      const res = await fetch(`/api/products/${p._id}?businessId=${businessId}`, {
        method: 'DELETE',
        headers: { 'x-active-business-id': businessId },
      })
      const d = await res.json()
      if (res.ok && d.success) {
        fetchProducts(businessId)
      } else {
        alert(d.error || 'Failed to delete product')
      }
    } catch {
      alert('Failed to connect')
    }
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
            <h1 className="text-2xl font-semibold">Products</h1>
            <p className="text-sm text-gray-500">Product catalog management</p>
          </div>
          <button
            onClick={openCreate}
            disabled={!businessId}
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition disabled:opacity-50"
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
                <th className="text-center px-6 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
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
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-red-50 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {formError && (
                <div className="text-sm text-red-500 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Category</label>
                  {!showAddCategory ? (
                    <div className="mt-1 flex gap-2">
                      <select
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                      >
                        <option value="">— Select category —</option>
                        {categoryOptions.map((c) => (
                          <option key={c._id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowAddCategory(true)}
                        className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 transition"
                        title="Add new category"
                      >
                        + Add
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1 flex gap-2">
                      <input
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        placeholder="New category name"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        disabled={addingCategory || !newCategoryName.trim()}
                        className="shrink-0 px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddCategory(false); setNewCategoryName('') }}
                        className="shrink-0 px-3 py-2 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Base Price (₹)</label>
                  <input
                    type="number"
                    value={form.basePrice}
                    onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Tax Rate (GST %)</label>
                  <input
                    type="number"
                    value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">HSN Code</label>
                  <input
                    value={form.hsn}
                    onChange={(e) => setForm({ ...form, hsn: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Stock</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Reorder Level</label>
                  <input
                    type="number"
                    value={form.reorderLevel}
                    onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Image URLs (comma-separated)</label>
                  <input
                    value={form.images}
                    onChange={(e) => setForm({ ...form, images: e.target.value })}
                    placeholder="https://.../img1.jpg, https://.../img2.jpg"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>

                <div className="col-span-2 pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-700 mb-2">SEO</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Slug</label>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="auto-generated from name if empty"
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Meta Title</label>
                  <input
                    value={form.metaTitle}
                    onChange={(e) => setForm({ ...form, metaTitle: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Meta Description</label>
                  <textarea
                    value={form.metaDescription}
                    onChange={(e) => setForm({ ...form, metaDescription: e.target.value })}
                    rows={2}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500">Keywords (comma-separated)</label>
                  <input
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

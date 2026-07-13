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
  images?: string[]
  slug?: string
  metaTitle?: string
  metaDescription?: string
  keywords?: string[]
  isActive?: boolean
  businessId?: string | { _id: string; name?: string; brandName?: string; legalName?: string }
}

function businessLabel(businessId: Product['businessId']): string {
  if (!businessId) return '—'
  if (typeof businessId === 'string') return businessId
  return businessId.brandName || businessId.legalName || businessId.name || businessId._id
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

// NOTE: This page is a READ-ONLY browse/list view over NativeProduct — the
// same model the Native storefront reads from (see models/NativeProduct.ts
// and api/storefront/products/route.ts). It previously also had its own
// parallel "Add Product" / "Edit Product" modal that wrote directly to
// NativeProduct via a plain comma-separated image-URL text field and free
// text category, completely bypassing the rich vendor-product-wizard
// (Cloudinary upload, real category dropdown, BOM cost engine, SEO,
// compliance, GST/HSN lookup, approval workflow). Per explicit product
// direction ("make 1 single product upload source, nothing else"), that
// modal has been removed entirely. The ONLY way to create or edit a
// product — for a vendor or a super admin — is the wizard at
// /vendor/products/new (which already resolves the correct businessId).
// This list remains for browsing/searching the live catalog.
export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  // Super Admin defaults to seeing every business's products, not just
  // whichever one happens to be their currently-active business — per
  // explicit direction that the platform team needs full-catalog control.
  const [viewAllBusinesses, setViewAllBusinesses] = useState(true)
  // Real ProductCategory tree (parentId chains), fetched separately from
  // the flat category strings stored on Product itself -- lets the filter
  // list reflect actual parent/child branching (e.g. "Mobiles" with
  // "Smartphones"/"Feature Phones" nested under it) instead of just an
  // alphabetical list of whatever strings happen to appear on products.
  const [categoryTree, setCategoryTree] = useState<{ id: string; name: string; depth: number }[]>([])

  const fetchProducts = useCallback(async (bId: string | null, allBusinesses: boolean) => {
    setLoading(true)
    setError(null)
    try {
      // /api/products is the real Product catalog endpoint (with SEO fields,
      // HSN, slug, etc.) — the Inventory Items endpoint used previously is a
      // different data model entirely and always 400'd here since it
      // requires a businessId this page never sent.
      const qs = allBusinesses ? 'allBusinesses=true' : `businessId=${bId}`
      const res = await fetch(`/api/products?${qs}`, {
        headers: bId ? { 'x-active-business-id': bId } : {},
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
        const superAdmin = !!d.user?.isSuperAdmin
        setBusinessId(bId || null)
        setIsSuperAdmin(superAdmin)
        if (superAdmin) {
          fetchProducts(bId || null, true)
        } else if (bId) {
          fetchProducts(bId, false)
        } else {
          setLoading(false)
          setError('No active business selected')
        }
        const catBusinessId = bId || d.businesses?.[0]?._id
        if (catBusinessId) fetchCategoryTree(catBusinessId)
      })
      .catch(() => {
        setLoading(false)
        setError('Failed to connect')
      })
  }, [fetchProducts])

  async function fetchCategoryTree(bId: string) {
    try {
      const res = await fetch(`/api/product-categories?businessId=${bId}`)
      const data = await res.json()
      const raw: any[] = data.categories || data.data || []
      const byParent = new Map<string, any[]>()
      for (const c of raw) {
        const pid = c.parentId?._id || c.parentId || 'root'
        if (!byParent.has(pid)) byParent.set(pid, [])
        byParent.get(pid)!.push(c)
      }
      const flat: { id: string; name: string; depth: number }[] = []
      const walk = (parentKey: string, depth: number) => {
        for (const c of byParent.get(parentKey) || []) {
          flat.push({ id: c._id, name: c.name, depth })
          walk(c._id, depth + 1)
        }
      }
      walk('root', 0)
      setCategoryTree(flat)
    } catch {
      /* filter falls back to the flat product-derived list below */
    }
  }

  function toggleAllBusinesses() {
    const next = !viewAllBusinesses
    setViewAllBusinesses(next)
    fetchProducts(businessId, next)
  }

  // Tree-ordered when the real category hierarchy loaded successfully
  // (parent immediately followed by its children, indented); falls back to
  // the flat alphabetical list derived from products if it didn't, or for
  // any legacy free-text category value that isn't in the tree at all.
  const productCategoryNames = Array.from(new Set(products.map((p) => p.category ?? '').filter(Boolean)))
  const treeNames = new Set(categoryTree.map((c) => c.name))
  const orphanCategories = productCategoryNames.filter((c) => !treeNames.has(c))
  const categoryOptions: { label: string; depth: number }[] =
    categoryTree.length > 0
      ? [...categoryTree.map((c) => ({ label: c.name, depth: c.depth })), ...orphanCategories.map((c) => ({ label: c, depth: 0 }))]
      : productCategoryNames.map((c) => ({ label: c, depth: 0 }))

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
            <p className="text-sm text-gray-500">
              {isSuperAdmin && viewAllBusinesses ? 'Product catalog across every business' : 'Product catalog — browse the live catalog'}
            </p>
          </div>
          {isSuperAdmin && (
            <>
              <button
                onClick={() => router.push('/admin/vendor-products/pending')}
                className="ml-auto flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition"
                title="Products submitted by vendors awaiting Super Admin approval"
              >
                Pending Approvals
              </button>
              <button
                onClick={toggleAllBusinesses}
                className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl border transition ${
                  viewAllBusinesses
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {viewAllBusinesses ? 'All Businesses' : 'My Business Only'}
              </button>
            </>
          )}
          <button
            onClick={() =>
              router.push(
                businessId
                  ? `/vendor/products/new?businessId=${businessId}`
                  : '/vendor/products/new'
              )
            }
            className="ml-auto flex items-center gap-2 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition"
            title="Products are created through the vendor product wizard — the single product upload source"
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
          <div className="min-w-[220px]">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-gray-400"
            >
              <option value="ALL">All Categories</option>
              {categoryOptions.map((c) => (
                <option key={c.label} value={c.label}>
                  {'  '.repeat(c.depth)}{c.depth > 0 ? '↳ ' : ''}{c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-6 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-6 py-3 text-gray-500 font-medium">SKU</th>
                {isSuperAdmin && viewAllBusinesses && (
                  <th className="text-left px-6 py-3 text-gray-500 font-medium">Business</th>
                )}
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
                  <td colSpan={isSuperAdmin && viewAllBusinesses ? 9 : 8} className="px-6 py-10 text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const { label, cls } = getStatusInfo(p)
                  return (
                    <tr
                      key={p._id}
                      onClick={() => router.push(`/admin/products/${p._id}`)}
                      className="hover:bg-gray-50 transition cursor-pointer"
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-gray-500 font-mono text-xs">{p.sku ?? '—'}</td>
                      {isSuperAdmin && viewAllBusinesses && (
                        <td className="px-6 py-3 text-gray-500">{businessLabel(p.businessId)}</td>
                      )}
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
    </div>
  )
}

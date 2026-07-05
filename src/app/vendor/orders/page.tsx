'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  AlertCircle,
  Loader2,
  ChevronRight,
  Package,
} from 'lucide-react'

interface Order {
  _id: string
  orderNumber: string
  createdAt: string
  totalAmount: number
  status: string
  items: Array<{ name: string; quantity: number; price: number }>
}

interface OrdersResponse {
  success: boolean
  orders: Order[]
  total: number
  page: number
  totalPages: number
}

const STATUS_TABS = ['All', 'Pending', 'Processing', 'Delivered', 'Cancelled']

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function VendorOrdersPage() {
  const [activeTab, setActiveTab] = useState('All')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const status =
        activeTab === 'All' ? '' : activeTab.toUpperCase()
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        ...(status && { status }),
      })
      const res = await fetch(`/api/vendor/orders?${params}`)
      const data: OrdersResponse = await res.json()
      if (data.success) {
        setOrders(data.orders)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } else {
        setError('Failed to load orders')
      }
    } catch {
      setError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [activeTab, page])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    setPage(1)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-widest">
          Vendor Portal
        </p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">My Orders</h1>
        <p className="text-sm text-gray-500 mt-1">
          {total} order{total !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Tab Filter */}
      <div className="flex gap-1 p-1 rounded-xl bg-white border border-gray-200 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-600'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Orders */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white py-20 text-center">
          <ShoppingCart className="h-10 w-10 text-gray-700 mx-auto mb-3" />
          <p className="text-gray-500">No orders found</p>
          <p className="text-gray-600 text-sm mt-1">
            {activeTab !== 'All'
              ? `No ${activeTab.toLowerCase()} orders`
              : 'Orders will appear here once placed'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order._id}
              className="rounded-xl border border-gray-200 bg-white p-4 hover:bg-gray-50 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Package className="h-4 w-4 text-violet-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {order.orderNumber}
                      </p>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          statusColors[order.status] ||
                          'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(order.createdAt)} &middot;{' '}
                      {order.items?.length || 0} item
                      {(order.items?.length || 0) !== 1 ? 's' : ''}
                    </p>
                    {order.items?.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1 truncate max-w-xs">
                        {order.items
                          .slice(0, 2)
                          .map((i) => i.name)
                          .join(', ')}
                        {order.items.length > 2 &&
                          ` +${order.items.length - 2} more`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Total</p>
                  </div>
                  <Link
                    href={`/vendor/orders/${order._id}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    Details
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

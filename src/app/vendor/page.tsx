'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ShoppingCart,
  Clock,
  DollarSign,
  AlertCircle,
  Plus,
  BarChart3,
  TrendingUp,
  FileText,
  Loader2,
} from 'lucide-react'

interface DashboardData {
  vendor: {
    companyName: string
    vendorId: string
  }
  stats: {
    totalOrders: number
    pendingOrders: number
    totalRevenue: number
    outstanding: number
  }
  orders: Array<{
    _id: string
    orderNumber: string
    createdAt: string
    totalAmount: number
    status: string
    items: Array<{ name: string }>
  }>
  invoices: Array<{
    _id: string
    invoiceNumber: string
    totalAmount: number
    dueDate: string
    status: string
  }>
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  PROCESSING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-red-500/10 text-red-400 border-red-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  OVERDUE: 'bg-red-500/10 text-red-400 border-red-500/20',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
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

export default function VendorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/vendor/dashboard')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setData(res.data)
        else setError(res.message || 'Failed to load dashboard')
      })
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats
  const orders = data?.orders || []
  const invoices = data?.invoices || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            Vendor Portal
          </p>
          <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
            Welcome back, {data?.vendor?.companyName || 'Vendor'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Vendor ID:{' '}
            <span className="font-mono text-gray-500">
              {data?.vendor?.vendorId}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/vendor/statement"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all"
          >
            <BarChart3 className="h-4 w-4" />
            Statement
          </Link>
          <Link
            href="/vendor/products/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-all"
          >
            <Plus className="h-4 w-4" />
            New Product
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Total Orders</p>
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ShoppingCart className="h-3.5 w-3.5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.totalOrders ?? 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">All time</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Pending Orders</p>
            <div className="h-7 w-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
              <Clock className="h-3.5 w-3.5 text-yellow-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.pendingOrders ?? 0}
          </p>
          <p className="text-xs text-gray-600 mt-1">Awaiting action</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Total Revenue</p>
            <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.totalRevenue ?? 0)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Lifetime earnings</p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-gray-500">Outstanding</p>
            <div className="h-7 w-7 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.outstanding ?? 0)}
          </p>
          <p className="text-xs text-gray-600 mt-1">Unpaid balance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Recent Orders</h2>
            <Link
              href="/vendor/orders"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              View all →
            </Link>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">
              No orders yet
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-gray-600">
                    Order #
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] uppercase tracking-wider text-gray-600">
                    Date
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-gray-600">
                    Amount
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-sm font-mono text-gray-600">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(order.totalAmount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          statusColors[order.status] ||
                          'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Invoices */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">
              Pending Invoices
            </h2>
            <Link
              href="/vendor/invoices"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
            >
              View all →
            </Link>
          </div>
          {invoices.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-600 text-sm">
              No pending invoices
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {invoices.map((invoice) => (
                <div
                  key={invoice._id}
                  className="px-5 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-7 w-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-3.5 w-3.5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-xs font-mono text-gray-600">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-0.5">
                          Due {formatDate(invoice.dueDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                      <span
                        className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-medium border ${
                          statusColors[invoice.status] ||
                          'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link
            href="/vendor/products"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-violet-500/30 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
              <Plus className="h-4 w-4 text-violet-400" />
            </div>
            <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors text-center">
              Submit New Product
            </span>
          </Link>
          <Link
            href="/vendor/statement"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-blue-500/30 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <BarChart3 className="h-4 w-4 text-blue-400" />
            </div>
            <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors text-center">
              View Statement
            </span>
          </Link>
          <Link
            href="/vendor/orders"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-emerald-500/30 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
            </div>
            <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors text-center">
              Track Orders
            </span>
          </Link>
          <Link
            href="/vendor/invoices"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:bg-gray-50 hover:border-yellow-500/30 transition-all group"
          >
            <div className="h-9 w-9 rounded-xl bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
              <FileText className="h-4 w-4 text-yellow-400" />
            </div>
            <span className="text-xs text-gray-500 group-hover:text-gray-900 transition-colors text-center">
              View Invoices
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

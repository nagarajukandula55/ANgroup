'use client'

import { useState } from 'react'
import Layout from '@/components/layout'
import {
  Bell, BellOff, Check, CheckCheck, Trash2,
  Package, AlertTriangle, FileText, Users,
  ShoppingCart, DollarSign, Settings, Info, X
} from 'lucide-react'

type NotificationType = 'info' | 'success' | 'warning' | 'error'
type NotificationCategory = 'finance' | 'inventory' | 'orders' | 'hr' | 'documents' | 'system'

interface Notification {
  id: string
  title: string
  message: string
  type: NotificationType
  category: NotificationCategory
  isRead: boolean
  timestamp: Date
  action?: { label: string; href: string }
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    title: 'Revenue Target Exceeded',
    message: 'Q4 revenue target exceeded by 12%. Total revenue: ₹24.8L vs target ₹22.1L.',
    type: 'success',
    category: 'finance',
    isRead: false,
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    action: { label: 'View Report', href: '/erp/finance' },
  },
  {
    id: '2',
    title: 'Low Stock Alert',
    message: '3 inventory items are below minimum threshold. Immediate restocking required.',
    type: 'warning',
    category: 'inventory',
    isRead: false,
    timestamp: new Date(Date.now() - 22 * 60 * 1000),
    action: { label: 'View Inventory', href: '/erp/inventory' },
  },
  {
    id: '3',
    title: 'New Purchase Order',
    message: 'PO-0047 from Vendor ABC Corp received for ₹1.2L. Awaiting approval.',
    type: 'info',
    category: 'orders',
    isRead: false,
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    action: { label: 'Review Order', href: '/erp/purchase' },
  },
  {
    id: '4',
    title: 'Agreement Signed',
    message: 'Vendor supply agreement AGR-0012 has been fully signed by both parties.',
    type: 'success',
    category: 'documents',
    isRead: true,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    action: { label: 'View Agreement', href: '/documents/agreements' },
  },
  {
    id: '5',
    title: 'New Employee Onboarded',
    message: 'Priya Sharma has completed onboarding for the Operations team.',
    type: 'info',
    category: 'hr',
    isRead: true,
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    action: { label: 'View Profile', href: '/erp/employees' },
  },
  {
    id: '6',
    title: 'Payment Overdue',
    message: 'Invoice INV-0034 is 7 days overdue. Client: Metro Traders. Amount: ₹45,000.',
    type: 'error',
    category: 'finance',
    isRead: false,
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    action: { label: 'View Invoice', href: '/erp/finance' },
  },
  {
    id: '7',
    title: 'System Maintenance',
    message: 'Scheduled maintenance on Sunday 2:00 AM - 4:00 AM IST. Minimal disruption expected.',
    type: 'info',
    category: 'system',
    isRead: true,
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: '8',
    title: 'CRM Lead Converted',
    message: 'Lead "Sunrise Hotels" converted to customer. Potential value: ₹8.5L/year.',
    type: 'success',
    category: 'orders',
    isRead: true,
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    action: { label: 'View CRM', href: '/erp/crm' },
  },
  {
    id: '9',
    title: 'Document Expiring Soon',
    message: 'Agreement AGR-0008 with Logistics Partner expires in 14 days. Renewal needed.',
    type: 'warning',
    category: 'documents',
    isRead: false,
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    action: { label: 'View Agreement', href: '/documents/agreements' },
  },
]

const CATEGORY_ICONS: Record<NotificationCategory, React.ReactNode> = {
  finance: <DollarSign size={14} />,
  inventory: <Package size={14} />,
  orders: <ShoppingCart size={14} />,
  hr: <Users size={14} />,
  documents: <FileText size={14} />,
  system: <Settings size={14} />,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  success: 'text-emerald-700 bg-emerald-500/10 border-emerald-500/20',
  warning: 'text-amber-700 bg-amber-500/10 border-amber-500/20',
  error: 'text-red-700 bg-red-500/10 border-red-500/20',
  info: 'text-blue-700 bg-blue-500/10 border-blue-500/20',
}

const TYPE_DOT: Record<NotificationType, string> = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS)
  const [filter, setFilter] = useState<'all' | 'unread' | NotificationCategory>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const unreadCount = notifications.filter(n => !n.isRead).length

  const filtered = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.isRead
    return n.category === filter
  })

  function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
  }

  function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
  }

  function deleteNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id))
    setSelectedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  function deleteSelected() {
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)))
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const categories: { key: NotificationCategory; label: string }[] = [
    { key: 'finance', label: 'Finance' },
    { key: 'inventory', label: 'Inventory' },
    { key: 'orders', label: 'Orders' },
    { key: 'hr', label: 'HR' },
    { key: 'documents', label: 'Documents' },
    { key: 'system', label: 'System' },
  ]

  return (
    <Layout>
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-3">
              <Bell size={24} />
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-medium bg-gray-900 text-white rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Stay updated on all platform activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                onClick={deleteSelected}
                className="flex items-center gap-2 px-3 py-2 text-sm text-red-700 border border-red-500/20 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition"
              >
                <Trash2 size={14} />
                Delete ({selectedIds.size})
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 border border-gray-200 bg-white rounded-xl hover:bg-gray-100 transition"
              >
                <CheckCheck size={14} />
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: notifications.length, icon: <Bell size={15} /> },
            { label: 'Unread', value: unreadCount, icon: <BellOff size={15} /> },
            { label: 'Warnings', value: notifications.filter(n => n.type === 'warning').length, icon: <AlertTriangle size={15} /> },
            { label: 'Errors', value: notifications.filter(n => n.type === 'error').length, icon: <Info size={15} /> },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-2">
                {stat.icon}
                <span className="text-xs">{stat.label}</span>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-lg transition capitalize ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}
            >
              {f}
            </button>
          ))}
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setFilter(cat.key)}
              className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition ${filter === cat.key ? 'bg-gray-900 text-white' : 'text-gray-500 border border-gray-200 hover:border-gray-400'}`}
            >
              {CATEGORY_ICONS[cat.key]}
              {cat.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">
              <Bell size={40} className="mx-auto mb-3 opacity-30" />
              <p>No notifications</p>
            </div>
          )}
          {filtered.map(notification => (
            <div
              key={notification.id}
              className={`relative rounded-xl border transition-all ${
                notification.isRead
                  ? 'border-gray-200 bg-white'
                  : 'border-white/[0.12] bg-white'
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(notification.id)}
                  className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition ${
                    selectedIds.has(notification.id)
                      ? 'bg-white border-white'
                      : 'border-gray-300 hover:border-white/40'
                  }`}
                >
                  {selectedIds.has(notification.id) && <Check size={10} className="text-black" />}
                </button>

                {/* Type dot */}
                <div className="mt-2 flex-shrink-0">
                  <div className={`w-2 h-2 rounded-full ${TYPE_DOT[notification.type]} ${notification.isRead ? 'opacity-30' : ''}`} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-md border flex items-center gap-1 ${TYPE_COLORS[notification.type]}`}>
                        {CATEGORY_ICONS[notification.category]}
                        {notification.category}
                      </span>
                      {!notification.isRead && (
                        <span className="text-xs text-blue-700 font-medium">New</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">
                      {timeAgo(notification.timestamp)}
                    </span>
                  </div>

                  <h3 className={`mt-1.5 text-sm font-medium ${notification.isRead ? 'text-gray-500' : 'text-gray-900'}`}>
                    {notification.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                    {notification.message}
                  </p>

                  {notification.action && (
                    <a
                      href={notification.action.href}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 hover:underline underline-offset-2 transition"
                    >
                      {notification.action.label} →
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!notification.isRead && (
                    <button
                      onClick={() => markRead(notification.id)}
                      className="p-1.5 text-gray-600 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                      title="Mark as read"
                    >
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-1.5 text-gray-600 hover:text-red-700 hover:bg-red-500/10 rounded-lg transition"
                    title="Delete"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Preferences hint */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Notification preferences</p>
            <p className="text-xs text-gray-600 mt-0.5">Control which alerts you receive and how</p>
          </div>
          <a href="/settings" className="text-xs text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-100 transition">
            Configure →
          </a>
        </div>
      </div>
    </Layout>
  )
}

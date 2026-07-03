'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Check, CheckCheck, Trash2, Loader2, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

interface Notification {
  _id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  createdAt: string
  link?: string
}

const TYPE_CONFIG = {
  info:    { icon: Info,          color: 'text-blue-500',  bg: 'bg-blue-50',  badge: 'bg-blue-100 text-blue-700' },
  success: { icon: CheckCircle,   color: 'text-green-500', bg: 'bg-green-50', badge: 'bg-green-100 text-green-700' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500',bg: 'bg-yellow-50',badge: 'bg-yellow-100 text-yellow-700' },
  error:   { icon: XCircle,       color: 'text-red-500',   bg: 'bg-red-50',   badge: 'bg-red-100 text-red-700' },
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<'all' | 'unread'>('all')
  const [businessId, setBusinessId]       = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const bId = d.user?.activeBusinessId
      setBusinessId(bId)
      if (bId) loadNotifications(bId)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function loadNotifications(bId: string) {
    setLoading(true)
    try {
      const r = await fetch(`/api/notifications?businessId=${bId}`)
      const d = await r.json()
      setNotifications(d.notifications ?? d.data ?? [])
    } catch { } finally { setLoading(false) }
  }

  async function markRead(id: string) {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(n => n.map(x => x._id === id ? { ...x, isRead: true } : x))
    } catch { }
  }

  async function markAllRead() {
    if (!businessId) return
    try {
      await fetch(`/api/notifications/read-all`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) })
      setNotifications(n => n.map(x => ({ ...x, isRead: true })))
    } catch { }
  }

  async function deleteNotification(id: string) {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      setNotifications(n => n.filter(x => x._id !== id))
    } catch { }
  }

  const visible   = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications
  const unreadCnt = notifications.filter(n => !n.isRead).length

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={15} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900">Notifications</h1>
              {unreadCnt > 0 && (
                <span className="bg-gray-900 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center">
                  {unreadCnt}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">Stay updated on important activities</p>
          </div>
          {unreadCnt > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white rounded-xl px-3 py-2 shadow-sm hover:bg-gray-50">
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {(['all', 'unread'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'all' ? 'All' : `Unread ${unreadCnt > 0 ? `(${unreadCnt})` : ''}`}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <div className="py-16 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-400 font-medium">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-gray-300 mt-1">You're all caught up!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {visible.map(n => {
                const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                const Icon = cfg.icon
                return (
                  <div key={n._id}
                    className={`flex gap-4 px-5 py-4 hover:bg-gray-50 transition group ${!n.isRead ? 'bg-blue-50/30' : ''}`}>
                    <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon size={15} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${n.isRead ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.message}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400">{timeAgo(n.createdAt)}</span>
                            {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-blue-500 inline-block" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          {!n.isRead && (
                            <button onClick={() => markRead(n._id)} title="Mark as read"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50">
                              <Check size={13} />
                            </button>
                          )}
                          <button onClick={() => deleteNotification(n._id)} title="Delete"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

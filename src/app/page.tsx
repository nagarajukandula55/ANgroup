'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import Link from 'next/link'
import {
  ArrowUpRight, TrendingUp, DollarSign, Users, Building2,
  Package, ShoppingCart, AlertCircle, CheckCircle2, Clock, RefreshCw
} from 'lucide-react'

export default function Dashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const now = new Date()

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()),
    ]).then(([dash, me]) => {
      setData(dash)
      if (me.success) setUser(me.user)
    }).finally(() => setLoading(false))
  }, [])

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white" />
            <p className="mt-4 text-sm text-zinc-500">Loading AN Group Platform…</p>
          </div>
        </div>
      </Layout>
    )
  }

  const stats = [
    { label: 'Total Revenue', value: data?.revenue || '₹48.6L', icon: <DollarSign size={16} />, change: '+18%', positive: true },
    { label: 'Employees', value: data?.employees || 112, icon: <Users size={16} />, change: '+4', positive: true },
    { label: 'Active Businesses', value: data?.companies || 6, icon: <Building2 size={16} />, change: 'Active', positive: true },
    { label: 'AI Automation', value: data?.automation || '84%', icon: <TrendingUp size={16} />, change: '+6%', positive: true },
  ]

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Welcome header */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">{greeting}</p>
              <h1 className="mt-1 text-2xl font-bold text-white">
                {user?.name || 'Welcome'} <span className="text-zinc-500">↗</span>
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/businesses/create"
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-xs text-zinc-300 hover:bg-white/[0.08] transition-all">
                + New Business
              </Link>
              <button onClick={() => window.location.reload()}
                className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-zinc-400 hover:text-white transition-all">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:bg-white/[0.04] transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400 group-hover:text-white transition-all">
                  {s.icon}
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${s.positive ? 'text-green-400' : 'text-red-400'}`}>
                  <ArrowUpRight size={12} />
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="mt-1 text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Business portfolio */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-600">Portfolio</p>
              <h2 className="mt-1 text-lg font-bold text-white">Business Units</h2>
            </div>
            <Link href="/businesses"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-all">
              View All <ArrowUpRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(data?.businessUnits || []).map((unit: any, i: number) => (
              <div key={i} className="rounded-xl border border-white/[0.06] bg-black/40 p-5 hover:border-white/15 transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[10px] text-green-400">
                    Active
                  </span>
                  <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                    {unit.growth} <ArrowUpRight size={11} />
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white group-hover:text-zinc-100">{unit.name}</h3>
                <p className="mt-3 text-2xl font-bold text-white">{unit.revenue}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent activity */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { icon: <CheckCircle2 size={14} className="text-green-400" />, text: 'Purchase Order #PO-2024-089 approved', time: '5m ago' },
                { icon: <Clock size={14} className="text-yellow-400" />, text: 'Invoice INV-001 pending payment', time: '12m ago' },
                { icon: <AlertCircle size={14} className="text-red-400" />, text: 'Low stock alert: Raw Material A', time: '1h ago' },
                { icon: <CheckCircle2 size={14} className="text-green-400" />, text: 'New vendor agreement signed', time: '2h ago' },
                { icon: <Users size={14} className="text-blue-400" />, text: '3 new staff accounts created', time: '3h ago' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 truncate">{item.text}</p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New Invoice', href: '/finance', icon: <DollarSign size={14} /> },
                { label: 'Purchase Order', href: '/erp/purchase', icon: <ShoppingCart size={14} /> },
                { label: 'Stock Check', href: '/erp/inventory', icon: <Package size={14} /> },
                { label: 'Add Employee', href: '/employees', icon: <Users size={14} /> },
                { label: 'Send Message', href: '/chat', icon: <ArrowUpRight size={14} /> },
                { label: 'View Reports', href: '/analytics', icon: <TrendingUp size={14} /> },
              ].map((action, i) => (
                <Link key={i} href={action.href}
                  className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 hover:bg-white/[0.06] hover:border-white/15 transition-all group">
                  <span className="text-zinc-500 group-hover:text-white transition-colors">{action.icon}</span>
                  <span className="text-xs text-zinc-400 group-hover:text-white transition-colors font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}

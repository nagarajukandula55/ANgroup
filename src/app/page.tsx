'use client'
import {
  BrainCircuit,
  LayoutDashboard,
  BarChart3,
  Wallet,
  Users,
  Boxes,
  Truck,
  Bell,
  Settings,
  ArrowUpRight,
} from 'lucide-react'

const sidebarItems = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    active: true,
  },
  {
    icon: BrainCircuit,
    label: 'AI Workspace',
  },
  {
    icon: BarChart3,
    label: 'Analytics',
  },
  {
    icon: Wallet,
    label: 'Finance',
  },
  {
    icon: Users,
    label: 'Employees',
  },
  {
    icon: Boxes,
    label: 'Inventory',
  },
  {
    icon: Truck,
    label: 'Logistics',
  },
  {
    icon: Bell,
    label: 'Notifications',
  },
  {
    icon: Settings,
    label: 'Settings',
  },
]

const stats = [
  {
    title: 'Total Revenue',
    value: '₹48.6L',
    growth: '+18%',
  },
  {
    title: 'Operational Efficiency',
    value: '94%',
    growth: '+9%',
  },
  {
    title: 'AI Insights',
    value: '28',
    growth: '+22%',
  },
  {
    title: 'Pending Workflows',
    value: '142',
    growth: '+5%',
  },
]

const businessUnits = [
  {
    name: 'ShopNative Ecommerce',
    revenue: '₹18.4L',
    growth: '+18%',
  },
  {
    name: 'Repair Operations',
    revenue: '₹11.2L',
    growth: '+9%',
  },
  {
    name: 'Logistics Network',
    revenue: '₹7.8L',
    growth: '+12%',
  },
  {
    name: 'Warehouse Division',
    revenue: '₹5.1L',
    growth: '+5%',
  },
]

export default function ANGroupDashboard() {
  return (
    <div className="flex min-h-screen bg-[#07111f] text-white overflow-hidden">
      <aside className="hidden lg:flex w-[300px] border-r border-white/10 bg-[#0b1728] flex-col justify-between p-6">
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-black shadow-2xl">
              AN
            </div>

            <div>
              <h1 className="text-3xl font-black">AN Group</h1>
              <p className="text-slate-400 text-sm">
                Enterprise Operating System
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {sidebarItems.map((item, index) => {
              const Icon = item.icon

              return (
                <button
                  key={index}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                    item.active
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl'
                      : 'hover:bg-white/5 text-slate-300'
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[32px] border border-cyan-500/10 bg-gradient-to-b from-cyan-500/10 to-blue-700/10 p-6 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-widest text-cyan-300">
            AI Assistant
          </p>

          <h3 className="mt-4 text-3xl font-black leading-snug">
            Enterprise Intelligence Engine
          </h3>

          <p className="mt-5 text-sm leading-relaxed text-slate-300">
            Generate financial reports, analyze operations, predict actual inventory,
            automate workflows, and control all businesses from one platform.
          </p>

          <button className="mt-7 w-full rounded-2xl bg-white py-4 font-semibold text-black transition-all hover:scale-[1.02]">
            Launch AI Workspace
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.15),transparent_30%),linear-gradient(to_bottom,#07111f,#091221)]">
        <section className="relative overflow-hidden rounded-[40px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col xl:flex-row justify-between gap-10">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
                AN GROUP CENTRAL INTELLIGENCE
              </p>

              <h1 className="mt-6 text-6xl font-black leading-[1.05]">
                Enterprise Operating System
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-slate-300 max-w-2xl">
                AI-powered ecosystem for ecommerce, logistics, repair
                operations, finance, HR, procurement, analytics, and executive
                intelligence.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-semibold shadow-2xl transition-all hover:scale-[1.02]">
                  Generate AI Report
                </button>

                <button className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-semibold hover:bg-white/10 transition-all">
                  Open Analytics
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5 min-w-[320px]">
              {[
                ['Companies', '06'],
                ['Employees', '110+'],
                ['AI Agents', '12'],
                ['Automation', '84%'],
              ].map((item, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-white/10 bg-black/20 p-6 backdrop-blur-xl"
                >
                  <p className="text-sm text-slate-400">{item[0]}</p>
                  <h3 className="mt-4 text-5xl font-black">{item[1]}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={index}
              className="rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-400">{item.title}</p>

                <span className="rounded-full border border-green-400/20 bg-green-500/10 px-3 py-1 text-sm text-green-400">
                  {item.growth}
                </span>
              </div>

              <h3 className="mt-6 text-5xl font-black">{item.value}</h3>

              <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
              </div>
            </div>
          ))}
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-[36px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div>
                <p className="text-sm uppercase tracking-widest text-cyan-300">
                  Business Ecosystem
                </p>

                <h2 className="mt-2 text-4xl font-black">
                  Multi-Business Network
                </h2>
              </div>

              <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold shadow-xl">
                Export Reports
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {businessUnits.map((item, index) => (
                <div
                  key={index}
                  className="rounded-3xl border border-white/10 bg-[#0d1728] p-6 hover:-translate-y-1 transition-all duration-300"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                      Active
                    </span>

                    <span className="text-green-400 font-semibold flex items-center gap-1">
                      {item.growth}
                      <ArrowUpRight size={16} />
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-bold leading-snug">
                    {item.name}
                  </h3>

                  <div className="mt-8">
                    <p className="text-sm text-slate-400">Revenue</p>
                    <h4 className="mt-2 text-5xl font-black">
                      {item.revenue}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[36px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-300">AI STATUS</p>
                  <h3 className="mt-2 text-4xl font-black">
                    ACTIVE
                  </h3>
                </div>

                <div className="h-5 w-5 rounded-full bg-cyan-400 animate-pulse" />
              </div>

              <div className="mt-8 space-y-4">
                {[
                  'Finance AI',
                  'Forecast Engine',
                  'Workflow AI',
                  'Executive Insights',
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-2xl border border-white/5 bg-black/20 px-4 py-4"
                  >
                    <span>{item}</span>

                    <span className="text-sm font-semibold text-cyan-300">
                      Running
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[36px] border border-white/10 bg-gradient-to-b from-cyan-500/10 to-blue-700/10 p-7">
              <p className="text-sm uppercase tracking-widest text-cyan-300">
                Executive Summary
              </p>

              <h3 className="mt-4 text-3xl font-black leading-snug">
                Revenue growth remains strong across all divisions.
              </h3>

              <p className="mt-5 leading-relaxed text-slate-300">
                AI forecasts indicate operational efficiency improvement of 14%
                in the upcoming quarter.
              </p>

              <button className="mt-8 w-full rounded-2xl bg-white py-4 font-semibold text-black transition-all hover:scale-[1.02]">
                Open AI Analysis
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

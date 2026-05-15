'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { ArrowUpRight } from 'lucide-react'

export default function HomePage() {
  const [dashboard, setDashboard] = useState<any>(null)

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch('/api/dashboard')
      const data = await response.json()
      setDashboard(data)
    }

    loadDashboard()
  }, [])

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <h2 className="mt-8 text-2xl font-semibold tracking-wide">
            Initializing AN Group OS
          </h2>
        </div>
      </div>
    )
  }

  const stats = [
    { title: 'Revenue', value: dashboard.revenue },
    { title: 'Employees', value: dashboard.employees },
    { title: 'AI Agents', value: dashboard.aiAgents },
    { title: 'Automation', value: dashboard.automation },
  ]

  return (
    <Layout>
      <div className="space-y-8 px-4 py-6">

        <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.03] p-12 backdrop-blur-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10" />

          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.45em] text-cyan-300">
              AN GROUP CENTRAL INTELLIGENCE
            </p>

            <h1 className="mt-6 text-7xl font-semibold tracking-tight">
              Enterprise
              <span className="block text-cyan-300">
                Command Center
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
              Unified control layer powering ecommerce, finance,
              logistics, AI operations, automation and business intelligence.
            </p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={index}
              className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/30"
            >
              <p className="text-sm text-slate-400">{item.title}</p>

              <h3 className="mt-4 text-5xl font-semibold tracking-tight">
                {item.value}
              </h3>
            </div>
          ))}
        </section>

        <section className="rounded-[36px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                BUSINESS MATRIX
              </p>

              <h2 className="mt-3 text-4xl font-semibold">
                Operational Ecosystem
              </h2>
            </div>

            <button className="rounded-2xl bg-white/10 px-6 py-3 text-sm font-medium backdrop-blur-xl transition hover:bg-cyan-500/20">
              Export Reports
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {dashboard.businessUnits.map((item: any, index: number) => (
              <div
                key={index}
                className="rounded-[28px] border border-white/10 bg-black/20 p-7 transition-all hover:border-cyan-400/30"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                    Active
                  </span>

                  <span className="flex items-center gap-1 text-green-400">
                    {item.growth}
                    <ArrowUpRight size={16} />
                  </span>
                </div>

                <h3 className="mt-6 text-2xl font-medium">
                  {item.name}
                </h3>

                <h4 className="mt-8 text-5xl font-semibold tracking-tight">
                  {item.revenue}
                </h4>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}

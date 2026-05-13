'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/layout'
import { ArrowUpRight } from 'lucide-react'

export default function HomePage() {
  const [dashboard, setDashboard] = useState<any>(null)

  useEffect(() => {
    async function loadDashboard() {
      try {
        const response = await fetch('/api/dashboard')

        const data = await response.json()

        setDashboard(data)
      } catch (error) {
        console.error(error)
      }
    }

    loadDashboard()
  }, [])

  if (!dashboard) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07111f] text-white">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />

          <h2 className="mt-8 text-3xl font-black">
            Loading AN Group OS...
          </h2>
        </div>
      </div>
    )
  }

  const stats = [
    {
      title: 'Revenue',
      value: dashboard.revenue,
    },
    {
      title: 'Employees',
      value: dashboard.employees,
    },
    {
      title: 'AI Agents',
      value: dashboard.aiAgents,
    },
    {
      title: 'Automation',
      value: dashboard.automation,
    },
  ]

  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10 backdrop-blur-xl">
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            AN GROUP CENTRAL INTELLIGENCE
          </p>

          <h1 className="mt-6 text-6xl font-black leading-tight">
            Enterprise Operating System
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
            Unified operating platform for ecommerce, logistics,
            finance, analytics, inventory, HR, and AI-powered
            enterprise intelligence.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={index}
              className="rounded-[32px] border border-white/10 bg-white/5 p-6"
            >
              <p className="text-slate-400">
                {item.title}
              </p>

              <h3 className="mt-5 text-5xl font-black">
                {item.value}
              </h3>
            </div>
          ))}
        </section>

        <section className="rounded-[36px] border border-white/10 bg-white/5 p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-widest text-cyan-300">
                Business Ecosystem
              </p>

              <h2 className="mt-2 text-4xl font-black">
                Multi-Business Network
              </h2>
            </div>

            <button className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold">
              Export Reports
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {dashboard.businessUnits.map(
              (item: any, index: number) => (
                <div
                  key={index}
                  className="rounded-3xl border border-white/10 bg-[#0d1728] p-6"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                      Active
                    </span>

                    <span className="flex items-center gap-1 text-green-400">
                      {item.growth}

                      <ArrowUpRight size={16} />
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-bold">
                    {item.name}
                  </h3>

                  <h4 className="mt-8 text-5xl font-black">
                    {item.revenue}
                  </h4>
                </div>
              )
            )}
          </div>
        </section>
      </div>
    </Layout>
  )
}

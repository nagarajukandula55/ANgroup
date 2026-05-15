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
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <h2 className="mt-8 text-2xl font-medium">
            Loading AN Group
          </h2>
        </div>
      </div>
    )
  }

  const stats = [
    { title: 'Revenue', value: dashboard.revenue },
    { title: 'Employees', value: dashboard.employees },
    { title: 'Automation', value: dashboard.automation },
    { title: 'Growth', value: dashboard.aiAgents },
  ]

  return (
    <Layout>
      <div className="space-y-8">

        <section className="rounded-[42px] border border-white/10 bg-white/[0.03] p-8 md:p-12 backdrop-blur-3xl">
          <p className="text-xs uppercase tracking-[0.45em] text-zinc-500">
            AN
          </p>

          <h1 className="mt-6 text-5xl md:text-7xl font-semibold tracking-tight">
            Precision.
            <span className="block text-zinc-400">
              Intelligence.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
            A luxury executive platform built to unify operations,
            analytics, intelligence, and enterprise performance.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <div
              key={index}
              className="rounded-[30px] border border-white/10 bg-white/[0.03] p-7 backdrop-blur-2xl transition-all hover:bg-white/[0.05]"
            >
              <p className="text-sm text-zinc-500">
                {item.title}
              </p>

              <h3 className="mt-4 text-5xl font-semibold tracking-tight">
                {item.value}
              </h3>
            </div>
          ))}
        </section>

        <section className="rounded-[42px] border border-white/10 bg-white/[0.03] p-8 backdrop-blur-3xl">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
                BUSINESS
              </p>

              <h2 className="mt-3 text-4xl font-semibold">
                Portfolio
              </h2>
            </div>

            <button className="rounded-2xl border border-white/10 bg-white/[0.05] px-6 py-3 text-sm hover:bg-white/[0.08]">
              Reports
            </button>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {dashboard.businessUnits.map((item: any, index: number) => (
              <div
                key={index}
                className="rounded-[30px] border border-white/10 bg-black/20 p-7"
              >
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/[0.06] px-3 py-1 text-xs text-zinc-300">
                    Active
                  </span>

                  <span className="flex items-center gap-1 text-white">
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

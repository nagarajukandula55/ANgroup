'use client'

import Layout from '@/components/layout'
import {
  BarChart3,
  TrendingUp,
  Activity,
  DollarSign,
} from 'lucide-react'

const analyticsCards = [
  {
    title: 'Revenue Growth',
    value: '+18%',
    icon: TrendingUp,
  },
  {
    title: 'Operational Health',
    value: '94%',
    icon: Activity,
  },
  {
    title: 'Monthly Revenue',
    value: '₹48.6L',
    icon: DollarSign,
  },
]

export default function AnalyticsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-cyan-500/20 p-5">
              <BarChart3 size={42} />
            </div>

            <div>
              <p className="uppercase tracking-[0.3em] text-cyan-300 text-sm">
                ENTERPRISE ANALYTICS
              </p>

              <h1 className="mt-3 text-6xl font-black">
                Analytics Hub
              </h1>
            </div>
          </div>

          <p className="mt-8 text-lg text-slate-300 max-w-3xl">
            Deep operational analytics for all AN Group businesses,
            logistics, ecommerce, finance, inventory, and workforce.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {analyticsCards.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={index}
                className="rounded-[32px] border border-white/10 bg-white/5 p-8"
              >
                <Icon size={36} className="text-cyan-300" />

                <h2 className="mt-6 text-2xl font-bold">
                  {item.title}
                </h2>

                <h3 className="mt-5 text-5xl font-black">
                  {item.value}
                </h3>
              </div>
            )
          })}
        </section>
      </div>
    </Layout>
  )
}

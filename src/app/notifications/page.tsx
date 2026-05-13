'use client'

import Layout from '@/components/layout'
import { Bell } from 'lucide-react'

const notifications = [
  'Revenue target exceeded by 12%',
  'New ecommerce orders received',
  'AI generated financial report',
  'Inventory threshold warning',
]

export default function NotificationsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <div className="flex items-center gap-4">
            <Bell size={42} className="text-cyan-300" />

            <div>
              <p className="uppercase tracking-[0.35em] text-cyan-300 text-sm">
                ALERT CENTER
              </p>

              <h1 className="mt-4 text-6xl font-black">
                Notifications
              </h1>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          {notifications.map((item, index) => (
            <div
              key={index}
              className="rounded-3xl border border-white/10 bg-white/5 p-6"
            >
              <p className="text-lg text-slate-200">
                {item}
              </p>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  )
}

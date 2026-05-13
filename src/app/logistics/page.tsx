'use client'

import Layout from '@/components/layout'
import {
  Truck,
  MapPin,
  Package,
  Clock,
} from 'lucide-react'

const logistics = [
  {
    title: 'Active Shipments',
    value: '182',
    icon: Truck,
  },
  {
    title: 'Warehouses',
    value: '06',
    icon: Package,
  },
  {
    title: 'Delivery Zones',
    value: '42',
    icon: MapPin,
  },
  {
    title: 'Avg Delivery',
    value: '1.8d',
    icon: Clock,
  },
]

export default function LogisticsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <p className="uppercase tracking-[0.35em] text-cyan-300 text-sm">
            SUPPLY CHAIN CONTROL
          </p>

          <h1 className="mt-5 text-6xl font-black">
            Logistics Network
          </h1>

          <p className="mt-6 text-lg max-w-3xl text-slate-300">
            Manage logistics, warehouse movement, delivery systems,
            regional operations, and shipment tracking.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {logistics.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={index}
                className="rounded-[32px] border border-white/10 bg-white/5 p-8"
              >
                <Icon size={36} className="text-cyan-300" />

                <h2 className="mt-5 text-xl font-bold">
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

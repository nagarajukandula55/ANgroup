'use client'

import { useEffect, useState } from 'react'

import Layout from '@/components/layout'

import Link from 'next/link'

interface Business {
  _id: string
  name: string
  slug: string
  type: string
  active: boolean
}

export default function BusinessesPage() {
  const [businesses, setBusinesses] = useState<Business[]>([])

  async function loadBusinesses() {
    const response = await fetch('/api/businesses/all')

    const data = await response.json()

    setBusinesses(data.businesses || [])
  }

  useEffect(() => {
    loadBusinesses()
  }, [])

  return (
    <Layout>
      <div className="space-y-8">
        <section className="flex items-center justify-between rounded-[36px] border border-white/10 bg-white/5 p-10">
          <div>
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
              ENTERPRISE MANAGEMENT
            </p>

            <h1 className="mt-5 text-6xl font-black">
              Businesses
            </h1>

            <p className="mt-5 text-slate-300">
              Manage all AN Group businesses.
            </p>
          </div>

          <Link
            href="/businesses/create"
            className="rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 font-semibold"
          >
            Create Business
          </Link>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {businesses.map((business) => (
            <div
              key={business._id}
              className="rounded-[32px] border border-white/10 bg-white/5 p-8"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                  {business.type}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-sm ${
                    business.active
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {business.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <h2 className="mt-6 text-3xl font-black">
                {business.name}
              </h2>

              <p className="mt-3 text-slate-400">
                {business.slug}
              </p>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  )
}

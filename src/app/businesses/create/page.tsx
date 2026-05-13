'use client'

import { useState } from 'react'

import Layout from '@/components/layout'

import { useRouter } from 'next/navigation'

export default function CreateBusinessPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    name: '',
    slug: '',
    type: '',
    description: '',
  })

  async function createBusiness() {
    const response = await fetch(
      '/api/businesses/create',
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
        },

        body: JSON.stringify(form),
      }
    )

    const data = await response.json()

    if (data.success) {
      router.push('/businesses')
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="rounded-[36px] border border-white/10 bg-white/5 p-10">
          <h1 className="text-5xl font-black">
            Create Business
          </h1>

          <p className="mt-5 text-slate-300">
            Add new business into AN Group ecosystem.
          </p>
        </section>

        <section className="space-y-5 rounded-[36px] border border-white/10 bg-white/5 p-8">
          <input
            placeholder="Business Name"
            className="w-full rounded-2xl bg-black/20 p-5 outline-none"
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
          />

          <input
            placeholder="Business Slug"
            className="w-full rounded-2xl bg-black/20 p-5 outline-none"
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value,
              })
            }
          />

          <input
            placeholder="Business Type"
            className="w-full rounded-2xl bg-black/20 p-5 outline-none"
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
          />

          <textarea
            placeholder="Business Description"
            className="h-40 w-full rounded-2xl bg-black/20 p-5 outline-none"
            onChange={(e) =>
              setForm({
                ...form,
                description: e.target.value,
              })
            }
          />

          <button
            onClick={createBusiness}
            className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 py-5 font-semibold"
          >
            Create Business
          </button>
        </section>
      </div>
    </Layout>
  )
}

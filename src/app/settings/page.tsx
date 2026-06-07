'use client'

import Layout from '@/components/layout'
import { Settings } from 'lucide-react'

const settings = [
  'User Management',
  'Role Permissions',
  'API Integrations',
  'AI Configuration',
  'Security Controls',
]

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <div className="flex items-center gap-4">
            <Settings size={42} className="text-cyan-300" />

            <div>
              <p className="uppercase tracking-[0.35em] text-cyan-300 text-sm">
                SYSTEM CONFIGURATION
              </p>

              <h1 className="mt-4 text-6xl font-black">
                Settings
              </h1>
            </div>
          </div>

          <p className="mt-6 max-w-3xl text-lg text-slate-300">
            Configure enterprise infrastructure, permissions,
            integrations, AI systems, and operational controls also.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {settings.map((item, index) => (
            <div
              key={index}
              className="rounded-3xl border border-white/10 bg-white/5 p-7"
            >
              <h2 className="text-2xl font-bold">
                {item}
              </h2>

              <button className="mt-6 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold">
                Open
              </button>
            </div>
          ))}
        </section>
      </div>
    </Layout>
  )
}

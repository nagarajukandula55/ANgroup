'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  DollarSign,
  Calendar,
  FolderOpen,
  ArrowRight,
} from 'lucide-react'

interface ModuleCard {
  icon: React.ElementType
  label: string
  description: string
  href?: string
  comingSoon?: boolean
}

const modules: ModuleCard[] = [
  {
    icon: Users,
    label: 'Employees',
    description: 'Manage employee profiles, designations, and employment details.',
    href: '/admin/employees',
    comingSoon: false,
  },
  {
    icon: DollarSign,
    label: 'Payroll',
    description: 'Process monthly salaries, deductions, and payslips.',
    comingSoon: true,
  },
  {
    icon: Calendar,
    label: 'Leave Management',
    description: 'Track leave applications, approvals, and balances.',
    comingSoon: true,
  },
  {
    icon: FolderOpen,
    label: 'Documents',
    description: 'Store and manage employee documents and contracts.',
    comingSoon: true,
  },
]

export default function HRPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-5xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-white/[0.06] bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold">HR Management</h1>
            <p className="text-sm text-zinc-500">Human resources and workforce management</p>
          </div>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {modules.map((mod) => {
            const Icon = mod.icon
            const card = (
              <div
                className={`rounded-2xl border p-6 flex flex-col gap-4 transition group ${
                  mod.comingSoon
                    ? 'border-zinc-800 bg-white/[0.02] opacity-70'
                    : 'border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.07] cursor-pointer'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.08] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-zinc-300" />
                  </div>
                  {mod.comingSoon ? (
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-800 text-zinc-400">
                      Coming Soon
                    </span>
                  ) : (
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium text-white mb-1">{mod.label}</h3>
                  <p className="text-sm text-zinc-500">{mod.description}</p>
                </div>
              </div>
            )

            return mod.href && !mod.comingSoon ? (
              <Link key={mod.label} href={mod.href}>
                {card}
              </Link>
            ) : (
              <div key={mod.label}>{card}</div>
            )
          })}
        </div>

        {/* Quick Link */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.04] p-6">
          <h2 className="font-medium text-white mb-4">Quick Links</h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/employees"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-sm font-medium hover:bg-zinc-100 transition"
            >
              <Users className="w-4 h-4" />
              Go to Employees
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

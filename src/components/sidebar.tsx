'use client'

import Link from 'next/link'

import { usePathname } from 'next/navigation'

import { modules } from '@/config/modules'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-[320px] border-r border-white/10 bg-[#081120] flex-col justify-between p-6">
      <div className="overflow-y-auto">
        <div className="mb-12 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-cyan-400 to-blue-600 text-2xl font-black shadow-2xl">
            AN
          </div>

          <div>
            <h1 className="text-3xl font-black text-white">
              AN Group
            </h1>

            <p className="text-sm text-slate-400">
              Enterprise Operating System
            </p>
          </div>
        </div>

        <div className="space-y-8">
          {modules.map((section, sectionIndex) => (
            <div key={sectionIndex}>
              <p className="mb-4 px-3 text-xs font-semibold tracking-[0.3em] text-slate-500">
                {section.title}
              </p>

              <div className="space-y-2">
                {section.items.map((item, itemIndex) => {
                  const Icon = item.icon

                  const active =
                    pathname === item.href

                  return (
                    <Link
                      key={itemIndex}
                      href={item.href}
                      className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-300 ${
                        active
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-2xl'
                          : 'text-slate-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon size={20} />

                      <span className="font-medium">
                        {item.label}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-[32px] border border-cyan-500/10 bg-gradient-to-b from-cyan-500/10 to-blue-700/10 p-6">
        <p className="text-sm uppercase tracking-widest text-cyan-300">
          Enterprise AI
        </p>

        <h3 className="mt-4 text-3xl font-black text-white">
          Central Intelligence Layer
        </h3>

        <p className="mt-5 text-sm leading-relaxed text-slate-300">
          Unified AI infrastructure for analytics,
          finance, operations, forecasting, and
          enterprise automation.
        </p>

        <button className="mt-7 w-full rounded-2xl bg-white py-4 font-semibold text-black transition-all hover:scale-[1.02]">
          Launch AI
        </button>
      </div>
    </aside>
  )
}

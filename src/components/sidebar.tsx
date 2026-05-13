'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { modules } from '@/config/modules'

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex w-[300px] border-r border-white/10 bg-[#0b1728] flex-col p-6">
      <div>
        <div className="mb-12">
          <div className="h-16 w-16 rounded-[24px] bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-2xl font-black">
            AN
          </div>

          <h1 className="mt-5 text-3xl font-black">
            AN Group
          </h1>

          <p className="text-slate-400 text-sm mt-1">
            Enterprise Operating System
          </p>
        </div>

        <div className="space-y-3">
          {modules.map((item, index) => {
            const Icon = item.icon

            const active = pathname === item.href

            return (
              <Link
                href={item.href}
                key={index}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                  active
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl'
                    : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <Icon size={20} />

                <span className="font-medium">
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

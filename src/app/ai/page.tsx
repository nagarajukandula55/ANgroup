'use client'

import Layout from '@/components/layout'
import {
  BrainCircuit,
  Sparkles,
  Bot,
  FileText,
  TrendingUp,
} from 'lucide-react'

const aiModules = [
  {
    title: 'Financial AI',
    description: 'Generate automated revenue and profit analysis.',
    icon: TrendingUp,
  },
  {
    title: 'Workflow AI',
    description: 'Automate approvals and enterprise workflows.',
    icon: Bot,
  },
  {
    title: 'Report Generator',
    description: 'Generate smart executive reports instantly.',
    icon: FileText,
  },
]

export default function AIPage() {
  return (
    <Layout>
      <div className="space-y-8">
        <section className="rounded-[40px] border border-white/10 bg-white/5 p-10">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-cyan-500/20 p-5">
              <BrainCircuit size={42} />
            </div>

            <div>
              <p className="uppercase tracking-[0.3em] text-cyan-300 text-sm">
                AI CONTROL CENTER
              </p>

              <h1 className="mt-3 text-6xl font-black">
                AI Workspace
              </h1>
            </div>
          </div>

          <p className="mt-8 max-w-3xl text-lg text-slate-300">
            Enterprise-grade AI ecosystem for operational intelligence,
            forecasting, workflow automation, analytics, reporting,
            and decision support.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {aiModules.map((item, index) => {
            const Icon = item.icon

            return (
              <div
                key={index}
                className="rounded-[32px] border border-white/10 bg-white/5 p-8"
              >
                <div className="rounded-2xl bg-cyan-500/10 w-fit p-4">
                  <Icon size={32} />
                </div>

                <h2 className="mt-6 text-3xl font-black">
                  {item.title}
                </h2>

                <p className="mt-4 text-slate-300">
                  {item.description}
                </p>

                <button className="mt-8 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-3 font-semibold">
                  Launch Module
                </button>
              </div>
            )
          })}
        </section>

        <section className="rounded-[36px] border border-white/10 bg-gradient-to-b from-cyan-500/10 to-blue-700/10 p-10">
          <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-300" />

            <p className="uppercase tracking-widest text-cyan-300 text-sm">
              AI STATUS
            </p>
          </div>

          <h2 className="mt-5 text-4xl font-black">
            Enterprise Intelligence Running
          </h2>

          <p className="mt-5 max-w-2xl text-slate-300">
            AI systems are continuously monitoring finance,
            operations, ecommerce, inventory, and logistics.
          </p>
        </section>
      </div>
    </Layout>
  )
}

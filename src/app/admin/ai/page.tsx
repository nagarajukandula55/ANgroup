'use client'

import { useEffect, useRef, useState } from 'react'
import Layout from '@/components/layout'
import { Send, Sparkles, Bot, AlertCircle } from 'lucide-react'

/**
 * AI Workspace — home for ANu, the in-house AI assistant.
 *
 * MOVED from src/app/ai/page.tsx (an orphaned root-level route showing only
 * static hardcoded "Financial AI / Workflow AI / Report Generator" cards,
 * nothing functional) to src/app/admin/ai — the conventional admin location.
 * This is a full rebuild of that page's purpose: a real chat interface
 * wired to POST /api/anu, which is backed by core/anu/anuService.ts.
 *
 * ANu is API-based (calls the business's configured Anthropic/OpenAI key
 * via AIConfig), per the locked-in decision in PROGRESS.md — true local/
 * offline model hosting is a deferred future phase, not attempted here.
 * If no provider is configured yet for this business, the API returns a
 * clear "not set up" message (not an error), shown here as a setup prompt
 * pointing at Settings > AI rather than a broken-looking chat box.
 */

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function AIWorkspacePage() {
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi, I'm ANu — ask me how to do anything in this platform (creating a module, granting access, setting up numbering, whatever you need)." },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [setupNeeded, setSetupNeeded] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          const found =
            d.businesses?.find((b: any) => b._id === d.user?.activeBusinessId) ||
            d.businesses?.[0]
          if (found?._id) setBusinessId(found._id)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || sending || !businessId) return

    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setSending(true)
    setSetupNeeded(null)

    try {
      const res = await fetch('/api/anu', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ businessId, messages: nextMessages }),
      })
      const d = await res.json()

      if (d.success) {
        setMessages((prev: ChatMessage[]) => [...prev, { role: 'assistant', content: d.reply }])
      } else {
        setSetupNeeded(d.error || 'ANu could not respond right now.')
      }
    } catch {
      setSetupNeeded('Could not reach ANu right now — please try again.')
    }
    setSending(false)
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-gray-900 p-3 text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest">AI Workspace</p>
            <h1 className="text-2xl font-bold text-gray-900">ANu</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white flex flex-col h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m: ChatMessage, i: number) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {m.role === 'assistant' && (
                    <div className="flex items-center gap-1.5 mb-1 text-xs text-gray-500">
                      <Bot size={12} /> ANu
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-gray-100 px-4 py-2.5 text-sm text-gray-500">ANu is thinking…</div>
              </div>
            )}
          </div>

          {setupNeeded && (
            <div className="mx-6 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{setupNeeded}</span>
            </div>
          )}

          <div className="border-t border-gray-200 p-4 flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Ask ANu anything about this platform…"
              className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-gray-400"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim() || !businessId}
              className="rounded-xl bg-gray-900 p-2.5 text-white disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  )
}

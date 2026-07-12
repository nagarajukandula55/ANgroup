"use client";

/**
 * ANu floating overlay — available on every admin page without disturbing
 * any existing UI (fixed-position bubble, opens a slide-up panel, closes on
 * its own click, doesn't intercept clicks anywhere else on the page).
 * Talks to the existing /api/anu (core/anu/anuService.ts + knowledgeBase.ts)
 * -- this widget doesn't add any new AI logic, just a persistent, always-
 * reachable place to use what already exists, plus a lightweight
 * "Teach ANu" quick-add wired to /api/anu/knowledge so the assistant's
 * knowledge can grow from the UI without a code deploy.
 */
import { useEffect, useRef, useState } from "react";
import { Bot, X, Send, Loader2, GraduationCap } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const LANGUAGE_STORAGE_KEY = "an_anu_language";

// Auto-detect is the default (ANu mirrors whatever language the user types
// in) -- this list is just for an explicit override, so replies stay in
// one language even if the user's own message mixes English with another
// language, common in real usage.
const LANGUAGES = [
  { value: "", label: "Auto-detect" },
  { value: "English", label: "English" },
  { value: "Hindi", label: "हिन्दी (Hindi)" },
  { value: "Tamil", label: "தமிழ் (Tamil)" },
  { value: "Telugu", label: "తెలుగు (Telugu)" },
  { value: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { value: "Malayalam", label: "മലയാളം (Malayalam)" },
  { value: "Marathi", label: "मराठी (Marathi)" },
  { value: "Bengali", label: "বাংলা (Bengali)" },
  { value: "Gujarati", label: "ગુજરાતી (Gujarati)" },
  { value: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
];

export default function AnuWidget() {
  const [open, setOpen] = useState(false);
  const [teachOpen, setTeachOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("");

  const [teachTopic, setTeachTopic] = useState("");
  const [teachSummary, setTeachSummary] = useState("");
  const [teachSaving, setTeachSaving] = useState(false);
  const [teachMsg, setTeachMsg] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setBusinessId(d.user?.activeBusinessId ?? null))
      .catch(() => {});
    try {
      setLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY) || "");
    } catch {
      /* ignore */
    }
  }, []);

  function changeLanguage(value: string) {
    setLanguage(value);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !businessId) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/anu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, messages: nextMessages, language: language || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setError(data.error || "ANu could not answer that.");
      }
    } catch {
      setError("Failed to connect to ANu.");
    } finally {
      setSending(false);
    }
  }

  async function teach() {
    if (!teachTopic.trim() || !teachSummary.trim()) return;
    setTeachSaving(true);
    setTeachMsg(null);
    try {
      const res = await fetch("/api/anu/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, topic: teachTopic.trim(), summary: teachSummary.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setTeachMsg("ANu learned it.");
        setTeachTopic("");
        setTeachSummary("");
      } else {
        setTeachMsg(data.message || "Failed to save.");
      }
    } catch {
      setTeachMsg("Failed to connect to server.");
    } finally {
      setTeachSaving(false);
    }
  }

  return (
    <>
      {/* Launcher bubble — bottom-right. Previously bottom-left, but that
          put it directly behind the admin sidebar (fixed/sticky, z-50,
          full-height, opaque, anchored to the left edge), which painted
          over it completely: the button was in the DOM and functioning,
          just visually hidden underneath the sidebar on every page. */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="ANu assistant"
        className="fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full bg-gray-900 text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition"
      >
        {open ? <X size={18} /> : <Bot size={20} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-80 max-w-[calc(100vw-3rem)] h-[28rem] max-h-[70vh] bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-900 text-white">
            <div className="flex items-center gap-2">
              <Bot size={16} />
              <span className="text-sm font-semibold">ANu Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={language}
                onChange={(e) => changeLanguage(e.target.value)}
                title="Reply language"
                className="text-[11px] bg-white/10 border border-white/20 rounded-lg px-1.5 py-1 text-white outline-none [&>option]:text-gray-900"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
              <button
                onClick={() => setTeachOpen((v) => !v)}
                title="Teach ANu something new"
                className="p-1.5 rounded-lg hover:bg-white/10 transition"
              >
                <GraduationCap size={15} />
              </button>
            </div>
          </div>

          {teachOpen && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 space-y-2">
              <input
                value={teachTopic}
                onChange={(e) => setTeachTopic(e.target.value)}
                placeholder="Topic (e.g. Refund Policy)"
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-400"
              />
              <textarea
                value={teachSummary}
                onChange={(e) => setTeachSummary(e.target.value)}
                placeholder="What should ANu know?"
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-gray-400 resize-none"
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={teach}
                  disabled={teachSaving}
                  className="text-xs font-medium bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-800 disabled:opacity-50"
                >
                  {teachSaving ? "Saving…" : "Teach ANu"}
                </button>
                {teachMsg && <span className="text-[10px] text-gray-500">{teachMsg}</span>}
              </div>
            </div>
          )}

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
            {messages.length === 0 && (
              <p className="text-xs text-gray-400">
                Ask me how something in this app works — modules, permissions, document numbering, HR, CRM, vendors, the mobile app, anything.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  m.role === "user" ? "ml-auto bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" /> Thinking…
              </div>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <div className="flex items-center gap-2 px-3 py-2.5 border-t border-gray-200">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
              placeholder="Ask ANu…"
              className="flex-1 text-xs border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400"
            />
            <button
              onClick={send}
              disabled={sending || !input.trim()}
              className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center hover:bg-gray-800 disabled:opacity-40 transition shrink-0"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

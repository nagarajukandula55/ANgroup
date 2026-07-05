'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Instagram, Linkedin, Twitter, Facebook, Loader2, Send, Clock, FileText, Sparkles } from 'lucide-react'

interface Post {
  _id: string
  caption: string
  platforms: string[]
  imageUrl?: string
  hashtags?: string[]
  status: string
  scheduledAt?: string
  postedAt?: string
  createdAt: string
}

const PLATFORM_STYLES: Record<string, { label: string; color: string }> = {
  instagram: { label: 'Instagram', color: 'bg-pink-50 text-pink-700' },
  facebook:  { label: 'Facebook',  color: 'bg-blue-50 text-blue-700' },
  twitter:   { label: 'X / Twitter', color: 'bg-gray-100 text-gray-700' },
  linkedin:  { label: 'LinkedIn',  color: 'bg-indigo-50 text-indigo-700' },
}

const STATUS_STYLES: Record<string, string> = {
  PUBLISHED: 'bg-green-50 text-green-700',
  SCHEDULED: 'bg-yellow-50 text-yellow-700',
  DRAFT:     'bg-gray-100 text-gray-600',
  FAILED:    'bg-red-50 text-red-700',
}

interface FormState {
  caption: string
  platforms: string[]
  scheduledAt: string
  status: string
  imageUrl: string
  hashtags: string[]
}

export default function SocialPage() {
  const router = useRouter()
  const [posts, setPosts]           = useState<Post[]>([])
  const [loading, setLoading]       = useState(true)
  const [businessId, setBusinessId] = useState<string | null>(null)
  const [tab, setTab]               = useState('ALL')
  const [showForm, setShowForm]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [publishing, setPublishing] = useState<string | null>(null)
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false)
  const [hashtagInput, setHashtagInput] = useState('')
  const [form, setForm] = useState<FormState>({
    caption: '', platforms: [] as string[], scheduledAt: '', status: 'DRAFT', imageUrl: '', hashtags: [],
  })

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      const bId = d.user?.activeBusinessId
      setBusinessId(bId)
      if (bId) fetchPosts(bId)
      else setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function fetchPosts(bId: string) {
    setLoading(true)
    try {
      const r = await fetch(`/api/social/posts?businessId=${bId}`)
      const d = await r.json()
      setPosts(d.posts ?? d.data ?? [])
    } catch { } finally { setLoading(false) }
  }

  function togglePlatform(p: string) {
    setForm((f: FormState) => ({
      ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x: string) => x !== p) : [...f.platforms, p]
    }))
  }

  function resetForm() {
    setForm({ caption: '', platforms: [], scheduledAt: '', status: 'DRAFT', imageUrl: '', hashtags: [] })
    setHashtagInput('')
    setEditingPost(null)
  }

  function openNewPost() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(post: Post) {
    setEditingPost(post)
    setForm({
      caption: post.caption,
      platforms: post.platforms || [],
      scheduledAt: post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '',
      status: post.status,
      imageUrl: post.imageUrl || '',
      hashtags: post.hashtags || [],
    })
    setHashtagInput('')
    setShowForm(true)
  }

  function addHashtag() {
    const tag = hashtagInput.trim().replace(/^#/, '')
    if (tag && !form.hashtags.includes(tag)) {
      setForm((f: FormState) => ({ ...f, hashtags: [...f.hashtags, tag] }))
    }
    setHashtagInput('')
  }

  function handleHashtagKeyDown(e: { key: string; preventDefault: () => void }) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault()
      addHashtag()
    }
  }

  function removeHashtag(tag: string) {
    setForm((f: FormState) => ({ ...f, hashtags: f.hashtags.filter((h: string) => h !== tag) }))
  }

  async function handleAICaption() {
    if (!form.caption.trim() && form.platforms.length === 0) return
    setAiCaptionLoading(true)
    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: form.caption || 'Create an engaging social media post for my business',
          platform: form.platforms[0] || 'ALL',
          tone: 'professional',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setForm((f: FormState) => ({ ...f, caption: data.caption }))
      }
    } catch { } finally {
      setAiCaptionLoading(false)
    }
  }

  async function handleSubmit(status: string) {
    setSubmitting(true)
    try {
      const body = { ...form, status, businessId }
      let postId = editingPost?._id

      if (editingPost) {
        await fetch(`/api/social/posts/${editingPost._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        const r = await fetch('/api/social/posts', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (r.ok) {
          const d = await r.json()
          postId = d.post?._id
        }
      }

      if (status === 'PUBLISHED' && postId) {
        await fetch('/api/social/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, platforms: form.platforms }),
        })
      }

      setShowForm(false)
      resetForm()
      if (businessId) fetchPosts(businessId)
    } catch { } finally { setSubmitting(false) }
  }

  async function handlePublish(post: Post) {
    setPublishing(post._id)
    try {
      await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post._id, platforms: post.platforms }),
      })
      if (businessId) fetchPosts(businessId)
    } catch { } finally {
      setPublishing(null)
    }
  }

  const tabs = ['ALL', 'PUBLISHED', 'SCHEDULED', 'DRAFT']
  const filtered = tab === 'ALL' ? posts : posts.filter((p: Post) => p.status === tab)

  const stats = {
    total: posts.length,
    published: posts.filter((p: Post) => p.status === 'PUBLISHED').length,
    scheduled: posts.filter((p: Post) => p.status === 'SCHEDULED').length,
    drafts: posts.filter((p: Post) => p.status === 'DRAFT').length,
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={15} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">Social Media</h1>
            <p className="text-sm text-gray-500">Design and publish posts across platforms</p>
          </div>
          <button onClick={openNewPost} className="flex items-center gap-2 bg-gray-900 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-gray-800">
            <Plus size={15} /> Create Post
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {([['Total Posts', stats.total], ['Published', stats.published], ['Scheduled', stats.scheduled], ['Drafts', stats.drafts]] as [string, number][]).map(([l, v]) => (
            <div key={l} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-sm text-gray-500">{l}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit shadow-sm">
          {tabs.map((t: string) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-gray-900 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Posts table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-gray-400 animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No posts yet. Create your first post!</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Caption</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Platforms</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((p: Post) => (
                  <tr key={p._id} className="hover:bg-gray-50">
                    <td className="px-5 py-4 text-gray-700 max-w-xs truncate">{p.caption}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1 flex-wrap">
                        {(p.platforms || []).map((pl: string) => (
                          <span key={pl} className={`rounded-full px-2 py-0.5 text-xs font-medium ${PLATFORM_STYLES[pl]?.color ?? 'bg-gray-100 text-gray-600'}`}>
                            {PLATFORM_STYLES[pl]?.label ?? pl}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[p.status] ?? 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-xs">{p.scheduledAt ? new Date(p.scheduledAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {p.status !== 'PUBLISHED' && (
                          <button
                            onClick={() => handlePublish(p)}
                            disabled={publishing === p._id}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                          >
                            {publishing === p._id ? 'Publishing...' : 'Publish'}
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(p)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create/Edit Post Slide-over */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="w-full max-w-md bg-white border-l border-gray-200 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">{editingPost ? 'Edit Post' : 'Create Post'}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={15} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-gray-600 block">Caption *</label>
                  <button
                    onClick={handleAICaption}
                    disabled={aiCaptionLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    {aiCaptionLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    AI Caption
                  </button>
                </div>
                <textarea rows={5} value={form.caption} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f: FormState) => ({ ...f, caption: e.target.value }))}
                  placeholder="Write your post caption here..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Platforms</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(PLATFORM_STYLES).map(([key, { label, color }]: [string, { label: string; color: string }]) => (
                    <button key={key} onClick={() => togglePlatform(key)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition ${form.platforms.includes(key) ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Image URL (optional)</label>
                <input type="url" value={form.imageUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, imageUrl: e.target.value }))}
                  placeholder="Paste image URL..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
                {form.imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-gray-200">
                    <img src={form.imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">Hashtags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.hashtags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs">
                      #{tag}
                      <button onClick={() => removeHashtag(tag)} className="hover:text-gray-900 transition-colors ml-1">×</button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={hashtagInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder="Type # and press Enter to add tags"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Schedule (optional)</label>
                <input type="datetime-local" value={form.scheduledAt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f: FormState) => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10" />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex gap-2">
              <button onClick={() => handleSubmit('DRAFT')} disabled={submitting} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">Save Draft</button>
              {form.scheduledAt ? (
                <button onClick={() => handleSubmit('SCHEDULED')} disabled={submitting} className="flex-1 py-2.5 rounded-xl bg-yellow-500 text-white text-sm font-medium hover:bg-yellow-600 flex items-center justify-center gap-1.5">
                  <Clock size={14} /> Schedule
                </button>
              ) : (
                <button onClick={() => handleSubmit('PUBLISHED')} disabled={submitting || !form.caption || !form.platforms.length}
                  className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

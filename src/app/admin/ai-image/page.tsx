'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Sparkles, Download, Copy, Loader2, Image as ImageIcon, RefreshCw, Wand2 } from 'lucide-react'

const STYLES = ['Realistic', 'Cartoon', 'Watercolor', 'Oil Painting', 'Sketch', 'Digital Art', 'Minimalist', 'Vintage']
const SIZES  = ['1024x1024', '1792x1024', '1024x1792']
const TONES  = ['Professional', 'Friendly', 'Inspirational', 'Humorous', 'Informative', 'Urgent']

export default function AIStudioPage() {
  const router = useRouter()

  /* Image generation */
  const [imgPrompt,  setImgPrompt]  = useState('')
  const [imgStyle,   setImgStyle]   = useState('Realistic')
  const [imgSize,    setImgSize]    = useState('1024x1024')
  const [genImage,   setGenImage]   = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)
  const [genError,   setGenError]   = useState('')

  /* Caption generation */
  const [capTopic,   setCapTopic]   = useState('')
  const [capTone,    setCapTone]    = useState('Professional')
  const [capPlatform,setCapPlatform]= useState('instagram')
  const [captions,   setCaptions]   = useState<string[]>([])
  const [capLoading, setCapLoading] = useState(false)
  const [capError,   setCapError]   = useState('')
  const [copied,     setCopied]     = useState<number | null>(null)

  async function generateImage() {
    if (!imgPrompt.trim()) return
    setGenLoading(true); setGenError(''); setGenImage(null)
    try {
      const r = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: imgPrompt, style: imgStyle, size: imgSize }),
      })
      const d = await r.json()
      if (d.url) setGenImage(d.url)
      else setGenError(d.error || 'Image generation failed')
    } catch { setGenError('Network error. Please try again.') }
    finally { setGenLoading(false) }
  }

  async function generateCaptions() {
    if (!capTopic.trim()) return
    setCapLoading(true); setCapError(''); setCaptions([])
    try {
      const r = await fetch('/api/ai/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: capTopic, tone: capTone, platform: capPlatform }),
      })
      const d = await r.json()
      if (d.captions?.length) setCaptions(d.captions)
      else setCapError(d.error || 'Caption generation failed')
    } catch { setCapError('Network error. Please try again.') }
    finally { setCapLoading(false) }
  }

  function copyCaption(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push('/admin')}
            className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 shadow-sm">
            <ArrowLeft size={15} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">AI Studio</h1>
            <p className="text-sm text-gray-500">Generate images and social media content with AI</p>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-violet-50 to-pink-50 border border-violet-200 rounded-xl px-3 py-2">
            <Sparkles size={14} className="text-violet-500" />
            <span className="text-xs font-medium text-violet-700">AI Powered</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Image Generator ─────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center">
                  <ImageIcon size={14} className="text-violet-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Image Generator</h2>
                  <p className="text-xs text-gray-400">Create visuals from text descriptions</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Describe your image *</label>
                <textarea rows={3} value={imgPrompt} onChange={e => setImgPrompt(e.target.value)}
                  placeholder="e.g. A modern office with natural light, team meeting around a glass table..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Style</label>
                  <select value={imgStyle} onChange={e => setImgStyle(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white">
                    {STYLES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Size</label>
                  <select value={imgSize} onChange={e => setImgSize(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white">
                    {SIZES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {genError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{genError}</p>}

              <button onClick={generateImage} disabled={genLoading || !imgPrompt.trim()}
                className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {genLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Wand2 size={14} /> Generate Image</>}
              </button>

              {/* Result */}
              {genImage && (
                <div className="rounded-xl overflow-hidden border border-gray-200 relative group">
                  <img src={genImage} alt="Generated" className="w-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-end justify-end p-3 gap-2 opacity-0 group-hover:opacity-100">
                    <a href={genImage} download="ai-generated.png"
                      className="bg-white rounded-lg p-2 shadow hover:bg-gray-50">
                      <Download size={14} className="text-gray-700" />
                    </a>
                    <button onClick={() => { setGenImage(null); generateImage() }}
                      className="bg-white rounded-lg p-2 shadow hover:bg-gray-50">
                      <RefreshCw size={14} className="text-gray-700" />
                    </button>
                  </div>
                </div>
              )}

              {genLoading && !genImage && (
                <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50 h-48 flex flex-col items-center justify-center gap-3">
                  <Loader2 size={24} className="text-violet-400 animate-spin" />
                  <p className="text-xs text-violet-500 font-medium">Creating your image…</p>
                  <p className="text-xs text-violet-400">This may take 15-30 seconds</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Caption Generator ────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Sparkles size={14} className="text-pink-600" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900">Caption Generator</h2>
                  <p className="text-xs text-gray-400">Write engaging social media captions</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1.5">Topic / Product *</label>
                <textarea rows={3} value={capTopic} onChange={e => setCapTopic(e.target.value)}
                  placeholder="e.g. New product launch for our eco-friendly water bottles..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-300" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Tone</label>
                  <select value={capTone} onChange={e => setCapTone(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 bg-white">
                    {TONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1.5">Platform</label>
                  <select value={capPlatform} onChange={e => setCapPlatform(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-500/20 bg-white">
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">X / Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </div>
              </div>

              {capError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{capError}</p>}

              <button onClick={generateCaptions} disabled={capLoading || !capTopic.trim()}
                className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-medium hover:bg-pink-700 disabled:opacity-50 flex items-center justify-center gap-2 transition">
                {capLoading ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate Captions</>}
              </button>

              {/* Caption Results */}
              {captions.length > 0 && (
                <div className="space-y-3">
                  {captions.map((cap, i) => (
                    <div key={i} className="relative bg-gray-50 rounded-xl border border-gray-200 p-4 group">
                      <p className="text-sm text-gray-700 leading-relaxed pr-8 whitespace-pre-wrap">{cap}</p>
                      <button onClick={() => copyCaption(cap, i)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg bg-white border border-gray-200 opacity-0 group-hover:opacity-100 transition hover:bg-gray-50">
                        {copied === i
                          ? <span className="text-[10px] font-medium text-green-600 px-1">✓</span>
                          : <Copy size={12} className="text-gray-500" />}
                      </button>
                    </div>
                  ))}
                  <button onClick={generateCaptions} disabled={capLoading}
                    className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1.5 font-medium">
                    <RefreshCw size={12} /> Regenerate
                  </button>
                </div>
              )}

              {capLoading && captions.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-pink-200 bg-pink-50 h-32 flex flex-col items-center justify-center gap-2">
                  <Loader2 size={20} className="text-pink-400 animate-spin" />
                  <p className="text-xs text-pink-500 font-medium">Writing captions…</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tips for better results</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { title: 'Be specific', body: 'Include colors, mood, setting, and subject details in your image prompts.' },
              { title: 'Use context', body: 'Mention your brand values and target audience for more relevant captions.' },
              { title: 'Iterate', body: 'Generate multiple variations and combine the best elements from each.' },
            ].map(({ title, body }) => (
              <div key={title} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-800 mb-1">{title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

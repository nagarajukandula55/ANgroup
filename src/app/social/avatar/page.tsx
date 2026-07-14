'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId';

interface Avatar {
  _id: string;
  name: string;
  imageUrl: string;
  isDefault: boolean;
}

export default function AvatarPage() {
  const { businessId } = useActiveBusinessId();
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('modern, minimal, professional');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!businessId) return;
    const res = await fetch(`/api/social/avatar?businessId=${businessId}`);
    if (res.ok) setAvatars((await res.json()).avatars || []);
  };

  useEffect(() => {
    load();
  }, [businessId]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const res = await fetch('/api/social/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name, prompt, style, setDefault: avatars.length === 0 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Generation failed');
      }
      setName('');
      setPrompt('');
      load();
    } catch (err: any) {
      setError(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const makeDefault = async (id: string) => {
    await fetch(`/api/social/avatar/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ setDefault: true }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this avatar?')) return;
    await fetch(`/api/social/avatar/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-6">
        Avatar Studio
      </h1>

      <div className="flex gap-2 mb-8 border-b border-white/10 pb-3">
        <Link href="/social" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Composer</Link>
        <Link href="/social/channels" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Channels</Link>
        <Link href="/social/avatar" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">Avatar Studio</Link>
        <Link href="/social/automation" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Auto-pilot</Link>
      </div>

      <p className="text-gray-400 mb-6">Generate an AI brand avatar/persona used across auto-generated posts.</p>

      <form onSubmit={generate} className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 mb-8 space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Describe the avatar</label>
          <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} required className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
        </div>
        <div>
          <label className="block text-sm text-gray-400 mb-1">Style</label>
          <input value={style} onChange={(e) => setStyle(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
        </div>
        <button disabled={generating} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          {generating ? 'Generating…' : 'Generate avatar'}
        </button>
        {error && <div className="text-red-400 text-sm">{error}</div>}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {avatars.map((a) => (
          <div key={a._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={a.imageUrl} alt={a.name} className="w-full rounded-lg mb-3" />
            <div className="flex justify-between items-center">
              <strong>{a.name}</strong>
              {a.isDefault ? (
                <span className="text-xs px-2 py-1 rounded-full border text-green-400 border-green-500/40 bg-green-500/10">Default</span>
              ) : (
                <button onClick={() => makeDefault(a._id)} className="text-xs text-gray-300 hover:text-white">Set default</button>
              )}
            </div>
            <button onClick={() => remove(a._id)} className="mt-3 text-xs text-red-400 hover:text-red-300">Delete</button>
          </div>
        ))}
        {avatars.length === 0 && <div className="text-gray-500">No avatars yet.</div>}
      </div>
    </div>
  );
}

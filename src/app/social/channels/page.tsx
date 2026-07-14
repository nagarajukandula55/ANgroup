'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId';

const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'YOUTUBE'];

interface Channel {
  _id: string;
  platform: string;
  name: string;
  isConnected: boolean;
  isActive: boolean;
}

export default function ChannelsPage() {
  const { businessId } = useActiveBusinessId();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [platform, setPlatform] = useState('FACEBOOK');
  const [name, setName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!businessId) return;
    const res = await fetch(`/api/social/channels?businessId=${businessId}`);
    if (res.ok) setChannels((await res.json()).channels || []);
  };

  useEffect(() => {
    load();
  }, [businessId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/social/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          platform,
          name,
          credentials: { accessToken, pageId, authorUrn: pageId, bearerToken: accessToken },
        }),
      });
      setName('');
      setAccessToken('');
      setPageId('');
      setFormOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this channel?')) return;
    await fetch(`/api/social/channels/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          Channels
        </h1>
        <button onClick={() => setFormOpen((v) => !v)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          {formOpen ? 'Cancel' : '+ Connect channel'}
        </button>
      </div>

      <div className="flex gap-2 mb-8 border-b border-white/10 pb-3">
        <Link href="/social" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Composer</Link>
        <Link href="/social/channels" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">Channels</Link>
        <Link href="/social/avatar" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Avatar Studio</Link>
        <Link href="/social/automation" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Auto-pilot</Link>
      </div>

      {formOpen && (
        <form onSubmit={handleAdd} className="max-w-lg rounded-2xl border border-white/10 bg-white/5 p-5 mb-8 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2">
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Page / account name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Access token</label>
            <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Page / author ID</label>
            <input value={pageId} onChange={(e) => setPageId(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
          </div>
          <button disabled={saving} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
            {saving ? 'Saving…' : 'Save channel'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {channels.map((c) => (
          <div key={c._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex justify-between items-start mb-2">
              <strong>{c.name}</strong>
              <button onClick={() => remove(c._id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
            </div>
            <div className="text-gray-400 text-sm mb-2">{c.platform}</div>
            <span className={`text-xs px-2 py-1 rounded-full border ${c.isConnected ? 'text-green-400 border-green-500/40 bg-green-500/10' : 'text-amber-400 border-amber-500/40 bg-amber-500/10'}`}>
              {c.isConnected ? 'Connected' : 'No credentials yet'}
            </span>
          </div>
        ))}
        {channels.length === 0 && <div className="text-gray-500">No channels connected yet.</div>}
      </div>
    </div>
  );
}

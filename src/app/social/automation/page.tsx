'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId';

const FREQUENCIES = ['HOURLY', 'DAILY', 'EVERY_3_DAYS', 'WEEKLY'];

interface Rule {
  _id: string;
  name: string;
  isActive: boolean;
  frequency: string;
  channelIds: any[];
}

export default function AutomationPage() {
  const { businessId } = useActiveBusinessId();
  const [rules, setRules] = useState<Rule[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [avatars, setAvatars] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [topics, setTopics] = useState('');
  const [frequency, setFrequency] = useState('DAILY');
  const [autoPublish, setAutoPublish] = useState(true);
  const [resharePastPosts, setResharePastPosts] = useState(true);
  const [avatarId, setAvatarId] = useState('');
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);

  const load = async () => {
    if (!businessId) return;
    const [r, c, a] = await Promise.all([
      fetch(`/api/social/automation?businessId=${businessId}`).then((res) => res.json()),
      fetch(`/api/social/channels?businessId=${businessId}`).then((res) => res.json()),
      fetch(`/api/social/avatar?businessId=${businessId}`).then((res) => res.json()),
    ]);
    setRules(r.rules || []);
    setChannels(c.channels || []);
    setAvatars(a.avatars || []);
  };

  useEffect(() => {
    load();
  }, [businessId]);

  const toggleChannel = (id: string) =>
    setChannelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch('/api/social/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          name,
          channelIds,
          topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
          frequency,
          autoPublish,
          resharePastPosts,
          avatarId: avatarId || undefined,
        }),
      });
      setName('');
      setChannelIds([]);
      setTopics('');
      setFormOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (rule: Rule) => {
    await fetch(`/api/social/automation/${rule._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });
    load();
  };

  const runNow = async (id: string) => {
    setRunning(id);
    try {
      const res = await fetch(`/api/social/automation/${id}/run`, { method: 'POST' });
      const data = await res.json();
      alert(`Created ${data.postsCreated} post(s)${data.errors?.length ? `\nIssues: ${data.errors.join('; ')}` : ''}`);
      load();
    } finally {
      setRunning(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this auto-pilot rule?')) return;
    await fetch(`/api/social/automation/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          Auto-pilot
        </h1>
        <button onClick={() => setFormOpen((v) => !v)} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
          {formOpen ? 'Cancel' : '+ New rule'}
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
        <Link href="/social" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Composer</Link>
        <Link href="/social/channels" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Channels</Link>
        <Link href="/social/avatar" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Avatar Studio</Link>
        <Link href="/social/automation" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">Auto-pilot</Link>
      </div>

      <p className="text-gray-400 mb-6 max-w-2xl">
        Generates and publishes content on a schedule, and can reshare your own top-performing posts (remixed, never
        duplicated) after a cooldown. No fake engagement — your channels, your content, organic scheduling.
      </p>

      {formOpen && (
        <form onSubmit={create} className="max-w-xl rounded-2xl border border-white/10 bg-white/5 p-5 mb-8 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Rule name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Channels</label>
            <div className="flex flex-wrap gap-3">
              {channels.map((c) => (
                <label key={c._id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={channelIds.includes(c._id)} onChange={() => toggleChannel(c._id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Topics (comma separated)</label>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2">
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Avatar</label>
            <select value={avatarId} onChange={(e) => setAvatarId(e.target.value)} className="w-full rounded-lg bg-black/40 border border-white/10 p-2">
              <option value="">Default avatar</option>
              {avatars.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} /> Auto-publish
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={resharePastPosts} onChange={(e) => setResharePastPosts(e.target.checked)} /> Reshare top posts
            </label>
          </div>
          <button disabled={saving || channelIds.length === 0} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 font-semibold">
            {saving ? 'Saving…' : 'Create rule'}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((r) => (
          <div key={r._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex justify-between items-center mb-2">
              <strong>{r.name}</strong>
              <span className={`text-xs px-2 py-1 rounded-full border ${r.isActive ? 'text-green-400 border-green-500/40 bg-green-500/10' : 'text-gray-400 border-white/10 bg-white/5'}`}>
                {r.isActive ? 'Active' : 'Paused'}
              </span>
            </div>
            <div className="text-gray-400 text-sm mb-3">{r.frequency} · {r.channelIds?.length || 0} channel(s)</div>
            <div className="flex gap-2">
              <button onClick={() => runNow(r._id)} disabled={running === r._id} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                {running === r._id ? 'Running…' : 'Run now'}
              </button>
              <button onClick={() => toggleActive(r)} className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20">
                {r.isActive ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => remove(r._id)} className="text-xs px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300">Delete</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="text-gray-500">No auto-pilot rules yet.</div>}
      </div>
    </div>
  );
}

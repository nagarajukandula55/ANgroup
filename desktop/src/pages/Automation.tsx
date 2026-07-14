import React, { useEffect, useState } from 'react';
import { useSession } from '../context';
import { api } from '../api/client';

const FREQUENCIES = ['HOURLY', 'DAILY', 'EVERY_3_DAYS', 'WEEKLY'];

export default function Automation() {
  const { activeBusinessId } = useSession();
  const [rules, setRules] = useState<any[]>([]);
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

  const load = () => {
    if (!activeBusinessId) return;
    api.listAutomationRules(activeBusinessId).then((d) => setRules(d.rules));
    api.listChannels(activeBusinessId).then((d) => setChannels(d.channels));
    api.listAvatars(activeBusinessId).then((d) => setAvatars(d.avatars));
  };

  useEffect(load, [activeBusinessId]);

  const toggleChannel = (id: string) =>
    setChannelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createAutomationRule({
        businessId: activeBusinessId,
        name,
        channelIds,
        topics: topics.split(',').map((t) => t.trim()).filter(Boolean),
        frequency,
        autoPublish,
        resharePastPosts,
        avatarId: avatarId || undefined,
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

  const toggleActive = async (rule: any) => {
    await api.updateAutomationRule(rule._id, { isActive: !rule.isActive });
    load();
  };

  const runNow = async (id: string) => {
    setRunning(id);
    try {
      const result = await api.runAutomationRule(id);
      alert(`Created ${result.postsCreated} post(s)${result.errors.length ? `\nIssues: ${result.errors.join('; ')}` : ''}`);
      load();
    } finally {
      setRunning(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this auto-pilot rule?')) return;
    await api.deleteAutomationRule(id);
    load();
  };

  return (
    <div>
      <div className="spread">
        <h2>Auto-pilot</h2>
        <button className="btn" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : '+ New rule'}</button>
      </div>
      <p className="muted">Generates and publishes content on a schedule, and can reshare your own top-performing posts (remixed, never duplicated) after a cooldown. No fake engagement — your channels, your content, organic scheduling.</p>

      {formOpen && (
        <form className="card" onSubmit={create} style={{ maxWidth: 520, margin: '16px 0' }}>
          <div className="field">
            <label>Rule name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Daily brand updates" />
          </div>
          <div className="field">
            <label>Channels</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {channels.map((c) => (
                <label key={c._id} className="row" style={{ gap: 6 }}>
                  <input type="checkbox" checked={channelIds.includes(c._id)} onChange={() => toggleChannel(c._id)} />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Topics (comma separated)</label>
            <input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="product tips, industry news, behind the scenes" />
          </div>
          <div className="field">
            <label>Frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Avatar</label>
            <select value={avatarId} onChange={(e) => setAvatarId(e.target.value)}>
              <option value="">Default avatar</option>
              {avatars.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div className="field row" style={{ gap: 16 }}>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={autoPublish} onChange={(e) => setAutoPublish(e.target.checked)} /> Auto-publish
            </label>
            <label className="row" style={{ gap: 6 }}>
              <input type="checkbox" checked={resharePastPosts} onChange={(e) => setResharePastPosts(e.target.checked)} /> Reshare top posts
            </label>
          </div>
          <button className="btn" disabled={saving || channelIds.length === 0}>{saving ? 'Saving…' : 'Create rule'}</button>
        </form>
      )}

      <div className="grid grid-2">
        {rules.map((r) => (
          <div className="card" key={r._id}>
            <div className="spread">
              <strong>{r.name}</strong>
              <span className={`badge ${r.isActive ? 'badge-green' : 'badge-gray'}`}>{r.isActive ? 'Active' : 'Paused'}</span>
            </div>
            <div className="muted" style={{ margin: '6px 0' }}>{r.frequency} · {r.channelIds?.length || 0} channel(s)</div>
            <div className="row" style={{ gap: 8, marginTop: 10 }}>
              <button className="btn-ghost" onClick={() => runNow(r._id)} disabled={running === r._id}>
                {running === r._id ? 'Running…' : 'Run now'}
              </button>
              <button className="btn-ghost" onClick={() => toggleActive(r)}>{r.isActive ? 'Pause' : 'Resume'}</button>
              <button className="btn-danger" onClick={() => remove(r._id)}>Delete</button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="muted">No auto-pilot rules yet.</div>}
      </div>
    </div>
  );
}

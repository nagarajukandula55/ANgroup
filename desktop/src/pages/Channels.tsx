import React, { useEffect, useState } from 'react';
import { useSession } from '../context';
import { api } from '../api/client';

const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'YOUTUBE'];

export default function Channels() {
  const { activeBusinessId } = useSession();
  const [channels, setChannels] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [platform, setPlatform] = useState('FACEBOOK');
  const [name, setName] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [pageId, setPageId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!activeBusinessId) return;
    api.listChannels(activeBusinessId).then((d) => setChannels(d.channels));
  };

  useEffect(load, [activeBusinessId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createChannel({
        businessId: activeBusinessId,
        platform,
        name,
        credentials: { accessToken, pageId, authorUrn: pageId, bearerToken: accessToken },
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
    await api.deleteChannel(id);
    load();
  };

  return (
    <div>
      <div className="spread">
        <h2>Channels</h2>
        <button className="btn" onClick={() => setFormOpen((v) => !v)}>{formOpen ? 'Cancel' : '+ Connect channel'}</button>
      </div>

      {formOpen && (
        <form className="card" onSubmit={handleAdd} style={{ marginBottom: 18, maxWidth: 480 }}>
          <div className="field">
            <label>Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Page / account name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Main Brand Page" />
          </div>
          <div className="field">
            <label>Access token</label>
            <input value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Paste page/API access token" />
          </div>
          <div className="field">
            <label>Page / author ID</label>
            <input value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Facebook Page ID / LinkedIn author URN / etc." />
          </div>
          <button className="btn" disabled={saving}>{saving ? 'Saving…' : 'Save channel'}</button>
        </form>
      )}

      <div className="grid grid-3">
        {channels.map((c) => (
          <div className="card" key={c._id}>
            <div className="spread">
              <strong>{c.name}</strong>
              <button className="btn-danger" onClick={() => remove(c._id)}>Remove</button>
            </div>
            <div className="muted" style={{ margin: '6px 0' }}>{c.platform}</div>
            <span className={`badge ${c.isConnected ? 'badge-green' : 'badge-amber'}`}>
              {c.isConnected ? 'Connected' : 'No credentials yet'}
            </span>
          </div>
        ))}
        {channels.length === 0 && <div className="muted">No channels connected yet.</div>}
      </div>
    </div>
  );
}

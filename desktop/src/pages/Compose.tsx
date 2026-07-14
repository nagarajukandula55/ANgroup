import React, { useEffect, useState } from 'react';
import { useSession } from '../context';
import { api } from '../api/client';

const PLATFORMS = ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'YOUTUBE'];

export default function Compose() {
  const { activeBusinessId } = useSession();
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannelIds, setSelectedChannelIds] = useState<string[]>([]);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!activeBusinessId) return;
    api.listChannels(activeBusinessId).then((d) => setChannels(d.channels));
  }, [activeBusinessId]);

  const selectedChannels = channels.filter((c) => selectedChannelIds.includes(c._id));
  const platform = selectedChannels[0]?.platform || PLATFORMS[0];

  const toggleChannel = (id: string) =>
    setSelectedChannelIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const generate = async () => {
    if (!topic.trim()) return;
    setGenerating(true);
    setMessage('');
    try {
      const result = await api.generateContent({ businessId: activeBusinessId, topic, platform, tone });
      setCaption(result.caption);
      setHashtags(result.hashtags);
    } catch (err: any) {
      setMessage(err?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const publishNow = async () => {
    if (!caption.trim() || selectedChannelIds.length === 0) return;
    setSaving(true);
    setMessage('');
    try {
      const created = await api.createPost({
        businessId: activeBusinessId,
        platform,
        caption,
        hashtags,
        channelIds: selectedChannelIds,
        topic,
        aiGenerated: true,
      });
      const result = await api.publishPostChannels(created.post._id, selectedChannelIds);
      setMessage(result.message);
      setCaption('');
      setTopic('');
      setHashtags([]);
    } catch (err: any) {
      setMessage(err?.message || 'Publish failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Compose</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <label>Target channels</label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {channels.map((c) => (
            <label key={c._id} className="row" style={{ gap: 6, background: '#0f0f16', padding: '6px 10px', borderRadius: 8, border: '1px solid #2a2a38' }}>
              <input type="checkbox" checked={selectedChannelIds.includes(c._id)} onChange={() => toggleChannel(c._id)} />
              {c.name} <span className="muted">({c.platform})</span>
            </label>
          ))}
          {channels.length === 0 && <span className="muted">No channels connected — add one in Channels first.</span>}
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="field">
            <label>Topic / what's this post about</label>
            <textarea rows={3} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="New product launch, weekly update, customer story..." />
          </div>
          <div className="field">
            <label>Tone</label>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="playful">Playful</option>
              <option value="inspirational">Inspirational</option>
            </select>
          </div>
          <button className="btn" onClick={generate} disabled={generating}>{generating ? 'Generating…' : '✨ Generate with AI'}</button>
        </div>

        <div className="card">
          <div className="field">
            <label>Caption</label>
            <textarea rows={8} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </div>
          <div className="field">
            <label>Hashtags</label>
            <input value={hashtags.join(' ')} onChange={(e) => setHashtags(e.target.value.split(/\s+/).filter(Boolean))} />
          </div>
          <button className="btn" onClick={publishNow} disabled={saving}>{saving ? 'Publishing…' : 'Publish now'}</button>
          {message && <div className="muted" style={{ marginTop: 10 }}>{message}</div>}
        </div>
      </div>
    </div>
  );
}

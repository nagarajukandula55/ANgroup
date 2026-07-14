import React, { useEffect, useState } from 'react';
import { useSession } from '../context';
import { api } from '../api/client';

export default function AvatarStudio() {
  const { activeBusinessId } = useSession();
  const [avatars, setAvatars] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('modern, minimal, professional');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    if (!activeBusinessId) return;
    api.listAvatars(activeBusinessId).then((d) => setAvatars(d.avatars));
  };

  useEffect(load, [activeBusinessId]);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      await api.generateAvatar({ businessId: activeBusinessId, name, prompt, style, setDefault: avatars.length === 0 });
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
    await api.setDefaultAvatar(id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this avatar?')) return;
    await api.deleteAvatar(id);
    load();
  };

  return (
    <div>
      <h2>Avatar Studio</h2>
      <p className="muted">Generate an AI brand avatar/persona used across auto-generated posts.</p>

      <form className="card" onSubmit={generate} style={{ maxWidth: 480, margin: '18px 0' }}>
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Brand Mascot" />
        </div>
        <div className="field">
          <label>Describe the avatar</label>
          <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} required placeholder="A friendly tech founder avatar for a logistics brand..." />
        </div>
        <div className="field">
          <label>Style</label>
          <input value={style} onChange={(e) => setStyle(e.target.value)} />
        </div>
        <button className="btn" disabled={generating}>{generating ? 'Generating…' : 'Generate avatar'}</button>
        {error && <div className="err">{error}</div>}
      </form>

      <div className="grid grid-3">
        {avatars.map((a) => (
          <div className="card" key={a._id}>
            <img src={a.imageUrl} alt={a.name} style={{ width: '100%', borderRadius: 10, marginBottom: 8 }} />
            <div className="spread">
              <strong>{a.name}</strong>
              {a.isDefault ? <span className="badge badge-green">Default</span> : (
                <button className="btn-ghost" onClick={() => makeDefault(a._id)}>Set default</button>
              )}
            </div>
            <button className="btn-danger" style={{ marginTop: 8 }} onClick={() => remove(a._id)}>Delete</button>
          </div>
        ))}
        {avatars.length === 0 && <div className="muted">No avatars yet.</div>}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { api, getApiBaseUrl, setApiBaseUrl } from '../api/client';

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [apiUrl, setApiUrl] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getApiBaseUrl().then((url) => setApiUrl(url || ''));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!apiUrl.trim()) {
      setError('Enter your ANgroup instance URL (e.g. https://angroup.in)');
      return;
    }
    setLoading(true);
    try {
      await setApiBaseUrl(apiUrl.trim());
      await api.login({ email, password });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-box card" onSubmit={handleSubmit}>
        <h1 style={{ fontSize: 18, marginBottom: 4 }}>ANgroup Social</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Sign in with your ANgroup account</p>

        <div className="field">
          <label>ANgroup instance URL</label>
          <input value={apiUrl} onChange={(e) => setApiUrl(e.target.value)} placeholder="https://angroup.in" />
        </div>
        <div className="field">
          <label>Email or username</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <button className="btn" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <div className="err">{error}</div>}
      </form>
    </div>
  );
}

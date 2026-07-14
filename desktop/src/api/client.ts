declare global {
  interface Window {
    angroupDesktop: {
      getApiBaseUrl: () => Promise<string>;
      setApiBaseUrl: (url: string) => Promise<boolean>;
    };
  }
}

let cachedBaseUrl: string | null = null;

export async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl !== null) return cachedBaseUrl;
  cachedBaseUrl = (await window.angroupDesktop.getApiBaseUrl()) || '';
  return cachedBaseUrl;
}

export async function setApiBaseUrl(url: string): Promise<void> {
  const trimmed = url.replace(/\/$/, '');
  await window.angroupDesktop.setApiBaseUrl(trimmed);
  cachedBaseUrl = trimmed;
}

/**
 * Every request goes with credentials:'include' so Electron's persisted
 * cookie jar (set once at login by /api/auth/login) authenticates it,
 * exactly like the browser session does for angroup.in itself. No separate
 * token system -- one login, same session, reused across the whole app.
 */
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = await getApiBaseUrl();
  if (!base) throw new Error('API base URL not configured yet.');

  const res = await fetch(`${base}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  login: (payload: { email?: string; username?: string; password: string }) =>
    request<{ success: boolean; message?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () =>
    request<{ success: boolean; user: any; businesses: any[] }>('/api/auth/me'),

  listChannels: (businessId: string, platform?: string) =>
    request<{ channels: any[] }>(`/api/social/channels?businessId=${businessId}${platform ? `&platform=${platform}` : ''}`),

  createChannel: (payload: any) =>
    request<{ channel: any }>('/api/social/channels', { method: 'POST', body: JSON.stringify(payload) }),

  updateChannel: (id: string, payload: any) =>
    request<{ channel: any }>(`/api/social/channels/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteChannel: (id: string) =>
    request<{ message: string }>(`/api/social/channels/${id}`, { method: 'DELETE' }),

  listPosts: (businessId: string, params: Record<string, string> = {}) =>
    request<{ posts: any[]; stats: any }>(
      `/api/social/posts?${new URLSearchParams({ businessId, ...params }).toString()}`
    ),

  generateContent: (payload: { businessId: string; topic: string; platform: string; tone?: string }) =>
    request<{ caption: string; hashtags: string[]; provider: string }>('/api/social/posts/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createPost: (payload: any) =>
    request<{ post: any }>('/api/social/posts', { method: 'POST', body: JSON.stringify(payload) }),

  publishPostChannels: (postId: string, channelIds?: string[]) =>
    request<{ channelResults: any[]; overallStatus: string; message: string }>(
      `/api/social/posts/${postId}/publish-channels`,
      { method: 'POST', body: JSON.stringify({ channelIds }) }
    ),

  deletePost: (id: string) => request<{ message: string }>(`/api/social/posts/${id}`, { method: 'DELETE' }),

  listAvatars: (businessId: string) => request<{ avatars: any[] }>(`/api/social/avatar?businessId=${businessId}`),

  generateAvatar: (payload: any) =>
    request<{ avatar: any }>('/api/social/avatar', { method: 'POST', body: JSON.stringify(payload) }),

  setDefaultAvatar: (id: string) =>
    request<{ avatar: any }>(`/api/social/avatar/${id}`, { method: 'PATCH', body: JSON.stringify({ setDefault: true }) }),

  deleteAvatar: (id: string) => request<{ message: string }>(`/api/social/avatar/${id}`, { method: 'DELETE' }),

  listAutomationRules: (businessId: string) =>
    request<{ rules: any[] }>(`/api/social/automation?businessId=${businessId}`),

  createAutomationRule: (payload: any) =>
    request<{ rule: any }>('/api/social/automation', { method: 'POST', body: JSON.stringify(payload) }),

  updateAutomationRule: (id: string, payload: any) =>
    request<{ rule: any }>(`/api/social/automation/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),

  deleteAutomationRule: (id: string) =>
    request<{ message: string }>(`/api/social/automation/${id}`, { method: 'DELETE' }),

  runAutomationRule: (id: string) =>
    request<{ postsCreated: number; errors: string[] }>(`/api/social/automation/${id}/run`, { method: 'POST' }),
};

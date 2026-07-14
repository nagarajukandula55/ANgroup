'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useActiveBusinessId } from '@/hooks/useActiveBusinessId';

type Platform = 'ALL' | 'INSTAGRAM' | 'LINKEDIN' | 'TWITTER' | 'FACEBOOK';
type PostStatus = 'DRAFT' | 'SCHEDULED' | 'POSTED' | 'FAILED';

interface SocialPost {
  _id: string;
  platform: Platform;
  caption: string;
  imageUrl?: string;
  hashtags: string[];
  status: PostStatus;
  scheduledAt?: string;
  postedAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  postedToday: number;
  scheduled: number;
  failed: number;
}

const PLATFORM_CONFIG = {
  INSTAGRAM: {
    label: 'Instagram',
    color: 'from-pink-500 to-purple-600',
    bg: 'bg-pink-500/20',
    border: 'border-pink-500/40',
    text: 'text-pink-400',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  LINKEDIN: {
    label: 'LinkedIn',
    color: 'from-blue-600 to-blue-700',
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-400',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  TWITTER: {
    label: 'Twitter/X',
    color: 'from-sky-400 to-sky-500',
    bg: 'bg-sky-500/20',
    border: 'border-sky-500/40',
    text: 'text-sky-400',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  FACEBOOK: {
    label: 'Facebook',
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-600/20',
    border: 'border-blue-600/40',
    text: 'text-blue-300',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
};

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-gray-500/30 text-gray-300 border-gray-500/40' },
  SCHEDULED: { label: 'Scheduled', color: 'bg-amber-500/30 text-amber-300 border-amber-500/40' },
  POSTED: { label: 'Posted', color: 'bg-green-500/30 text-green-300 border-green-500/40' },
  FAILED: { label: 'Failed', color: 'bg-red-500/30 text-red-300 border-red-500/40' },
};

export default function SocialMediaPage() {
  const router = useRouter();
  const { businessId } = useActiveBusinessId();
  const BUSINESS_ID = businessId || '';
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, postedToday: 0, scheduled: 0, failed: 0 });
  const [activeTab, setActiveTab] = useState<Platform>('ALL');
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [publishing, setPublishing] = useState<string | null>(null);

  // Composer state
  const [caption, setCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [composerLoading, setComposerLoading] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const hashtagInputRef = useRef<HTMLInputElement>(null);

  const fetchPosts = async () => {
    if (!BUSINESS_ID) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ businessId: BUSINESS_ID, limit: '50' });
      if (activeTab !== 'ALL') params.set('platform', activeTab);
      const res = await fetch(`/api/social/posts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setStats(data.stats || { total: 0, postedToday: 0, scheduled: 0, failed: 0 });
      }
    } catch (err) {
      console.error('Failed to fetch posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [activeTab, BUSINESS_ID]);

  const resetComposer = () => {
    setCaption('');
    setSelectedPlatforms([]);
    setImageUrl('');
    setHashtags([]);
    setHashtagInput('');
    setScheduledAt('');
    setEditingPost(null);
  };

  const openNewPost = () => {
    resetComposer();
    setPanelOpen(true);
  };

  const openEdit = (post: SocialPost) => {
    setEditingPost(post);
    setCaption(post.caption);
    setSelectedPlatforms([post.platform]);
    setImageUrl(post.imageUrl || '');
    setHashtags(post.hashtags || []);
    setScheduledAt(post.scheduledAt ? new Date(post.scheduledAt).toISOString().slice(0, 16) : '');
    setPanelOpen(true);
  };

  const handleHashtagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      addHashtag();
    }
  };

  const addHashtag = () => {
    const tag = hashtagInput.trim().replace(/^#/, '');
    if (tag && !hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setHashtagInput('');
  };

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter((h) => h !== tag));
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleAICaption = async () => {
    if (!caption.trim() && selectedPlatforms.length === 0) return;
    setAiCaptionLoading(true);
    try {
      const res = await fetch('/api/ai/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: caption || 'Create an engaging social media post for my business',
          platform: selectedPlatforms[0] || 'ALL',
          tone: 'professional',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCaption(data.caption);
      }
    } catch (err) {
      console.error('AI caption failed', err);
    } finally {
      setAiCaptionLoading(false);
    }
  };

  const handleSave = async (postNow = false) => {
    if (!caption.trim() || selectedPlatforms.length === 0) return;
    setComposerLoading(true);
    try {
      const platform = selectedPlatforms.length === 1 ? selectedPlatforms[0] : 'ALL';
      const body = {
        businessId: BUSINESS_ID,
        platform,
        caption,
        imageUrl: imageUrl || undefined,
        hashtags,
        scheduledAt: !postNow && scheduledAt ? scheduledAt : undefined,
      };

      let postId = editingPost?._id;

      if (editingPost) {
        await fetch(`/api/social/posts/${editingPost._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const res = await fetch('/api/social/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          postId = data.post._id;
        }
      }

      if (postNow && postId) {
        await fetch('/api/social/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, platforms: selectedPlatforms }),
        });
      }

      setPanelOpen(false);
      resetComposer();
      fetchPosts();
    } catch (err) {
      console.error('Save failed', err);
    } finally {
      setComposerLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Delete this post?')) return;
    try {
      await fetch(`/api/social/posts/${postId}`, { method: 'DELETE' });
      fetchPosts();
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handlePublish = async (post: SocialPost) => {
    setPublishing(post._id);
    try {
      await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: post._id, platforms: [post.platform] }),
      });
      fetchPosts();
    } catch (err) {
      console.error('Publish failed', err);
    } finally {
      setPublishing(null);
    }
  };

  const tabs: Platform[] = ['ALL', 'INSTAGRAM', 'LINKEDIN', 'TWITTER', 'FACEBOOK'];

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            Social Media
          </h1>
          <p className="text-gray-400 mt-1">Manage and publish your social content</p>
        </div>
        <button
          onClick={openNewPost}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all duration-200 shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Post
        </button>
      </div>

      {/* Sub-nav */}
      <div className="flex gap-2 mb-8 border-b border-white/10 pb-3">
        <Link href="/social" className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-white">Composer</Link>
        <Link href="/social/channels" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Channels</Link>
        <Link href="/social/avatar" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Avatar Studio</Link>
        <Link href="/social/automation" className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white">Auto-pilot</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Posts', value: stats.total, icon: '📊', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
          { label: 'Posted Today', value: stats.postedToday, icon: '✅', color: 'from-green-500/20 to-green-600/10', border: 'border-green-500/30' },
          { label: 'Scheduled', value: stats.scheduled, icon: '🕐', color: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30' },
          { label: 'Failed', value: stats.failed, icon: '❌', color: 'from-red-500/20 to-red-600/10', border: 'border-red-500/30' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-2xl border ${stat.border} bg-gradient-to-br ${stat.color} backdrop-blur-sm p-5`}
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-3xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const config = tab !== 'ALL' ? PLATFORM_CONFIG[tab] : null;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap border ${
                isActive
                  ? 'bg-white/10 border-white/20 text-white shadow-lg'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/8 hover:text-gray-200'
              }`}
            >
              {config && <span className={config.text}>{config.icon}</span>}
              {tab === 'ALL' ? 'All Posts' : config?.label || tab}
            </button>
          );
        })}
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse border border-white/10" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-500">
          <div className="text-6xl mb-4">📱</div>
          <h3 className="text-xl font-semibold text-gray-300 mb-2">No posts yet</h3>
          <p className="text-sm mb-6">Create your first social media post to get started</p>
          <button
            onClick={openNewPost}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold transition-all"
          >
            Create Post
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => {
            const platformConf = PLATFORM_CONFIG[post.platform as keyof typeof PLATFORM_CONFIG];
            const statusConf = STATUS_CONFIG[post.status];
            return (
              <div
                key={post._id}
                className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/8 transition-all duration-300 overflow-hidden"
              >
                {post.imageUrl && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    {platformConf ? (
                      <span
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${platformConf.bg} ${platformConf.text} border ${platformConf.border}`}
                      >
                        {platformConf.icon}
                        {platformConf.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">{post.platform}</span>
                    )}
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${statusConf.color}`}
                    >
                      {statusConf.label}
                    </span>
                  </div>

                  <p className="text-sm text-gray-200 line-clamp-3 mb-3">{post.caption}</p>

                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.hashtags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-xs text-purple-400">
                          #{tag}
                        </span>
                      ))}
                      {post.hashtags.length > 3 && (
                        <span className="text-xs text-gray-500">+{post.hashtags.length - 3}</span>
                      )}
                    </div>
                  )}

                  {(post.scheduledAt || post.postedAt) && (
                    <p className="text-xs text-gray-500 mb-3">
                      {post.status === 'SCHEDULED'
                        ? `Scheduled: ${new Date(post.scheduledAt!).toLocaleString()}`
                        : post.status === 'POSTED'
                        ? `Posted: ${new Date(post.postedAt!).toLocaleString()}`
                        : ''}
                    </p>
                  )}

                  <div className="flex gap-2">
                    {post.status !== 'POSTED' && (
                      <button
                        onClick={() => handlePublish(post)}
                        disabled={publishing === post._id}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-500 hover:to-pink-500 text-white transition-all disabled:opacity-50"
                      >
                        {publishing === post._id ? 'Publishing...' : 'Publish'}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(post)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 text-gray-300 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post._id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Panel */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setPanelOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <div className="relative w-full max-w-lg max-h-[90vh] bg-[#0f0f1a] border border-white/10 rounded-2xl shadow-2xl overflow-y-auto pointer-events-auto">
            <div className="sticky top-0 bg-[#0f0f1a]/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingPost ? 'Edit Post' : 'Create Post'}
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Platforms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PLATFORM_CONFIG) as Array<keyof typeof PLATFORM_CONFIG>).map(
                    (platform) => {
                      const conf = PLATFORM_CONFIG[platform];
                      const selected = selectedPlatforms.includes(platform);
                      return (
                        <button
                          key={platform}
                          onClick={() => togglePlatform(platform)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
                            selected
                              ? `${conf.bg} ${conf.text} ${conf.border} shadow-lg`
                              : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {conf.icon}
                          {conf.label}
                          {selected && (
                            <svg className="w-3.5 h-3.5 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              {/* Caption */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300">Caption</label>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${caption.length > 2000 ? 'text-red-400' : 'text-gray-500'}`}>
                      {caption.length}/2200
                    </span>
                    <button
                      onClick={handleAICaption}
                      disabled={aiCaptionLoading}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-gradient-to-r from-violet-600/80 to-purple-600/80 hover:from-violet-500 hover:to-purple-500 text-white transition-all disabled:opacity-50"
                    >
                      {aiCaptionLoading ? (
                        <span className="animate-pulse">Generating...</span>
                      ) : (
                        <>
                          <span>✨</span> AI Caption
                        </>
                      )}
                    </button>
                  </div>
                </div>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 2200))}
                  placeholder="What do you want to share?"
                  rows={5}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 resize-none transition-all"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Image</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Paste image URL..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                  />
                  <button
                    onClick={() => router.push('/ai-image')}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600/80 to-purple-600/80 hover:from-indigo-500 hover:to-purple-500 text-white transition-all whitespace-nowrap"
                  >
                    <span>🎨</span> Generate
                  </button>
                </div>
                {imageUrl && (
                  <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                    <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                  </div>
                )}
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Hashtags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 text-xs"
                    >
                      #{tag}
                      <button
                        onClick={() => removeHashtag(tag)}
                        className="hover:text-white transition-colors ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  ref={hashtagInputRef}
                  type="text"
                  value={hashtagInput}
                  onChange={(e) => setHashtagInput(e.target.value)}
                  onKeyDown={handleHashtagKeyDown}
                  placeholder="Type # and press Enter to add tags"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all"
                />
              </div>

              {/* Schedule */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Schedule (optional)
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all [color-scheme:dark]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => handleSave(true)}
                  disabled={composerLoading || !caption.trim() || selectedPlatforms.length === 0}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all shadow-lg shadow-purple-900/40 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {composerLoading ? 'Publishing...' : 'Post Now'}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={composerLoading || !caption.trim() || selectedPlatforms.length === 0}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {scheduledAt ? 'Schedule' : 'Save Draft'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </>
      )}
    </div>
  );
}

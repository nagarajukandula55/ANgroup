'use client';

import { useState, useEffect, useCallback } from 'react';

type Tab = 'messaging' | 'social' | 'email';

interface TelegramConfig {
  botToken: string;
  chatIds: string[];
  notificationTriggers: string[];
}

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  recipients: string[];
  notificationTriggers: string[];
}

interface IntegrationData {
  isActive: boolean;
  config: Record<string, unknown>;
}

const NOTIFICATION_EVENTS = [
  { key: 'NEW_ORDER', label: 'New Order' },
  { key: 'LOW_STOCK', label: 'Low Stock' },
  { key: 'NEW_AGREEMENT', label: 'New Agreement' },
  { key: 'INVOICE_OVERDUE', label: 'Invoice Overdue' },
  { key: 'STAFF_ALERT', label: 'Staff Alert' },
];

function StatusBadge({ active, configured }: { active: boolean; configured: boolean }) {
  if (!configured) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-800/60 text-gray-400 border border-gray-700/50">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
        Not configured
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        active
          ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/50'
          : 'bg-red-900/40 text-red-400 border-red-700/50'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`}
      />
      {active ? 'Connected' : 'Disabled'}
    </span>
  );
}

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
        enabled ? 'bg-violet-600' : 'bg-gray-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function TagInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInput('');
    }
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-400 text-sm hover:bg-violet-600/30 transition-colors"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((val) => (
            <span
              key={val}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800/80 border border-gray-700/50 text-sm text-gray-300"
            >
              {val}
              <button
                type="button"
                onClick={() => remove(val)}
                className="text-gray-500 hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('messaging');
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatIds: [],
    notificationTriggers: [],
  });
  const [telegramConfigured, setTelegramConfigured] = useState(false);

  const [waEnabled, setWaEnabled] = useState(false);
  const [waConfig, setWaConfig] = useState<WhatsAppConfig>({
    phoneNumberId: '',
    accessToken: '',
    wabaId: '',
    recipients: [],
    notificationTriggers: [],
  });
  const [waConfigured, setWaConfigured] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch('/api/integrations');
      if (!res.ok) return;
      const { integrations } = await res.json();

      for (const integration of integrations as IntegrationData & { type: string }[]) {
        if (integration.type === 'TELEGRAM') {
          setTelegramEnabled(integration.isActive);
          setTelegramConfigured(true);
          const cfg = integration.config as Partial<TelegramConfig>;
          setTelegramConfig({
            botToken: cfg.botToken || '',
            chatIds: cfg.chatIds || [],
            notificationTriggers: cfg.notificationTriggers || [],
          });
        }
        if (integration.type === 'WHATSAPP') {
          setWaEnabled(integration.isActive);
          setWaConfigured(true);
          const cfg = integration.config as Partial<WhatsAppConfig>;
          setWaConfig({
            phoneNumberId: cfg.phoneNumberId || '',
            accessToken: cfg.accessToken || '',
            wabaId: cfg.wabaId || '',
            recipients: cfg.recipients || [],
            notificationTriggers: cfg.notificationTriggers || [],
          });
        }
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadIntegrations();
  }, [loadIntegrations]);

  const saveTelegram = async () => {
    setSaving('telegram');
    try {
      const res = await fetch('/api/integrations/TELEGRAM', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Telegram',
          config: telegramConfig,
          isActive: telegramEnabled,
        }),
      });
      if (res.status === 404) {
        const createRes = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'TELEGRAM',
            name: 'Telegram',
            config: telegramConfig,
            isActive: telegramEnabled,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to save');
      } else if (!res.ok) {
        throw new Error('Failed to save');
      }
      setTelegramConfigured(true);
      showToast('Telegram configuration saved', 'success');
    } catch {
      showToast('Failed to save Telegram config', 'error');
    } finally {
      setSaving(null);
    }
  };

  const testTelegram = async () => {
    setTesting('telegram');
    try {
      const res = await fetch('/api/integrations/telegram/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message from ANGroup ERP' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      const { summary } = data;
      showToast(
        `Telegram test: ${summary.success}/${summary.total} messages delivered`,
        summary.success > 0 ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test failed', 'error');
    } finally {
      setTesting(null);
    }
  };

  const saveWhatsApp = async () => {
    setSaving('whatsapp');
    try {
      const res = await fetch('/api/integrations/WHATSAPP', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'WhatsApp',
          config: waConfig,
          isActive: waEnabled,
        }),
      });
      if (res.status === 404) {
        const createRes = await fetch('/api/integrations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'WHATSAPP',
            name: 'WhatsApp',
            config: waConfig,
            isActive: waEnabled,
          }),
        });
        if (!createRes.ok) throw new Error('Failed to save');
      } else if (!res.ok) {
        throw new Error('Failed to save');
      }
      setWaConfigured(true);
      showToast('WhatsApp configuration saved', 'success');
    } catch {
      showToast('Failed to save WhatsApp config', 'error');
    } finally {
      setSaving(null);
    }
  };

  const testWhatsApp = async () => {
    setTesting('whatsapp');
    try {
      const res = await fetch('/api/integrations/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Test message from ANGroup ERP' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Test failed');
      const { summary } = data;
      showToast(
        `WhatsApp test: ${summary.success}/${summary.total} messages delivered`,
        summary.success > 0 ? 'success' : 'error'
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test failed', 'error');
    } finally {
      setTesting(null);
    }
  };

  const toggleTrigger = (
    key: string,
    triggers: string[],
    setConfig: (fn: (prev: TelegramConfig | WhatsAppConfig) => TelegramConfig | WhatsAppConfig) => void
  ) => {
    const next = triggers.includes(key)
      ? triggers.filter((t) => t !== key)
      : [...triggers, key];
    setConfig((prev) => ({ ...prev, notificationTriggers: next }));
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'messaging', label: 'Messaging', icon: '💬' },
    { id: 'social', label: 'Social Media', icon: '📱' },
    { id: 'email', label: 'Email', icon: '✉️' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-sm font-medium transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-emerald-900/80 border-emerald-700/60 text-emerald-300'
              : 'bg-red-900/80 border-red-700/60 text-red-300'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="mt-1 text-sm text-gray-400">
            Connect messaging platforms and social channels to receive real-time ERP notifications.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-gray-900/60 border border-gray-800/60 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Messaging Tab */}
        {activeTab === 'messaging' && (
          <div className="space-y-6">
            {/* Telegram Section */}
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/60 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-lg">
                    ✈️
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">Telegram</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Send notifications via Telegram Bot API
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge active={telegramEnabled} configured={telegramConfigured} />
                  <Toggle enabled={telegramEnabled} onChange={setTelegramEnabled} />
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Bot Token */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Bot Token
                  </label>
                  <input
                    type="text"
                    value={telegramConfig.botToken}
                    onChange={(e) =>
                      setTelegramConfig((p) => ({ ...p, botToken: e.target.value }))
                    }
                    placeholder="1234567890:ABCdefGhIJKlmnoPQRsTUVwxyz"
                    className="w-full bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 font-mono"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Obtain from @BotFather on Telegram
                  </p>
                </div>

                {/* Chat IDs */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Chat IDs / Channel IDs
                  </label>
                  <TagInput
                    values={telegramConfig.chatIds}
                    onChange={(chatIds) => setTelegramConfig((p) => ({ ...p, chatIds }))}
                    placeholder="Enter chat ID (e.g. -1001234567890)"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Add individual user IDs, group IDs, or channel IDs
                  </p>
                </div>

                {/* Notification Triggers */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Notification Triggers
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NOTIFICATION_EVENTS.map((ev) => {
                      const checked = telegramConfig.notificationTriggers.includes(ev.key);
                      return (
                        <label
                          key={ev.key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            checked
                              ? 'bg-violet-900/30 border-violet-600/50 text-violet-300'
                              : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              toggleTrigger(
                                ev.key,
                                telegramConfig.notificationTriggers,
                                setTelegramConfig as (fn: (prev: TelegramConfig | WhatsAppConfig) => TelegramConfig | WhatsAppConfig) => void
                              )
                            }
                          />
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked
                                ? 'bg-violet-600 border-violet-500'
                                : 'border-gray-600'
                            }`}
                          >
                            {checked && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 10 10"
                                fill="none"
                              >
                                <path
                                  d="M1.5 5L4 7.5L8.5 3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          {ev.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">
                    Leave all unchecked to receive all event types
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveTelegram}
                    disabled={saving === 'telegram'}
                    className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {saving === 'telegram' ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button
                    onClick={testTelegram}
                    disabled={testing === 'telegram' || !telegramConfigured}
                    className="px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 disabled:opacity-40 border border-gray-700/60 text-gray-300 text-sm font-medium transition-colors"
                  >
                    {testing === 'telegram' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>

            {/* WhatsApp Section */}
            <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/60 rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-lg">
                    📞
                  </div>
                  <div>
                    <h2 className="font-semibold text-white">WhatsApp Business</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Send notifications via WhatsApp Business API
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge active={waEnabled} configured={waConfigured} />
                  <Toggle enabled={waEnabled} onChange={setWaEnabled} />
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Phone Number ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={waConfig.phoneNumberId}
                      onChange={(e) =>
                        setWaConfig((p) => ({ ...p, phoneNumberId: e.target.value }))
                      }
                      placeholder="123456789012345"
                      className="w-full bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 font-mono"
                    />
                  </div>

                  {/* WABA ID */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                      WABA ID
                    </label>
                    <input
                      type="text"
                      value={waConfig.wabaId}
                      onChange={(e) =>
                        setWaConfig((p) => ({ ...p, wabaId: e.target.value }))
                      }
                      placeholder="WhatsApp Business Account ID"
                      className="w-full bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 font-mono"
                    />
                  </div>
                </div>

                {/* Access Token */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Access Token
                  </label>
                  <input
                    type="text"
                    value={waConfig.accessToken}
                    onChange={(e) =>
                      setWaConfig((p) => ({ ...p, accessToken: e.target.value }))
                    }
                    placeholder="EAAxxxxxxxxxx..."
                    className="w-full bg-gray-900/60 border border-gray-700/60 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/30 font-mono"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Permanent token from Meta Business Suite
                  </p>
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
                    Default Recipients
                  </label>
                  <TagInput
                    values={waConfig.recipients}
                    onChange={(recipients) => setWaConfig((p) => ({ ...p, recipients }))}
                    placeholder="Enter phone with country code (e.g. 971501234567)"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Include country code without + (e.g. 971501234567 for UAE)
                  </p>
                </div>

                {/* Notification Triggers */}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Notification Triggers
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NOTIFICATION_EVENTS.map((ev) => {
                      const checked = waConfig.notificationTriggers.includes(ev.key);
                      return (
                        <label
                          key={ev.key}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all text-sm ${
                            checked
                              ? 'bg-emerald-900/30 border-emerald-600/50 text-emerald-300'
                              : 'bg-gray-800/40 border-gray-700/40 text-gray-400 hover:border-gray-600/60'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() =>
                              toggleTrigger(
                                ev.key,
                                waConfig.notificationTriggers,
                                setWaConfig as (fn: (prev: TelegramConfig | WhatsAppConfig) => TelegramConfig | WhatsAppConfig) => void
                              )
                            }
                          />
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked
                                ? 'bg-emerald-600 border-emerald-500'
                                : 'border-gray-600'
                            }`}
                          >
                            {checked && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                viewBox="0 0 10 10"
                                fill="none"
                              >
                                <path
                                  d="M1.5 5L4 7.5L8.5 3"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                          </span>
                          {ev.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-1.5">
                    Leave all unchecked to receive all event types
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={saveWhatsApp}
                    disabled={saving === 'whatsapp'}
                    className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  >
                    {saving === 'whatsapp' ? 'Saving...' : 'Save Configuration'}
                  </button>
                  <button
                    onClick={testWhatsApp}
                    disabled={testing === 'whatsapp' || !waConfigured}
                    className="px-4 py-2 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 disabled:opacity-40 border border-gray-700/60 text-gray-300 text-sm font-medium transition-colors"
                  >
                    {testing === 'whatsapp' ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Routing Info */}
            <div className="bg-violet-950/30 border border-violet-800/30 rounded-2xl px-6 py-4">
              <h3 className="text-sm font-semibold text-violet-300 mb-1">
                Notification Routing
              </h3>
              <p className="text-xs text-violet-400/70 leading-relaxed">
                Other ERP modules (Orders, Inventory, Agreements, Invoices) use the{' '}
                <code className="bg-violet-900/40 px-1 py-0.5 rounded text-violet-300 font-mono text-xs">
                  /api/integrations/notify
                </code>{' '}
                endpoint to dispatch alerts. Enable the channels above and configure triggers
                to control which events are forwarded to each platform.
              </p>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/60 rounded-2xl px-6 py-10 text-center">
            <div className="text-4xl mb-3">📱</div>
            <h3 className="text-base font-semibold text-gray-300 mb-1">
              Social Media Integrations
            </h3>
            <p className="text-sm text-gray-500">
              Instagram, LinkedIn, Twitter / X, and Facebook integrations coming soon.
            </p>
          </div>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800/60 rounded-2xl px-6 py-10 text-center">
            <div className="text-4xl mb-3">✉️</div>
            <h3 className="text-base font-semibold text-gray-300 mb-1">
              Email Integration
            </h3>
            <p className="text-sm text-gray-500">
              SMTP and transactional email provider configuration coming soon.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

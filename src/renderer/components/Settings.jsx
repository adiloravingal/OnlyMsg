import React, { useState, useEffect, useCallback } from 'react';

const ALL_APPS = [
  { id: 'whatsapp',          label: 'WhatsApp',          color: '#25D366' },
  { id: 'whatsapp-business', label: 'WhatsApp Business', color: '#00A884' },
  { id: 'instagram',         label: 'Instagram',         color: '#E1306C' },
  { id: 'twitter',           label: 'Twitter / X',       color: '#000000' },
  { id: 'linkedin',          label: 'LinkedIn',          color: '#0A66C2' },
  { id: 'teams',             label: 'Microsoft Teams',   color: '#6264A7' },
  { id: 'classroom',         label: 'Google Classroom',  color: '#1A73E8' },
];

function formatTime(sec) {
  if (!sec || sec < 60) return sec ? `${sec}s` : '—';
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function dateRange(days) {
  const keys = [];
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

function sumTime(stats, appId, days) {
  return dateRange(days).reduce((acc, k) => acc + (stats[k]?.[appId] || 0), 0);
}

function totalTime(stats, days) {
  return dateRange(days).reduce((acc, k) => {
    return acc + Object.values(stats[k] || {}).reduce((a, b) => a + b, 0);
  }, 0);
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, border }) {
  return (
    <div style={{ borderTop: border }}>
      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3 mt-6" style={{ color: '#888' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Settings({ config, theme, onSave, onClose }) {
  const isDark  = theme === 'dark';
  const bg      = isDark ? '#161616' : '#f5f5f5';
  const card    = isDark ? '#1e1e1e' : '#fff';
  const border  = isDark ? '#2d2d2d' : '#e5e5e5';
  const text    = isDark ? '#f0f0f0' : '#111';
  const sub     = isDark ? '#888' : '#666';
  const accent  = '#3b82f6';

  const [nickname,    setNickname]    = useState(config.nickname || '');
  const [enabledApps, setEnabledApps] = useState(new Set(config.enabledApps || []));
  const [dataFolder,  setDataFolder]  = useState(config.dataFolder || '');
  const [stats,       setStats]       = useState({});
  const [statsPeriod, setStatsPeriod] = useState('today'); // 'today'|'week'|'month'|'all'
  const [updateState, setUpdateState] = useState(null); // null | 'checking' | result
  const [saved,       setSaved]       = useState(false);

  useEffect(() => {
    window.electronAPI.getTimeStats().then(setStats);
  }, []);

  const toggleApp = (id) => {
    setEnabledApps(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const handlePickFolder = async () => {
    const folder = await window.electronAPI.pickDataFolder();
    if (!folder) return;
    const oldDir = dataFolder || null;
    if (oldDir && oldDir !== folder) {
      await window.electronAPI.migrateDataFolder({ from: oldDir, to: folder });
    }
    setDataFolder(folder);
  };

  const handleSave = async () => {
    const newCfg = {
      ...config,
      nickname: nickname.trim() || config.nickname,
      enabledApps: [...enabledApps],
      dataFolder: dataFolder || null,
    };
    await onSave(newCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCheckUpdate = async () => {
    setUpdateState('checking');
    const result = await window.electronAPI.checkUpdate();
    setUpdateState(result);
  };

  // ── Time stats helpers ───────────────────────────────────────────────────────
  const periodDays = { today: 1, week: 7, month: 30, all: 3650 }[statsPeriod];
  const totalSec   = totalTime(stats, periodDays);

  const row = (bg, border, text, sub, card) => ({ bg, border, text, sub, card });

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: bg, color: text }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${border}`, background: card }}
      >
        <h2 className="text-base font-semibold">Settings</h2>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1 text-sm font-medium transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', color: text }}
        >
          ✕ Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-10">

        {/* ── Profile ── */}
        <Section title="Profile" border="none">
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: card, border: `1px solid ${border}` }}
          >
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: sub }}>Name</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ background: isDark ? '#2a2a2a' : '#f5f5f5', border: `1px solid ${border}`, color: text }}
                placeholder="Your name"
              />
            </div>
            <p className="text-xs" style={{ color: sub }}>
              Shows as <span className="font-semibold" style={{ color: text }}>{(nickname.trim() || config.nickname) || 'You'}'s OS</span> in the title bar.
            </p>
          </div>
        </Section>

        {/* ── Apps ── */}
        <Section title="Apps" border={`1px solid ${border}`}>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${border}` }}
          >
            {ALL_APPS.map((a, i) => {
              const on = enabledApps.has(a.id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3"
                  style={{
                    background: card,
                    borderTop: i > 0 ? `1px solid ${border}` : 'none',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <span className="text-sm font-medium">{a.label}</span>
                  </div>
                  {/* Toggle switch */}
                  <button
                    role="switch"
                    aria-checked={on}
                    onClick={() => toggleApp(a.id)}
                    className="relative flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
                    style={{ width: 40, height: 22 }}
                  >
                    <div
                      className="w-full h-full rounded-full transition-colors"
                      style={{ background: on ? accent : (isDark ? '#444' : '#ccc') }}
                    />
                    <div
                      className="absolute top-0.5 rounded-full bg-white transition-all"
                      style={{
                        width: 18, height: 18,
                        left: on ? 20 : 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                      }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── Data Storage ── */}
        <Section title="Data Storage" border={`1px solid ${border}`}>
          <div
            className="rounded-xl p-4 flex flex-col gap-3"
            style={{ background: card, border: `1px solid ${border}` }}
          >
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: sub }}>Storage Folder</p>
              <p className="text-xs font-mono break-all mb-2" style={{ color: text }}>
                {dataFolder || '~/Library/Application Support/OnlyMsg (default)'}
              </p>
              <button
                onClick={handlePickFolder}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', color: text, border: `1px solid ${border}` }}
              >
                Change Folder…
              </button>
            </div>
            <p className="text-xs" style={{ color: sub }}>
              Existing data (watched reels, time stats) is copied to the new folder automatically.
            </p>
          </div>
        </Section>

        {/* ── Time Spent ── */}
        <Section title="Time Spent" border={`1px solid ${border}`}>
          {/* Period tabs */}
          <div className="flex gap-1 mb-3">
            {[['today','Today'],['week','This Week'],['month','This Month'],['all','All Time']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatsPeriod(key)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  background: statsPeriod === key ? accent : (isDark ? '#2a2a2a' : '#ebebeb'),
                  color: statsPeriod === key ? '#fff' : sub,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${border}` }}
          >
            {/* Aggregate row */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: isDark ? '#252525' : '#fafafa', borderBottom: `1px solid ${border}` }}
            >
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: sub }}>Total</span>
              <span className="text-sm font-bold" style={{ color: text }}>{formatTime(totalSec)}</span>
            </div>

            {ALL_APPS.map((a, i) => {
              const sec     = sumTime(stats, a.id, periodDays);
              const pct     = totalSec > 0 ? (sec / totalSec) * 100 : 0;
              return (
                <div
                  key={a.id}
                  className="px-4 py-3"
                  style={{
                    background: card,
                    borderTop: i > 0 ? `1px solid ${border}` : 'none',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color }} />
                      <span className="text-sm">{a.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: text }}>{formatTime(sec)}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: isDark ? '#333' : '#eee' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, background: a.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: sub }}>
            Only counted when OnlyMsg window is focused and that app is active.
          </p>
        </Section>

        {/* ── Updates ── */}
        <Section title="Updates" border={`1px solid ${border}`}>
          <div
            className="rounded-xl p-4 flex items-center justify-between gap-4"
            style={{ background: card, border: `1px solid ${border}` }}
          >
            <div>
              {updateState === null && (
                <p className="text-sm" style={{ color: sub }}>Check for the latest version on GitHub.</p>
              )}
              {updateState === 'checking' && (
                <p className="text-sm" style={{ color: sub }}>Checking…</p>
              )}
              {updateState && updateState !== 'checking' && (
                <div>
                  <p className="text-sm font-medium" style={{ color: text }}>
                    Current: v{updateState.current}
                  </p>
                  {updateState.error && (
                    <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>Could not reach GitHub.</p>
                  )}
                  {!updateState.error && updateState.hasUpdate && (
                    <div className="mt-1">
                      <p className="text-xs" style={{ color: '#22c55e' }}>
                        Update available: v{updateState.latest}
                      </p>
                      <button
                        onClick={() => window.electronAPI.openUrl(updateState.url)}
                        className="mt-1.5 text-xs px-2 py-1 rounded-lg font-medium transition-opacity hover:opacity-70"
                        style={{ background: '#22c55e', color: '#fff' }}
                      >
                        Download Update
                      </button>
                    </div>
                  )}
                  {!updateState.error && !updateState.hasUpdate && (
                    <p className="text-xs mt-0.5" style={{ color: '#22c55e' }}>You're up to date ✓</p>
                  )}
                </div>
              )}
            </div>
            {(!updateState || updateState === 'checking') && (
              <button
                onClick={handleCheckUpdate}
                disabled={updateState === 'checking'}
                className="flex-shrink-0 text-sm px-4 py-2 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ background: accent }}
              >
                Check for Updates
              </button>
            )}
          </div>
        </Section>

        {/* ── Save ── */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ background: saved ? '#22c55e' : accent }}
          >
            {saved ? 'Saved ✓' : 'Save Changes'}
          </button>
        </div>

        {/* ── Credits ── */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: sub }}>
            Made with ♥ by{' '}
            <button
              onClick={() => window.electronAPI.openUrl('https://github.com/adiloravingal')}
              className="underline hover:opacity-70 outline-none"
              style={{ color: sub }}
            >
              Adil O
            </button>
          </p>
          <button
            onClick={() => window.electronAPI.openUrl('https://github.com/adiloravingal/OnlyMsg')}
            className="text-xs mt-0.5 underline hover:opacity-70 outline-none"
            style={{ color: sub }}
          >
            github.com/adiloravingal/OnlyMsg
          </button>
        </div>

      </div>
    </div>
  );
}

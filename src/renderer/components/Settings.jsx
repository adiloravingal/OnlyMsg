import React, { useState, useEffect, useRef } from 'react';

const ALL_APPS = [
  { id: 'whatsapp',          label: 'WhatsApp',          color: '#25D366' },
  { id: 'whatsapp-business', label: 'WhatsApp Business', color: '#00A884' },
  { id: 'instagram',         label: 'Instagram',         color: '#E1306C' },
  { id: 'twitter',           label: 'Twitter / X',       color: '#1D1D1D' },
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
    const d = new Date(); d.setDate(d.getDate() - i);
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

function Section({ title, children, topBorder }) {
  return (
    <div style={topBorder ? { borderTop: topBorder, paddingTop: 0 } : {}}>
      <h3 className="text-[10px] font-bold uppercase tracking-widest mb-3 mt-7"
          style={{ color: '#888', letterSpacing: '0.1em' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Key capture input ─────────────────────────────────────────────────────

function ShortcutInput({ value, onChange, accent, isDark, border }) {
  const [capturing, setCapturing] = useState(false);
  const ref = useRef(null);

  const handleKeyDown = (e) => {
    e.preventDefault();
    if (e.key === 'Escape') { setCapturing(false); return; }
    if (e.key === 'Backspace' || e.key === 'Delete') { onChange(''); setCapturing(false); return; }
    // Accept single alphanum key
    if (/^[a-zA-Z0-9]$/.test(e.key)) {
      onChange(e.key.toLowerCase());
      setCapturing(false);
    }
  };

  useEffect(() => {
    if (capturing) ref.current?.focus();
  }, [capturing]);

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs" style={{ color: '#888' }}>⌘</span>
      <button
        ref={ref}
        onKeyDown={capturing ? handleKeyDown : undefined}
        onBlur={() => setCapturing(false)}
        onClick={() => setCapturing(true)}
        className="rounded-md px-2 py-0.5 text-xs font-mono font-semibold outline-none transition-all"
        style={{
          minWidth: 28,
          background: capturing
            ? (isDark ? '#2a3a2a' : '#f0fff0')
            : (value ? (isDark ? '#2a2a2a' : '#f0f0f0') : (isDark ? '#1a1a1a' : '#f5f5f5')),
          border: `1px solid ${capturing ? accent : border}`,
          color:  value ? accent : '#888',
          boxShadow: capturing ? `0 0 0 2px ${accent}33` : 'none',
        }}
        title={capturing ? 'Press a key (Esc to cancel, ⌫ to clear)' : 'Click to set shortcut'}
      >
        {capturing ? '…' : (value ? value.toUpperCase() : '—')}
      </button>
    </div>
  );
}

// ─── Drag-to-reorder row ───────────────────────────────────────────────────

function DragRow({ app, index, onDrop, isDark, border, card, text, sub, extra }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5 transition-colors"
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', app.id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); onDrop(e.dataTransfer.getData('text/plain'), app.id); }}
      style={{
        background: dragOver ? (isDark ? '#2a2a2a' : '#f0f0f0') : card,
        borderTop: index > 0 ? `1px solid ${border}` : 'none',
        cursor: 'grab',
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={1.5} className="w-3.5 h-3.5 flex-shrink-0">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: app.color, flexShrink: 0 }} />
      <span className="text-sm flex-1" style={{ color: text }}>{app.label}</span>
      {extra}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const IS_DEV = typeof window !== 'undefined' && (
  window.location?.hostname === 'localhost' ||
  window.location?.port !== ''
);

export default function Settings({ config, theme, onSave, onClose }) {
  const isDark = theme === 'dark';
  const bg     = isDark ? '#111' : '#f4f4f4';
  const card   = isDark ? '#1c1c1c' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e8e8e8';
  const text   = isDark ? '#f0f0f0' : '#111';
  const sub    = isDark ? '#888' : '#666';
  const accent = '#3b82f6';

  // ── State ────────────────────────────────────────────────────────────────────
  const [nickname,        setNickname]        = useState(config.nickname || '');
  const [enabledApps,     setEnabledApps]     = useState(new Set(config.enabledApps || []));
  const [dataFolder,      setDataFolder]      = useState(config.dataFolder || '');
  const [stats,           setStats]           = useState({});
  const [statsPeriod,     setStatsPeriod]     = useState('today');
  const [updateState,     setUpdateState]     = useState(null);
  const [saved,           setSaved]           = useState(false);
  const [devResetDone,    setDevResetDone]    = useState(false);

  // New config fields
  const [appOrder,        setAppOrder]        = useState(() => {
    const order = config.appOrder || config.enabledApps || [];
    return ALL_APPS.filter(a => order.includes(a.id))
      .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  });
  const [customShortcuts, setCustomShortcuts] = useState(config.customShortcuts || {});
  const [appGroups,       setAppGroups]       = useState(config.appGroups || []);

  useEffect(() => { window.electronAPI.getTimeStats().then(setStats); }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────
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
    if (dataFolder && dataFolder !== folder)
      await window.electronAPI.migrateDataFolder({ from: dataFolder, to: folder });
    setDataFolder(folder);
  };

  const handleSave = async () => {
    const newCfg = {
      ...config,
      nickname:        nickname.trim() || config.nickname,
      enabledApps:     [...enabledApps],
      dataFolder:      dataFolder || null,
      appOrder:        appOrder.map(a => a.id),
      customShortcuts,
      appGroups,
    };
    await onSave(newCfg);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleCheckUpdate = async () => {
    setUpdateState('checking');
    setUpdateState(await window.electronAPI.checkUpdate());
  };

  const handleDevReset = async () => {
    const newCfg = { ...config, setupComplete: false };
    await window.electronAPI.saveConfig(newCfg);
    setDevResetDone(true);
    setTimeout(() => window.location.reload(), 800);
  };

  // ── App order drag-and-drop ──────────────────────────────────────────────────
  const handleOrderDrop = (fromId, toId) => {
    if (fromId === toId) return;
    setAppOrder(prev => {
      const arr = [...prev];
      const fi = arr.findIndex(a => a.id === fromId);
      const ti = arr.findIndex(a => a.id === toId);
      const [moved] = arr.splice(fi, 1);
      arr.splice(ti, 0, moved);
      return arr;
    });
  };

  // ── App groups ────────────────────────────────────────────────────────────────
  const addGroup = () => {
    setAppGroups(prev => [...prev, { id: Date.now().toString(), name: 'Group ' + (prev.length + 1), apps: [] }]);
  };
  const removeGroup = (id) => setAppGroups(prev => prev.filter(g => g.id !== id));
  const updateGroupName = (id, name) => setAppGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  const toggleGroupApp = (groupId, appId) => {
    setAppGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      const apps = g.apps.includes(appId) ? g.apps.filter(a => a !== appId) : [...g.apps, appId];
      return { ...g, apps };
    }));
  };

  // ── Time stats ───────────────────────────────────────────────────────────────
  const periodDays = { today: 1, week: 7, month: 30, all: 3650 }[statsPeriod];
  const totalSec   = totalTime(stats, periodDays);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: bg, color: text }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid ${border}`, background: card }}
      >
        <h2 className="text-base font-semibold tracking-tight">Settings</h2>
        <button
          onClick={onClose}
          className="rounded-lg px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 flex items-center gap-1.5"
          style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', color: text }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Close
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-12">

        {/* ── Profile ── */}
        <Section title="Profile">
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: card, border: `1px solid ${border}` }}>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: sub }}>Your name</label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{ background: isDark ? '#252525' : '#f7f7f7', border: `1px solid ${border}`, color: text }}
                placeholder="e.g. Adil"
              />
            </div>
            <p className="text-xs" style={{ color: sub }}>
              Title bar shows{' '}
              <span className="font-semibold" style={{ color: text }}>
                {(nickname.trim() || config.nickname || 'You')}'s OS
              </span>
            </p>
          </div>
        </Section>

        {/* ── Apps ── */}
        <Section title="Apps" topBorder={`1px solid ${border}`}>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {ALL_APPS.map((a, i) => {
              const on = enabledApps.has(a.id);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3 transition-colors"
                  style={{ background: card, borderTop: i > 0 ? `1px solid ${border}` : 'none' }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                    <span className="text-sm font-medium">{a.label}</span>
                  </div>
                  <button
                    role="switch" aria-checked={on}
                    onClick={() => toggleApp(a.id)}
                    className="relative flex-shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
                    style={{ width: 38, height: 21 }}
                  >
                    <div className="w-full h-full rounded-full transition-colors" style={{ background: on ? accent : (isDark ? '#3a3a3a' : '#d0d0d0') }} />
                    <div
                      className="absolute top-[2px] rounded-full bg-white transition-all"
                      style={{ width: 17, height: 17, left: on ? 19 : 2, boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── App Order ── */}
        <Section title="App Order" topBorder={`1px solid ${border}`}>
          <p className="text-xs mb-3" style={{ color: sub }}>Drag to reorder — ⌘1 through ⌘{appOrder.length} follow this order.</p>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {appOrder
              .filter(a => enabledApps.has(a.id))
              .map((a, i) => (
                <DragRow
                  key={a.id}
                  app={a}
                  index={i}
                  onDrop={handleOrderDrop}
                  isDark={isDark}
                  border={border}
                  card={card}
                  text={text}
                  sub={sub}
                  extra={
                    <span className="text-xs font-mono" style={{ color: sub }}>⌘{i + 1}</span>
                  }
                />
              ))}
          </div>
        </Section>

        {/* ── Custom Shortcuts ── */}
        <Section title="Custom Shortcuts" topBorder={`1px solid ${border}`}>
          <p className="text-xs mb-3" style={{ color: sub }}>
            Assign a letter shortcut to any app — e.g. ⌘W for WhatsApp.
            Click a key to change, ⌫ to clear.
          </p>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            {ALL_APPS.filter(a => enabledApps.has(a.id)).map((a, i) => (
              <div
                key={a.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ background: card, borderTop: i > 0 ? `1px solid ${border}` : 'none' }}
              >
                <div className="flex items-center gap-3">
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                  <span className="text-sm">{a.label}</span>
                </div>
                <ShortcutInput
                  value={customShortcuts[a.id] || ''}
                  onChange={key => setCustomShortcuts(prev => {
                    const n = { ...prev };
                    if (key) n[a.id] = key; else delete n[a.id];
                    return n;
                  })}
                  accent={a.color}
                  isDark={isDark}
                  border={border}
                />
              </div>
            ))}
          </div>
        </Section>

        {/* ── App Groups ── */}
        <Section title="App Groups" topBorder={`1px solid ${border}`}>
          <p className="text-xs mb-3" style={{ color: sub }}>
            Groups add visual dividers + labels in the sidebar.
          </p>
          <div className="flex flex-col gap-3">
            {appGroups.map(g => (
              <div key={g.id} className="rounded-xl p-4 flex flex-col gap-3" style={{ background: card, border: `1px solid ${border}` }}>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={g.name}
                    onChange={e => updateGroupName(g.id, e.target.value)}
                    className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{ background: isDark ? '#252525' : '#f7f7f7', border: `1px solid ${border}`, color: text }}
                    placeholder="Group name"
                  />
                  <button
                    onClick={() => removeGroup(g.id)}
                    className="p-1.5 rounded-lg transition-opacity hover:opacity-70 outline-none"
                    style={{ color: '#ef4444' }}
                    aria-label="Remove group"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_APPS.filter(a => enabledApps.has(a.id)).map(a => {
                    const inGroup = g.apps.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleGroupApp(g.id, a.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        style={{
                          background: inGroup ? `${a.color}22` : (isDark ? '#2a2a2a' : '#f0f0f0'),
                          border:     `1px solid ${inGroup ? a.color : 'transparent'}`,
                          color:      inGroup ? a.color : sub,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                        {a.label}
                        {inGroup && <span>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={addGroup}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: isDark ? '#252525' : '#f0f0f0', color: sub, border: `1px dashed ${border}` }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Group
            </button>
          </div>
        </Section>

        {/* ── Data Storage ── */}
        <Section title="Data Storage" topBorder={`1px solid ${border}`}>
          <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: card, border: `1px solid ${border}` }}>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: sub }}>Storage Folder</p>
              <p className="text-xs font-mono break-all mb-2" style={{ color: text }}>
                {dataFolder || '~/Library/Application Support/Oasis (default)'}
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
              Watched reels and time stats are copied to the new folder automatically.
            </p>
          </div>
        </Section>

        {/* ── Time Spent ── */}
        <Section title="Time Spent" topBorder={`1px solid ${border}`}>
          <div className="flex gap-1 mb-3">
            {[['today','Today'],['week','Week'],['month','Month'],['all','All Time']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatsPeriod(key)}
                className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  background: statsPeriod === key ? accent : (isDark ? '#252525' : '#e8e8e8'),
                  color:      statsPeriod === key ? '#fff' : sub,
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ background: isDark ? '#222' : '#fafafa', borderBottom: `1px solid ${border}` }}
            >
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sub }}>Total</span>
              <span className="text-sm font-bold" style={{ color: text }}>{formatTime(totalSec)}</span>
            </div>
            {ALL_APPS.map((a, i) => {
              const sec = sumTime(stats, a.id, periodDays);
              const pct = totalSec > 0 ? (sec / totalSec) * 100 : 0;
              return (
                <div key={a.id} className="px-4 py-3" style={{ background: card, borderTop: i > 0 ? `1px solid ${border}` : 'none' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.color }} />
                      <span className="text-sm">{a.label}</span>
                    </div>
                    <span className="text-sm font-semibold" style={{ color: text }}>{formatTime(sec)}</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: isDark ? '#2a2a2a' : '#eee' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: a.color }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: sub }}>
            Counted only while Oasis is focused and that app is active.
          </p>
        </Section>

        {/* ── Updates ── */}
        <Section title="Updates" topBorder={`1px solid ${border}`}>
          <div className="rounded-xl p-4 flex items-center justify-between gap-4" style={{ background: card, border: `1px solid ${border}` }}>
            <div>
              {!updateState && <p className="text-sm" style={{ color: sub }}>Check for the latest version on GitHub.</p>}
              {updateState === 'checking' && <p className="text-sm" style={{ color: sub }}>Checking…</p>}
              {updateState && updateState !== 'checking' && (
                <div>
                  <p className="text-sm font-medium" style={{ color: text }}>Current: v{updateState.current}</p>
                  {updateState.error && <p className="text-xs mt-0.5" style={{ color: '#ef4444' }}>Could not reach GitHub.</p>}
                  {!updateState.error && updateState.hasUpdate && (
                    <div className="mt-1">
                      <p className="text-xs" style={{ color: '#22c55e' }}>Update available: v{updateState.latest}</p>
                      <button
                        onClick={() => window.electronAPI.openUrl(updateState.url)}
                        className="mt-1.5 text-xs px-3 py-1 rounded-lg font-semibold transition-opacity hover:opacity-80"
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
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>

        {/* ── Credits ── */}
        <div className="mt-8 text-center">
          <p className="text-xs" style={{ color: sub }}>
            Made with ♥ by{' '}
            <button onClick={() => window.electronAPI.openUrl('https://github.com/adiloravingal')}
              className="underline hover:opacity-70 outline-none" style={{ color: sub }}>Adil O</button>
          </p>
          <button onClick={() => window.electronAPI.openUrl('https://github.com/adiloravingal/OnlyMsg')}
            className="text-xs mt-0.5 underline hover:opacity-70 outline-none" style={{ color: sub }}>
            github.com/adiloravingal/Oasis
          </button>
        </div>

        {/* ── Dev Tools (only in dev) ── */}
        {IS_DEV && (
          <Section title="Developer" topBorder={`1px solid ${border}`}>
            <div
              className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: card, border: `1px solid #f59e0b44` }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>Reset Setup Wizard</p>
                <p className="text-xs mt-0.5" style={{ color: sub }}>
                  Clears setup state — sessions and logins are preserved.
                </p>
              </div>
              <button
                onClick={handleDevReset}
                disabled={devResetDone}
                className="flex-shrink-0 text-xs px-4 py-2 rounded-xl font-semibold text-white transition-opacity disabled:opacity-50 outline-none"
                style={{ background: devResetDone ? '#22c55e' : '#f59e0b' }}
              >
                {devResetDone ? 'Done ✓' : 'Reset'}
              </button>
            </div>
          </Section>
        )}

      </div>
    </div>
  );
}

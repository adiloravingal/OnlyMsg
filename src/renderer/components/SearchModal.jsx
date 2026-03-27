import React, { useState, useEffect, useRef, useMemo } from 'react';

const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#000000',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

const APP_LABELS = {
  'whatsapp': 'WhatsApp', 'whatsapp-business': 'WhatsApp Business',
  'instagram': 'Instagram', 'twitter': 'Twitter / X',
  'linkedin': 'LinkedIn', 'teams': 'Microsoft Teams', 'classroom': 'Google Classroom',
};

export default function SearchModal({ apps, conversations, theme, onSelectApp, onSelectConv, onClose }) {
  const [query, setCursor_query] = useState('');
  const [cursor, setCursor]      = useState(0);
  const inputRef = useRef(null);
  const isDark   = theme === 'dark';

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim().toLowerCase();

  const appResults = useMemo(() =>
    apps.filter(a => !q || a.label.toLowerCase().includes(q)),
    [apps, q]
  );

  const convResults = useMemo(() => {
    if (!q) return [];
    return Object.entries(conversations).flatMap(([appId, convs]) =>
      convs
        .filter(c => c.name.toLowerCase().includes(q))
        .map(c => ({ ...c, appId, appLabel: APP_LABELS[appId] || appId }))
    ).slice(0, 12);
  }, [conversations, q]);

  const total = appResults.length + convResults.length;

  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, total - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') {
      if (cursor < appResults.length) onSelectApp(appResults[cursor].id);
      else onSelectConv(convResults[cursor - appResults.length]);
      onClose();
    }
  };

  useEffect(() => { setCursor(0); }, [q]);

  const bg     = isDark ? '#1e1e1e' : '#fff';
  const border = isDark ? '#2d2d2d' : '#e5e5e5';
  const text   = isDark ? '#f0f0f0' : '#111';
  const sub    = isDark ? '#888' : '#999';
  const hover  = isDark ? '#2a2a2a' : '#f5f5f5';
  const active = isDark ? '#333' : '#eff6ff';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '15vh', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 540, background: bg, border: `1px solid ${border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: `1px solid ${border}` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={2} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setCursor_query(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search apps or conversations…"
            className="flex-1 bg-transparent py-4 text-sm outline-none"
            style={{ color: text }}
          />
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: isDark ? '#333' : '#f0f0f0', color: sub, border: `1px solid ${border}` }}
          >
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="py-2 max-h-80 overflow-y-auto">
          {/* Apps */}
          {appResults.length > 0 && (
            <>
              <p className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: sub }}>Apps</p>
              {appResults.map((app, i) => (
                <button
                  key={app.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => { onSelectApp(app.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{ background: cursor === i ? active : 'transparent', color: text }}
                >
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENTS[app.id] || '#888', flexShrink: 0 }} />
                  <span className="text-sm">{app.label}</span>
                  {cursor === i && (
                    <span className="ml-auto text-xs" style={{ color: sub }}>↵ open</span>
                  )}
                </button>
              ))}
            </>
          )}

          {/* Conversations */}
          {convResults.length > 0 && (
            <>
              <p className="px-4 py-1 mt-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: sub }}>Conversations</p>
              {convResults.map((c, i) => {
                const idx = appResults.length + i;
                return (
                  <button
                    key={`${c.appId}-${c.name}`}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => { onSelectConv(c); onClose(); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ background: cursor === idx ? active : 'transparent', color: text }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: ACCENTS[c.appId] || '#888', flexShrink: 0 }} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">{c.name}</span>
                      <span className="text-xs" style={{ color: sub }}>{c.appLabel}</span>
                    </div>
                    {cursor === idx && (
                      <span className="text-xs" style={{ color: sub }}>↵ open</span>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {total === 0 && (
            <div className="py-10 text-center">
              <p className="text-sm" style={{ color: sub }}>
                {q ? `No results for "${query}"` : 'Start typing to search'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

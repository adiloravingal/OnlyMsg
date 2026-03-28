import React, { useState, useEffect, useRef, useMemo } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#1D1D1D',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

const APP_LABELS = {
  'whatsapp':          'WhatsApp',
  'whatsapp-business': 'WhatsApp Business',
  'instagram':         'Instagram',
  'twitter':           'Twitter / X',
  'linkedin':          'LinkedIn',
  'teams':             'Microsoft Teams',
  'classroom':         'Google Classroom',
};

const TYPE_META = {
  dm:      { label: 'DM',      color: '#3b82f6' },
  group:   { label: 'Group',   color: '#8b5cf6' },
  channel: { label: 'Channel', color: '#f59e0b' },
  class:   { label: 'Class',   color: '#10b981' },
  thread:  { label: 'Thread',  color: '#6366f1' },
};

// ─── NLP scorer ───────────────────────────────────────────────────────────────
// Returns 0 = no match, 1-100 = match quality.
// Handles: exact, prefix, contains, acronym ("OS"→"Operating System"),
//          word-prefix ("op sys"→"Operating System"), fuzzy subsequence.

// Simple, predictable match scoring — like browser Ctrl+F but with extras.
// Returns 0 = no match, higher = better.
function scoreMatch(query, target) {
  if (!query || !target) return 0;
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  if (!q) return 0;

  if (t === q)          return 100;  // exact
  if (t.startsWith(q))  return 90;   // starts with
  if (t.includes(q))    return 80;   // ← core: substring, like PDF find

  // Split on word boundaries for word-level checks
  const tWords = t.split(/[\s\-_./|:,]+/).filter(Boolean);
  const qWords = q.split(/\s+/).filter(Boolean);

  // Acronym: "os" → "Operating System" (initials match)
  const initials = tWords.map(w => w[0] || '').join('');
  if (initials === q)              return 78;
  if (initials.startsWith(q))     return 68;

  // Every query word is a prefix of some target word: "op sys" → "operating system"
  if (qWords.every(qw => tWords.some(tw => tw.startsWith(qw)))) return 65;

  // Any target word contains the whole query
  if (tWords.some(tw => tw.includes(q))) return 60;

  return 0;
}

// Filter and sort items by match score
function rankItems(query, items) {
  if (!query.trim()) return items;
  return items
    .map(i => ({ ...i, _score: scoreMatch(query, i.name) }))
    .filter(i => i._score > 0)
    .sort((a, b) => b._score - a._score);
}

// ─── Highlight matched chars ──────────────────────────────────────────────────
// Returns array of { text, bold } segments so we can render matched chars bold.

function highlightMatch(query, target) {
  if (!query.trim()) return [{ text: target, bold: false }];
  const q = query.toLowerCase().trim();
  const t = target.toLowerCase();

  // Try simple substring highlight first
  const idx = t.indexOf(q);
  if (idx !== -1) {
    return [
      { text: target.slice(0, idx),           bold: false },
      { text: target.slice(idx, idx + q.length), bold: true  },
      { text: target.slice(idx + q.length),   bold: false },
    ].filter(s => s.text);
  }

  // Fuzzy: highlight individual matched chars
  const result = [];
  let qi = 0;
  let buf = ''; let bufBold = false;
  for (let ti = 0; ti < target.length; ti++) {
    const matched = qi < q.length && t[ti] === q[qi];
    if (matched) qi++;
    const bold = matched;
    if (bold !== bufBold) {
      if (buf) result.push({ text: buf, bold: bufBold });
      buf = ''; bufBold = bold;
    }
    buf += target[ti];
  }
  if (buf) result.push({ text: buf, bold: bufBold });
  return result;
}

function Highlighted({ segments, color }) {
  return (
    <>
      {segments.map((s, i) =>
        s.bold
          ? <mark key={i} style={{ background: 'transparent', color, fontWeight: 700 }}>{s.text}</mark>
          : <span key={i}>{s.text}</span>
      )}
    </>
  );
}

// ─── Type badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const meta = TYPE_META[type];
  if (!meta) return null;
  return (
    <span
      className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded-md"
      style={{ background: `${meta.color}22`, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SearchModal({ apps, conversations, theme, onSelectApp, onSelectConv, onClose }) {
  const [query,  setQuery]  = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef    = useRef(null);
  const listRef     = useRef(null);
  const isDark      = theme === 'dark';

  useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.trim();

  // ── Score + rank apps ──────────────────────────────────────────────────────
  // Apps use .label; rankItems expects .name — normalise here
  const appResults = useMemo(() =>
    rankItems(q, apps.map(a => ({ ...a, name: a.label }))),
    [apps, q]
  );

  // ── Score + rank conversations across all apps ─────────────────────────────
  // conversations = { appId: [{ name, type?, subtitle? }] }
  const convResults = useMemo(() => {
    const flat = Object.entries(conversations).flatMap(([appId, convs]) =>
      (convs || []).map(c => ({
        ...c,
        appId,
        appLabel: APP_LABELS[appId] || appId,
        accent:   ACCENTS[appId]    || '#888',
      }))
    );
    if (!q) return flat.slice(0, 8); // show recents when no query
    return rankItems(q, flat).slice(0, 20);
  }, [conversations, q]);

  const total = appResults.length + convResults.length;

  // Keep cursor in bounds when results change
  useEffect(() => { setCursor(0); }, [q]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const handleKey = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, total - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') {
      if (total === 0) return;
      if (cursor < appResults.length) onSelectApp(appResults[cursor].id);
      else onSelectConv(convResults[cursor - appResults.length]);
      onClose();
    }
  };

  const hasConversations = Object.values(conversations).some(c => c?.length > 0);

  // ── Colour tokens ────────────────────────────────────────────────────────────
  const bg     = isDark ? '#1c1c1c' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text   = isDark ? '#f0f0f0' : '#111';
  const sub    = isDark ? '#777' : '#999';
  const active = isDark ? '#2a2a2a' : '#f0f6ff';
  const activeL= isDark ? '#333'   : '#e0ecff';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '12vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 560, background: bg, border: `1px solid ${border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Search input ── */}
        <div className="flex items-center gap-3 px-4" style={{ borderBottom: `1px solid ${border}` }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={2.2} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search apps and contacts across all platforms…"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none"
            style={{ color: text }}
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono flex-shrink-0"
            style={{ background: isDark ? '#333' : '#f0f0f0', color: sub, border: `1px solid ${border}` }}
          >esc</kbd>
        </div>

        {/* ── Results list ── */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-1.5">

          {/* Apps section */}
          {appResults.length > 0 && (
            <>
              <SectionLabel text="Apps" sub={sub} />
              {appResults.map((app, i) => {
                const isActive = cursor === i;
                const segs = highlightMatch(q, app.label);
                return (
                  <ResultRow
                    key={app.id}
                    isActive={isActive}
                    active={active} activeL={activeL} text={text} sub={sub}
                    onMouseEnter={() => setCursor(i)}
                    onClick={() => { onSelectApp(app.id); onClose(); }}
                  >
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: ACCENTS[app.id] || '#888',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    <span className="text-sm flex-1 truncate" style={{ color: text }}>
                      <Highlighted segments={segs} color={ACCENTS[app.id] || '#3b82f6'} />
                    </span>
                    {isActive && <span className="text-[10px] flex-shrink-0" style={{ color: sub }}>↵ open</span>}
                  </ResultRow>
                );
              })}
            </>
          )}

          {/* Contacts section */}
          {convResults.length > 0 && (
            <>
              <SectionLabel
                text={q ? 'Contacts' : 'Recent'}
                sub={sub}
                hint={!hasConversations ? '— open apps to load' : ''}
              />
              {convResults.map((c, i) => {
                const idx = appResults.length + i;
                const isActive = cursor === idx;
                const segs = highlightMatch(q, c.name);
                return (
                  <ResultRow
                    key={`${c.appId}-${c.name}-${i}`}
                    isActive={isActive}
                    active={active} activeL={activeL} text={text} sub={sub}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => { onSelectConv(c); onClose(); }}
                  >
                    {/* App colour dot */}
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: `${c.accent}22`,
                      border: `1.5px solid ${c.accent}55`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: c.accent, fontWeight: 700,
                    }}>
                      {c.name?.[0]?.toUpperCase() || '?'}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-sm truncate" style={{ color: text }}>
                          <Highlighted segments={segs} color={c.accent} />
                        </span>
                        <TypeBadge type={c.type} />
                      </div>
                      <span className="text-[11px] block" style={{ color: sub }}>{c.appLabel}</span>
                    </div>
                    {isActive && <span className="text-[10px] flex-shrink-0" style={{ color: sub }}>↵ open</span>}
                  </ResultRow>
                );
              })}
            </>
          )}

          {/* Empty states */}
          {total === 0 && q && (
            <div className="py-10 text-center px-6">
              <div className="text-3xl mb-3 opacity-40">🔍</div>
              <p className="text-sm font-medium" style={{ color: text }}>No results for "{query}"</p>
              <p className="text-xs mt-1" style={{ color: sub }}>
                Try initials — e.g. "os" matches "Operating System"
              </p>
            </div>
          )}

          {total === 0 && !q && (
            <div className="py-8 text-center px-6">
              <p className="text-sm" style={{ color: sub }}>
                Search contacts, groups, channels and classes across all your apps
              </p>
              {!hasConversations && (
                <p className="text-xs mt-2 leading-relaxed" style={{ color: sub, opacity: 0.7 }}>
                  To load contacts: click each app in the sidebar and let it fully open at least once.
                  Contacts are indexed automatically — no extra setup needed.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer hint ── */}
        <div
          className="flex items-center gap-4 px-4 py-2"
          style={{ borderTop: `1px solid ${border}` }}
        >
          {[['↑↓', 'navigate'], ['↵', 'open'], ['esc', 'close']].map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 text-[10px]" style={{ color: sub }}>
              <kbd
                className="px-1.5 py-0.5 rounded font-mono text-[9px]"
                style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', border: `1px solid ${border}` }}
              >{k}</kbd>
              {v}
            </span>
          ))}
          {hasConversations && (
            <span className="ml-auto text-[10px]" style={{ color: sub }}>
              {Object.values(conversations).reduce((a, c) => a + (c?.length || 0), 0)} contacts indexed
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ text, sub, hint }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-2 pb-1">
      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: sub }}>
        {text}
      </span>
      {hint && <span className="text-[9px]" style={{ color: sub }}>{hint}</span>}
    </div>
  );
}

function ResultRow({ children, isActive, active, activeL, text, sub, onMouseEnter, onClick }) {
  return (
    <button
      data-active={isActive}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
      style={{
        background: isActive ? active : 'transparent',
        borderLeft: isActive ? `2px solid #3b82f6` : '2px solid transparent',
      }}
    >
      {children}
    </button>
  );
}

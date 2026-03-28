import React, { useState, useEffect, useRef } from 'react';

// Detect what kind of content this is
function detectType(text) {
  if (!text) return 'text';
  if (/^https?:\/\/\S+$/.test(text.trim()))                           return 'url';
  if (/^[\w._%+\-]+@[\w.\-]+\.[a-zA-Z]{2,}$/.test(text.trim()))     return 'email';
  if (/\n/.test(text) || text.length > 120)                           return 'code';
  if (/^\d[\d\s\-+().]{6,}$/.test(text.trim()))                      return 'phone';
  return 'text';
}

const TYPE_ICON = {
  url:   { label: 'URL',   color: '#3b82f6', icon: '🔗' },
  email: { label: 'Email', color: '#8b5cf6', icon: '✉' },
  code:  { label: 'Text',  color: '#6b7280', icon: '📝' },
  phone: { label: 'Phone', color: '#10b981', icon: '📞' },
  text:  { label: 'Text',  color: '#6b7280', icon: '📋' },
};

export default function ClipboardHistory({ history, theme, onRemove, onClearAll, onClose }) {
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [query,     setQuery]     = useState('');
  const inputRef = useRef(null);
  const isDark = theme === 'dark';

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); }
  };

  const handleCopy = (text, idx) => {
    window.electronAPI.clipboardWrite(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1600);
  };

  const filtered = query.trim()
    ? history.filter(h => h.text.toLowerCase().includes(query.toLowerCase()))
    : history;

  const bg     = isDark ? '#1c1c1c' : '#fff';
  const border = isDark ? '#2a2a2a' : '#e5e5e5';
  const text   = isDark ? '#f0f0f0' : '#111';
  const sub    = isDark ? '#777'    : '#999';
  const hover  = isDark ? '#252525' : '#f7f7f7';
  const card   = isDark ? '#222'    : '#fafafa';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '10vh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 500, background: bg, border: `1px solid ${border}` }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={2} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-semibold flex-1" style={{ color: text }}>Clipboard History</span>
          <span className="text-[10px] font-mono" style={{ color: sub }}>{history.length}/20</span>
          {history.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-[10px] px-2 py-0.5 rounded hover:opacity-70 transition-opacity outline-none"
              style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)' }}
              title="Clear all"
            >
              Clear all
            </button>
          )}
          <kbd
            className="text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: isDark ? '#333' : '#f0f0f0', color: sub, border: `1px solid ${border}` }}
          >esc</kbd>
        </div>

        {/* Search within clipboard */}
        {history.length > 4 && (
          <div
            className="flex items-center gap-2 px-4 py-2"
            style={{ borderBottom: `1px solid ${border}` }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter clipboard…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: text }}
            />
          </div>
        )}

        {/* Clipboard items */}
        <div className="max-h-[420px] overflow-y-auto">
          {filtered.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-3xl mb-3 opacity-30">📋</div>
              <p className="text-sm" style={{ color: sub }}>
                {history.length === 0 ? 'Nothing copied yet' : 'No matches'}
              </p>
              <p className="text-xs mt-1 opacity-60" style={{ color: sub }}>
                {history.length === 0 ? 'Copies will appear here automatically' : ''}
              </p>
            </div>
          )}

          {filtered.map((item, i) => {
            const type    = detectType(item.text);
            const meta    = TYPE_ICON[type];
            const isCopied = copiedIdx === i;
            const preview = item.text.length > 200
              ? item.text.slice(0, 200) + '…'
              : item.text;
            const isMultiline = item.text.includes('\n');

            return (
              <div
                key={item.id}
                className="group relative flex items-stretch"
                style={{
                  borderTop:   i > 0 ? `1px solid ${border}` : 'none',
                  borderLeft:  isCopied ? `3px solid ${meta.color}` : '3px solid transparent',
                  background:  isCopied ? `${meta.color}18` : 'transparent',
                  transition:  'background 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => { if (!isCopied) e.currentTarget.style.background = hover; }}
                onMouseLeave={e => { if (!isCopied) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Click-to-copy area */}
                <button
                  onClick={() => handleCopy(item.text, i)}
                  className="flex-1 text-left px-4 py-3 outline-none"
                  style={{ background: 'transparent' }}
                  title="Click to copy"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-base flex-shrink-0 mt-0.5 select-none" title={meta.label}>
                      {meta.icon}
                    </span>

                    <div className="flex-1 min-w-0">
                      {isMultiline ? (
                        <pre
                          className="text-xs whitespace-pre-wrap font-mono leading-relaxed"
                          style={{
                            color: text, background: card,
                            padding: '6px 8px', borderRadius: 6,
                            border: `1px solid ${border}`,
                            maxHeight: 80, overflow: 'hidden',
                          }}
                        >{preview}</pre>
                      ) : (
                        <p className="text-sm truncate" style={{ color: text }}>{preview}</p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded"
                          style={{ background: `${meta.color}22`, color: meta.color }}
                        >{meta.label}</span>
                        <span className="text-[10px]" style={{ color: sub }}>{item.text.length} chars</span>
                        <span className="text-[10px]" style={{ color: sub }}>{item.relTime}</span>
                      </div>
                    </div>

                    {isCopied && (
                      <span className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold" style={{ color: meta.color }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Copied
                      </span>
                    )}
                  </div>
                </button>

                {/* Remove button — visible on row hover */}
                <button
                  onClick={e => { e.stopPropagation(); onRemove(item.id); }}
                  className="flex-shrink-0 flex items-center justify-center w-8 opacity-0 group-hover:opacity-100 transition-opacity outline-none"
                  style={{ color: isDark ? '#666' : '#bbb' }}
                  title="Remove"
                  aria-label="Remove from clipboard history"
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = isDark ? '#666' : '#bbb'; }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ borderTop: `1px solid ${border}` }}
          >
            <span className="text-[10px]" style={{ color: sub }}>Click any item to copy it</span>
            <span className="text-[10px]" style={{ color: sub }}>⌘⇧V to open</span>
          </div>
        )}
      </div>
    </div>
  );
}

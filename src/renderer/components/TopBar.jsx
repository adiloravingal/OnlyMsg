import React from 'react';

const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#1D1D1D',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

export default function TopBar({ app, title, theme, showSettings, onBack, onForward, onReload }) {
  const isDark  = theme === 'dark';
  const bg      = isDark ? '#161616' : '#f5f5f5';
  const border  = isDark ? '#232323' : '#ddd';
  const textCol = isDark ? '#e0e0e0' : '#222';
  const subCol  = isDark ? '#555' : '#bbb';
  const accent  = app ? (ACCENTS[app.id] || '#888') : '#3b82f6';

  const navBtn = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: 8,
    width: 28,
    height: 28,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: subCol,
    flexShrink: 0,
    transition: 'background 0.1s ease, color 0.1s ease',
  };

  return (
    <div
      className="drag-region flex items-center select-none"
      style={{
        height: 44,
        background: bg,
        borderBottom: `1px solid ${border}`,
        paddingLeft: 8,
        paddingRight: 16,
        gap: 4,
        flexShrink: 0,
      }}
      role="toolbar"
      aria-label="Navigation"
    >
      {/* Left: nav buttons */}
      <div className="no-drag flex items-center gap-0.5">
        <button
          onClick={onBack}
          style={navBtn}
          aria-label="Go back"
          title="Back (⌘[)"
          className="hover:bg-black/8 dark:hover:bg-white/8 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <button
          onClick={onForward}
          style={navBtn}
          aria-label="Go forward"
          title="Forward (⌘])"
          className="hover:bg-black/8 dark:hover:bg-white/8 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        <button
          onClick={onReload}
          style={navBtn}
          aria-label="Reload"
          title="Reload (⌘R)"
          className="hover:bg-black/8 dark:hover:bg-white/8 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      </div>

      {/* Center: context title */}
      <div className="flex-1 flex items-center justify-center gap-2 pointer-events-none overflow-hidden">
        {showSettings ? (
          /* Settings mode indicator */
          <svg viewBox="0 0 24 24" fill="none" stroke={subCol} strokeWidth={2} className="w-3.5 h-3.5 flex-shrink-0" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ) : app ? (
          /* App accent dot */
          <span
            style={{
              width: 7, height: 7,
              borderRadius: '50%',
              background: accent,
              flexShrink: 0,
              boxShadow: `0 0 6px ${accent}88`,
            }}
            aria-hidden
          />
        ) : null}

        <span
          className="text-sm font-medium truncate"
          style={{ color: textCol, maxWidth: 220, letterSpacing: '-0.01em' }}
        >
          {title || (app?.label ?? '')}
        </span>
      </div>

      {/* Right: spacer to balance layout */}
      <div style={{ width: 88, flexShrink: 0 }} />
    </div>
  );
}

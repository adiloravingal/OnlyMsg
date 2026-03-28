import React, { useState, useRef } from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────

const ICONS = {
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  'whatsapp-business': (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M20.625 5.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25zm2.625 1.25h-5.25a2.625 2.625 0 00-2.625 2.625V15.5a.875.875 0 00.875.875h.875v4.375a1.75 1.75 0 003.5 0V16.375h.875A.875.875 0 0022.375 15.5V9.375A2.625 2.625 0 0019.75 6.75h-.125zM14.375 6.75H8.5A4.375 4.375 0 004.125 11.125v8.75a.875.875 0 00.875.875h.875v2.625a.875.875 0 001.75 0V20.75h3.5v2.625a.875.875 0 001.75 0V20.75h.875a.875.875 0 00.875-.875v-8.75A4.375 4.375 0 0010.25 6.75zM9.375 5.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z"/>
    </svg>
  ),
  classroom: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[22px] h-[22px]">
      <path d="M11.976 0C5.364 0 0 5.364 0 11.976c0 6.613 5.364 11.977 11.976 11.977 6.613 0 11.977-5.364 11.977-11.977C23.953 5.364 18.589 0 11.976 0zm4.358 16.987H7.62a.527.527 0 01-.528-.528V7.494a.527.527 0 01.528-.527h8.714a.527.527 0 01.528.527v8.965a.527.527 0 01-.528.528zM9.227 9.843v4.267h5.5V9.843h-5.5z"/>
    </svg>
  ),
};

const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#1D1D1D',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function Tooltip({ isDark, label, shortcut }) {
  return (
    <div
      role="tooltip"
      className="absolute left-[58px] top-1/2 -translate-y-1/2 z-50 flex items-center gap-2
                 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium pointer-events-none shadow-xl"
      style={{
        background: isDark ? '#2a2a2a' : '#111',
        color: '#fff',
        border: `1px solid ${isDark ? '#3a3a3a' : 'transparent'}`,
      }}
    >
      {/* Arrow */}
      <span
        className="absolute right-full top-1/2 -translate-y-1/2"
        style={{
          width: 0, height: 0,
          borderTop: '5px solid transparent',
          borderBottom: '5px solid transparent',
          borderRight: `5px solid ${isDark ? '#2a2a2a' : '#111'}`,
        }}
      />
      {label}
      {shortcut && (
        <span
          className="font-mono opacity-50 text-[10px] px-1 rounded"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          {shortcut}
        </span>
      )}
    </div>
  );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({
  apps, activeId, badges, theme, showSettings, appGroups,
  onSelect, onOpenSettings, onOpenSearch, onOpenClipboard, onReorder,
}) {
  const [tooltip,  setTooltip]  = useState(null);
  const [dragId,   setDragId]   = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dropPos,  setDropPos]  = useState('before'); // 'before' | 'after'
  const isDark = theme === 'dark';

  // ── Drag-to-reorder ──────────────────────────────────────────────────────────
  const handleDragStart = (e, appId) => {
    setDragId(appId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image so icon doesn't double
    const ghost = document.createElement('div');
    ghost.style.cssText = 'width:1px;height:1px;opacity:0;position:fixed;top:-100px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  };

  const handleDragOver = (e, appId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropPos(e.clientY < midY ? 'before' : 'after');
    setDragOver(appId);
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) { setDragId(null); setDragOver(null); return; }
    const fromIdx = apps.findIndex(a => a.id === dragId);
    const toIdx   = apps.findIndex(a => a.id === targetId);
    const newApps = [...apps];
    const [moved] = newApps.splice(fromIdx, 1);
    const insertAt = dropPos === 'after' ? (fromIdx < toIdx ? toIdx : toIdx + 1) : (fromIdx < toIdx ? toIdx - 1 : toIdx);
    newApps.splice(Math.max(0, insertAt), 0, moved);
    onReorder?.(newApps);
    setDragId(null);
    setDragOver(null);
  };

  const handleDragEnd = () => { setDragId(null); setDragOver(null); };

  // ── Group labels ─────────────────────────────────────────────────────────────
  // Build a map: appId → groupName
  const groupMap = {};
  (appGroups || []).forEach(g => g.apps?.forEach(id => { groupMap[id] = g.name; }));

  // Build render list with group separators injected
  const renderItems = [];
  let lastGroup = '__NONE__';
  apps.forEach((app, idx) => {
    const grp = groupMap[app.id] ?? null;
    if (grp !== null && grp !== lastGroup) {
      renderItems.push({ type: 'group', name: grp, key: `grp-${grp}` });
      lastGroup = grp;
    } else if (grp === null && lastGroup !== '__NONE__') {
      lastGroup = '__NONE__';
    }
    renderItems.push({ type: 'app', app, idx });
  });

  // ── Colour tokens ────────────────────────────────────────────────────────────
  const bg     = isDark ? '#171717' : '#ebebeb';
  const border = isDark ? '#232323' : '#d4d4d4';
  const muted  = isDark ? '#454545' : '#b4b4b4';

  const utilBtn = (active, hovered) => ({
    width: 40, height: 40,
    borderRadius: 12,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color:      active  ? '#3b82f6' : (hovered ? (isDark ? '#ccc' : '#444') : muted),
    background: active  ? (isDark ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)')
              : hovered ? (isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)')
              : 'transparent',
    transition: 'background 0.12s ease, color 0.12s ease',
    cursor: 'pointer',
    flexShrink: 0,
  });

  return (
    <aside
      className="flex flex-col items-center select-none"
      style={{ width: 64, minWidth: 64, background: bg, borderRight: `1px solid ${border}` }}
      role="navigation"
      aria-label="Apps"
    >
      {/* ── Top: search (hidden) ─────────────────────────────────────── */}
      <div className="pt-10 pb-1" />

      {/* Divider */}
      <div style={{ width: 30, height: 1, background: border, margin: '6px 0 4px', flexShrink: 0 }} />

      {/* ── App list ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center w-full overflow-y-auto overflow-x-hidden py-1">
        {renderItems.map(item => {
          if (item.type === 'group') {
            return (
              <div
                key={item.key}
                className="w-full flex flex-col items-center"
                style={{ marginTop: 6, marginBottom: 2 }}
              >
                {item.name && (
                  <span
                    className="text-[8px] font-bold uppercase tracking-widest truncate px-1"
                    style={{ color: muted, maxWidth: 52 }}
                  >
                    {item.name}
                  </span>
                )}
                <div style={{ width: 28, height: 1, background: border, marginTop: 3 }} />
              </div>
            );
          }

          const { app, idx } = item;
          const isActive   = app.id === activeId;
          const badgeCount = badges[app.id] || 0;
          const accent     = ACCENTS[app.id] || '#888';
          const isDragging = dragId === app.id;
          const isOver     = dragOver === app.id && dragId !== app.id;

          return (
            <div
              key={app.id}
              className="relative w-full flex justify-center"
              style={{
                opacity:    isDragging ? 0.3 : 1,
                transition: 'opacity 0.15s',
                paddingTop: 1,
                paddingBottom: 1,
              }}
              draggable
              onDragStart={e => handleDragStart(e, app.id)}
              onDragOver={e  => handleDragOver(e, app.id)}
              onDrop={e      => handleDrop(e, app.id)}
              onDragEnd={handleDragEnd}
            >
              {/* Drop indicator */}
              {isOver && dropPos === 'before' && (
                <div className="drop-indicator" style={{ top: 0 }} />
              )}
              {isOver && dropPos === 'after' && (
                <div className="drop-indicator" style={{ bottom: 0 }} />
              )}

              <button
                className="sidebar-btn no-drag relative flex items-center justify-center rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  width: 44, height: 44,
                  background:  isActive ? accent : (tooltip === app.id ? `${accent}18` : 'transparent'),
                  color:       isActive ? '#fff' : accent,
                  boxShadow:   isActive ? `0 2px 14px ${accent}4d` : 'none',
                  cursor:      'pointer',
                }}
                onClick={() => onSelect(app.id)}
                onMouseEnter={() => setTooltip(app.id)}
                onMouseLeave={() => setTooltip(null)}
                aria-label={`${app.label}${badgeCount ? ` · ${badgeCount} unread` : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {ICONS[app.id]}

                {/* WhatsApp Business mini badge */}
                {app.id === 'whatsapp-business' && (
                  <span
                    className="absolute bottom-0.5 right-0.5 text-[7px] font-extrabold leading-none rounded px-[3px] py-px"
                    style={{
                      background: isActive ? 'rgba(255,255,255,0.25)' : '#00A884',
                      color: '#fff',
                    }}
                    aria-hidden
                  >B</span>
                )}

                {/* Unread badge */}
                {badgeCount > 0 && (
                  <span
                    className="om-badge absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-bold"
                    style={{
                      background: '#3b82f6',
                      minWidth: 17, height: 17,
                      fontSize: 9, padding: '0 3px',
                      lineHeight: '17px',
                      boxShadow: '0 1px 6px rgba(59,130,246,0.55)',
                    }}
                    aria-live="polite"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </button>

              {/* Tooltip */}
              {tooltip === app.id && (
                <Tooltip isDark={isDark} label={app.label} shortcut={`⌘${idx + 1}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom: compose + settings ────────────────────────────────── */}
      <div className="flex flex-col items-center gap-1 pb-4 flex-shrink-0">
        <div style={{ width: 30, height: 1, background: border, margin: '4px 0 4px' }} />

        {/* Clipboard History */}
        <div className="relative flex justify-center w-full">
          <button
            className="sidebar-btn no-drag outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            style={utilBtn(false, tooltip === '__clipboard__')}
            onClick={onOpenClipboard}
            onMouseEnter={() => setTooltip('__clipboard__')}
            onMouseLeave={() => setTooltip(null)}
            aria-label="Clipboard History (⌘⇧V)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          {tooltip === '__clipboard__' && <Tooltip isDark={isDark} label="Clipboard History" shortcut="⌘⇧V" />}
        </div>

        {/* Settings */}
        <div className="relative flex justify-center w-full">
          <button
            className="sidebar-btn no-drag outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
            style={utilBtn(showSettings, tooltip === '__settings__')}
            onClick={onOpenSettings}
            onMouseEnter={() => setTooltip('__settings__')}
            onMouseLeave={() => setTooltip(null)}
            aria-label={showSettings ? 'Close Settings' : 'Open Settings'}
            aria-pressed={showSettings}
          >
            {showSettings ? (
              /* X when settings open — gives closure (Norman: feedback + mapping) */
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          {tooltip === '__settings__' && (
            <Tooltip isDark={isDark} label={showSettings ? 'Close Settings' : 'Settings'} />
          )}
        </div>
      </div>
    </aside>
  );
}

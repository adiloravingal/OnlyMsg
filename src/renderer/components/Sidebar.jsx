import React, { useState } from 'react';

// SVG icons for each service
const ICONS = {
  whatsapp: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  'whatsapp-business': (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  ),
  teams: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M20.625 5.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25zm2.625 1.25h-5.25a2.625 2.625 0 00-2.625 2.625V15.5a.875.875 0 00.875.875h.875v4.375a1.75 1.75 0 003.5 0V16.375h.875A.875.875 0 0022.375 15.5V9.375A2.625 2.625 0 0019.75 6.75h-.125zM14.375 6.75H8.5A4.375 4.375 0 004.125 11.125v8.75a.875.875 0 00.875.875h.875v2.625a.875.875 0 001.75 0V20.75h3.5v2.625a.875.875 0 001.75 0V20.75h.875a.875.875 0 00.875-.875v-8.75A4.375 4.375 0 0010.25 6.75zM9.375 5.5a2.625 2.625 0 100-5.25 2.625 2.625 0 000 5.25z"/>
    </svg>
  ),
  classroom: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
      <path d="M11.976 0C5.364 0 0 5.364 0 11.976c0 6.613 5.364 11.977 11.976 11.977 6.613 0 11.977-5.364 11.977-11.977C23.953 5.364 18.589 0 11.976 0zm4.358 16.987H7.62a.527.527 0 01-.528-.528V7.494a.527.527 0 01.528-.527h8.714a.527.527 0 01.528.527v8.965a.527.527 0 01-.528.528zM9.227 9.843v4.267h5.5V9.843h-5.5z"/>
    </svg>
  ),
};

// Color accent per app
const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#000000',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

export default function Sidebar({ apps, activeId, badges, theme, onSelect }) {
  const [tooltip, setTooltip] = useState(null);
  const isDark = theme === 'dark';

  return (
    <aside
      className="flex flex-col items-center gap-1 pt-14 pb-4 select-none"
      style={{
        width: 64,
        minWidth: 64,
        background: isDark ? '#1e1e1e' : '#f0f0f0',
        borderRight: `1px solid ${isDark ? '#2d2d2d' : '#d0d0d0'}`,
      }}
      role="navigation"
      aria-label="Apps"
    >
      {apps.map((app, idx) => {
        const isActive = app.id === activeId;
        const badgeCount = badges[app.id] || 0;
        const accent = ACCENTS[app.id] || '#888';

        return (
          <div key={app.id} className="relative w-full flex justify-center">
            <button
              onClick={() => onSelect(app.id)}
              onMouseEnter={() => setTooltip(app.id)}
              onMouseLeave={() => setTooltip(null)}
              title={app.label}
              aria-label={`${app.label}${badgeCount ? ` (${badgeCount} unread)` : ''}`}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex items-center justify-center rounded-xl transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                width: 44,
                height: 44,
                background: isActive ? accent : 'transparent',
                color: isActive ? '#fff' : (isDark ? '#aaa' : '#555'),
                boxShadow: isActive ? `0 2px 8px ${accent}55` : 'none',
              }}
            >
              {/* App-specific coloring when not active */}
              <span style={{ color: isActive ? '#fff' : accent }}>
                {ICONS[app.id]}
              </span>

              {/* WhatsApp Business badge to differentiate */}
              {app.id === 'whatsapp-business' && (
                <span
                  className="absolute bottom-0.5 right-0.5 text-[8px] font-bold leading-none bg-[#00A884] text-white rounded px-0.5"
                  aria-hidden="true"
                >
                  B
                </span>
              )}

              {/* Unread badge */}
              {badgeCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white font-semibold"
                  style={{
                    background: '#3b82f6',
                    minWidth: 16,
                    height: 16,
                    fontSize: 10,
                    padding: '0 3px',
                    lineHeight: '16px',
                  }}
                  aria-live="polite"
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </button>

            {/* Keyboard shortcut hint on tooltip */}
            {tooltip === app.id && (
              <div
                role="tooltip"
                className="absolute left-[56px] top-1/2 -translate-y-1/2 z-50 whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium pointer-events-none shadow-lg"
                style={{
                  background: isDark ? '#3a3a3a' : '#1a1a1a',
                  color: '#fff',
                }}
              >
                {app.label}
                <span className="ml-2 opacity-50">⌘{idx + 1}</span>
              </div>
            )}
          </div>
        );
      })}
    </aside>
  );
}

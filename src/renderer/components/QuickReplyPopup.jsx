import React, { useState, useEffect, useRef } from 'react';

const ACCENTS = {
  'whatsapp':          '#25D366',
  'whatsapp-business': '#00A884',
  'instagram':         '#E1306C',
  'twitter':           '#000000',
  'linkedin':          '#0A66C2',
  'teams':             '#6264A7',
  'classroom':         '#1A73E8',
};

export default function QuickReplyPopup({ apps, theme, onSend, onClose }) {
  const [selectedApp, setSelectedApp] = useState(apps[0]?.id || '');
  const [message,     setMessage]     = useState('');
  const textRef = useRef(null);
  const isDark  = theme === 'dark';

  useEffect(() => { textRef.current?.focus(); }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim() || !selectedApp) return;
    onSend({ appId: selectedApp, message: message.trim() });
    onClose();
  };

  const bg     = isDark ? '#1e1e1e' : '#fff';
  const border = isDark ? '#2d2d2d' : '#e5e5e5';
  const text   = isDark ? '#f0f0f0' : '#111';
  const sub    = isDark ? '#888' : '#999';
  const pill   = isDark ? '#2a2a2a' : '#f5f5f5';

  const accent = ACCENTS[selectedApp] || '#3b82f6';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{ paddingTop: '18vh', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden shadow-2xl"
        style={{ maxWidth: 460, background: bg, border: `1px solid ${border}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke={sub} strokeWidth={2} className="w-4 h-4 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
          <span className="text-sm font-medium flex-1" style={{ color: text }}>Quick Reply</span>
          <kbd
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: isDark ? '#333' : '#f0f0f0', color: sub, border: `1px solid ${border}` }}
          >
            esc
          </kbd>
        </div>

        {/* App selector */}
        <div
          className="flex flex-wrap gap-1.5 px-4 py-3"
          style={{ borderBottom: `1px solid ${border}` }}
        >
          {apps.map(app => {
            const ac  = ACCENTS[app.id] || '#888';
            const sel = selectedApp === app.id;
            return (
              <button
                key={app.id}
                onClick={() => setSelectedApp(app.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                style={{
                  background: sel ? `${ac}22` : pill,
                  border:     `1px solid ${sel ? ac : 'transparent'}`,
                  color:      sel ? ac : sub,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: ac, flexShrink: 0 }} />
                {app.label}
              </button>
            );
          })}
        </div>

        {/* Message textarea */}
        <div className="px-4 pt-3 pb-2">
          <textarea
            ref={textRef}
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            rows={3}
            className="w-full bg-transparent text-sm outline-none resize-none"
            style={{ color: text, opacity: 1 }}
          />
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderTop: `1px solid ${border}` }}
        >
          <span className="text-xs" style={{ color: sub }}>⌘↵ to send</span>
          <button
            onClick={handleSend}
            disabled={!message.trim()}
            className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ background: accent }}
          >
            Send →
          </button>
        </div>
      </div>
    </div>
  );
}

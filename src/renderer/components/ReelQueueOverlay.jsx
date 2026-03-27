import React, { useState, useEffect, useRef } from 'react';

/**
 * Overlay that appears when viewing a reel sent by a friend in DMs.
 *
 * Props:
 *   currentIndex  {number}   position in frozenQueue (0-based), -1 if reel not in queue
 *   total         {number}   total unread reels in frozenQueue
 *   hasPrev       {boolean}
 *   hasNext       {boolean}
 *   theme         {string}   'dark' | 'light'
 *   isSending     {boolean}  reply is in flight
 *   onPrev        {fn}
 *   onNext        {fn}
 *   onClose       {fn}       exits queue mode → returns to DM conversation
 *   onReply       {fn(text)} sends reply text
 */
export default function ReelQueueOverlay({
  currentIndex,
  total,
  hasPrev,
  hasNext,
  theme,
  isSending,
  onPrev,
  onNext,
  onClose,
  onReply,
}) {
  const [replyText, setReplyText] = useState('');
  const textareaRef = useRef(null);
  const isDark = theme === 'dark';

  // Auto-focus textarea when overlay mounts
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Keyboard: Escape → close, ArrowLeft/Right → prev/next
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape')      { e.preventDefault(); onClose(); }
      if (e.key === 'ArrowLeft')   { e.preventDefault(); if (hasPrev) onPrev(); }
      if (e.key === 'ArrowRight')  { e.preventDefault(); if (hasNext) onNext(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hasPrev, hasNext, onPrev, onNext, onClose]);

  const handleSend = () => {
    const text = replyText.trim();
    if (!text || isSending) return;
    onReply(text);
    setReplyText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const bg      = isDark ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)';
  const border  = isDark ? '#2d2d2d' : '#e0e0e0';
  const text    = isDark ? '#f0f0f0' : '#111';
  const subtext = isDark ? '#999' : '#666';
  const inputBg = isDark ? '#2a2a2a' : '#f5f5f5';
  const btnActive = '#E1306C'; // Instagram accent

  const inQueue = currentIndex >= 0;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col"
      style={{
        background: bg,
        borderTop: `1px solid ${border}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
      role="region"
      aria-label="Reel queue controls"
    >
      {/* ── Navigation bar ── */}
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Prev */}
        <button
          onClick={onPrev}
          disabled={!hasPrev}
          aria-label="Previous unread reel"
          className="flex items-center justify-center rounded-full w-8 h-8 transition-opacity disabled:opacity-25 hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          style={{ color: text }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        {/* Position label */}
        <div className="flex-1 text-center">
          {inQueue ? (
            <span className="text-xs font-semibold" style={{ color: text }}>
              Reel{' '}
              <span style={{ color: btnActive }}>{currentIndex + 1}</span>
              {' '}of{' '}
              <span style={{ color: btnActive }}>{total}</span>
              {' '}unread
            </span>
          ) : (
            <span className="text-xs" style={{ color: subtext }}>
              Viewing reel
            </span>
          )}
        </div>

        {/* Next */}
        <button
          onClick={onNext}
          disabled={!hasNext}
          aria-label="Next unread reel"
          className="flex items-center justify-center rounded-full w-8 h-8 transition-opacity disabled:opacity-25 hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          style={{ color: text }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 20, background: border, margin: '0 4px' }} aria-hidden />

        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Exit reel queue, return to conversation"
          className="flex items-center justify-center rounded-full w-8 h-8 transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          style={{ color: subtext }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Reply bar ── */}
      <div
        className="flex items-end gap-2 px-4 pb-3"
        style={{ borderTop: `1px solid ${border}` }}
      >
        <textarea
          ref={textareaRef}
          value={replyText}
          onChange={e => setReplyText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Reply to this reel…"
          rows={1}
          aria-label="Reply message"
          className="flex-1 resize-none rounded-2xl px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-pink-500 transition-all"
          style={{
            background: inputBg,
            color: text,
            border: `1px solid ${border}`,
            maxHeight: 96,
            lineHeight: '1.4',
            overflow: 'auto',
          }}
          // Auto-grow
          onInput={e => {
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!replyText.trim() || isSending}
          aria-label="Send reply"
          className="flex items-center justify-center rounded-full w-9 h-9 flex-shrink-0 transition-opacity disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          style={{ background: btnActive, color: '#fff' }}
        >
          {isSending ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ transform: 'translateX(1px)' }}>
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

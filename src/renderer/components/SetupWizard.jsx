import React, { useState } from 'react';

const ALL_APPS = [
  { id: 'whatsapp',          label: 'WhatsApp',          color: '#25D366' },
  { id: 'whatsapp-business', label: 'WhatsApp Business', color: '#00A884' },
  { id: 'instagram',         label: 'Instagram',         color: '#E1306C' },
  { id: 'twitter',           label: 'Twitter / X',       color: '#000000' },
  { id: 'linkedin',          label: 'LinkedIn',          color: '#0A66C2' },
  { id: 'teams',             label: 'Microsoft Teams',   color: '#6264A7' },
  { id: 'classroom',         label: 'Google Classroom',  color: '#1A73E8' },
];

export default function SetupWizard({ theme, onComplete }) {
  const [step,     setStep]     = useState(0); // 0=welcome, 1=apps, 2=loading
  const [nickname, setNickname] = useState('');
  const [enabled,  setEnabled]  = useState(new Set(ALL_APPS.map(a => a.id)));

  const isDark  = theme === 'dark';
  const bg      = isDark ? '#111' : '#f9f9f9';
  const card    = isDark ? '#1e1e1e' : '#fff';
  const border  = isDark ? '#2d2d2d' : '#e5e5e5';
  const text    = isDark ? '#f0f0f0' : '#111';
  const sub     = isDark ? '#888' : '#666';
  const accent  = '#3b82f6';

  const toggleApp = (id) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size > 1) next.delete(id); } // keep at least 1
      else next.add(id);
      return next;
    });
  };

  const handleDone = async () => {
    setStep(2);
    const name = nickname.trim() || 'You';
    const cfg = {
      setupComplete: true,
      nickname: name,
      enabledApps: [...enabled],
      dataFolder: null,
    };
    await window.electronAPI.saveConfig(cfg);
    // Small delay so webviews can warm up in background
    setTimeout(() => onComplete(cfg), 1800);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: bg }}
    >
      {/* Step 0 — Welcome + name */}
      {step === 0 && (
        <div
          className="flex flex-col items-center gap-6 rounded-2xl p-10 shadow-xl"
          style={{ background: card, border: `1px solid ${border}`, width: 420 }}
        >
          <div className="text-5xl" aria-hidden>💬</div>
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: text }}>Welcome to OnlyMsg</h1>
            <p className="mt-1 text-sm" style={{ color: sub }}>Your personal messaging hub. Let's get you set up.</p>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium mb-1" style={{ color: sub }}>
              What's your name?
            </label>
            <input
              autoFocus
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nickname.trim() && setStep(1)}
              placeholder="e.g. Adil"
              className="w-full rounded-xl px-4 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{
                background: isDark ? '#2a2a2a' : '#f5f5f5',
                border: `1px solid ${border}`,
                color: text,
              }}
            />
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!nickname.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-30 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            style={{ background: accent }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* Step 1 — Choose apps */}
      {step === 1 && (
        <div
          className="flex flex-col gap-6 rounded-2xl p-10 shadow-xl"
          style={{ background: card, border: `1px solid ${border}`, width: 460 }}
        >
          <div>
            <h2 className="text-xl font-bold" style={{ color: text }}>
              Hi {nickname.trim()}! Pick your apps
            </h2>
            <p className="mt-1 text-sm" style={{ color: sub }}>You can change this later in Settings.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ALL_APPS.map(a => {
              const on = enabled.has(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleApp(a.id)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  style={{
                    background: on ? (isDark ? '#1a2a1a' : '#f0fdf4') : (isDark ? '#2a2a2a' : '#f5f5f5'),
                    border: `2px solid ${on ? a.color : 'transparent'}`,
                    color: text,
                  }}
                  aria-pressed={on}
                >
                  <span
                    style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: on ? a.color : (isDark ? '#444' : '#ccc'),
                      flexShrink: 0,
                    }}
                  />
                  <span className="text-sm font-medium truncate">{a.label}</span>
                  {on && <span className="ml-auto text-xs" style={{ color: a.color }}>✓</span>}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-70 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: isDark ? '#2a2a2a' : '#f0f0f0', color: text }}
            >
              ← Back
            </button>
            <button
              onClick={handleDone}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              style={{ background: accent }}
            >
              Get Started →
            </button>
          </div>
        </div>
      )}

      {/* Step 2 — Loading */}
      {step === 2 && (
        <div className="flex flex-col items-center gap-6" style={{ color: text }}>
          <div className="text-5xl" aria-hidden>✨</div>
          <div className="text-center">
            <h2 className="text-2xl font-bold">{nickname.trim()}'s OS</h2>
            <p className="mt-2 text-sm" style={{ color: sub }}>Loading your apps…</p>
          </div>
          <div className="flex gap-1.5 mt-2">
            {[0,1,2].map(i => (
              <div
                key={i}
                className="rounded-full animate-bounce"
                style={{
                  width: 8, height: 8,
                  background: accent,
                  animationDelay: `${i * 0.15}s`,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

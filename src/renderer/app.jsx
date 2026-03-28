import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar          from './components/Sidebar';
import WebViewPane      from './components/WebViewPane';
import TopBar           from './components/TopBar';
import SetupWizard      from './components/SetupWizard';
import Settings         from './components/Settings';
import SearchModal      from './components/SearchModal';
import ClipboardHistory from './components/ClipboardHistory';

// Sort apps by a saved order array
function applyOrder(apps, order) {
  if (!order?.length) return apps;
  return [...apps].sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
}

// Relative time string for clipboard items
function relTime(ts) {
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60)        return 'just now';
  if (sec < 3600)      return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)     return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

const MAX_CLIPBOARD = 20;

export default function App() {
  const [apps,           setApps]           = useState([]);
  const [config,         setConfig]         = useState(null);
  const [activeId,       setActiveId]       = useState(null);
  const [theme,          setTheme]          = useState('light');
  const [badges,         setBadges]         = useState({});
  const [showSettings,   setShowSettings]   = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showClipboard,  setShowClipboard]  = useState(false);

  // Persist contacts in localStorage so search works immediately on next launch
  // Bump CONV_VER to bust stale cache (e.g. when scraper logic changes)
  const CONV_VER = 'v3';
  const [conversations, setConversations] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('om-conversations') || '{}');
      if (stored.__ver !== CONV_VER) return {};
      const { __ver, ...contacts } = stored;  // __ver stays out of state
      return contacts;
    } catch { return {}; }
  });

  // Clipboard history: [{ id, text, ts, relTime }]
  const [clipHistory, setClipHistory] = useState([]);
  const lastClipRef = useRef('');

  // pendingReply kept for any future use (removed quick reply UI but logic stays)
  const [pendingReply, setPendingReply] = useState(null);

  // Topbar webview controls
  const webviewControls = useRef({ back: null, forward: null, reload: null });

  // ── Time tracking ───────────────────────────────────────────────────────────
  const sessionStartRef  = useRef(null);
  const windowFocusedRef = useRef(true);
  const activeIdRef      = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const flushSession = useCallback(() => {
    if (!sessionStartRef.current || !windowFocusedRef.current) return;
    const seconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    if (seconds > 0 && activeIdRef.current)
      window.electronAPI.trackTime({ appId: activeIdRef.current, seconds });
    sessionStartRef.current = null;
  }, []);

  const startSession = useCallback(() => { sessionStartRef.current = Date.now(); }, []);

  useEffect(() => {
    if (!activeId) return;
    flushSession();
    if (windowFocusedRef.current) startSession();
  }, [activeId]);

  useEffect(() => {
    const onFocus = () => { windowFocusedRef.current = true;  startSession(); };
    const onBlur  = () => { windowFocusedRef.current = false; flushSession(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur',  onBlur);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('blur', onBlur); };
  }, [flushSession, startSession]);

  useEffect(() => {
    const id = setInterval(() => { flushSession(); if (windowFocusedRef.current) startSession(); }, 30_000);
    return () => clearInterval(id);
  }, [flushSession, startSession]);

  // ── Boot ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [cfg, allApps, currentTheme] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.getApps(),
        window.electronAPI.getTheme(),
      ]);
      setConfig(cfg);
      setTheme(currentTheme);
      const enabled = allApps.filter(a => cfg.enabledApps?.includes(a.id));
      const ordered = applyOrder(enabled.length ? enabled : allApps, cfg.appOrder);
      setApps(ordered);
      setActiveId(ordered[0]?.id ?? null);
    })();
    window.electronAPI.onThemeChange(t => setTheme(t));
  }, []);

  // ── Clipboard polling (every 800ms) ──────────────────────────────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const text = await window.electronAPI.clipboardRead();
        if (!text || text === lastClipRef.current) return;
        lastClipRef.current = text;
        setClipHistory(prev => {
          // deduplicate: remove existing entry with same text
          const filtered = prev.filter(h => h.text !== text);
          const entry = { id: Date.now(), text, ts: Date.now(), relTime: 'just now' };
          return [entry, ...filtered].slice(0, MAX_CLIPBOARD);
        });
      } catch {}
    };

    // Also refresh relative times every 30s
    const relTimeTick = setInterval(() => {
      setClipHistory(prev => prev.map(h => ({ ...h, relTime: relTime(h.ts) })));
    }, 30_000);

    const clipTick = setInterval(poll, 800);
    poll(); // immediate first read
    return () => { clearInterval(clipTick); clearInterval(relTimeTick); };
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.metaKey) return;

      // ⌘K → search (hidden for now)
      // if ((e.key === 'k' || e.key === 'K') && !e.shiftKey) {
      //   e.preventDefault(); setShowSearch(s => !s); return;
      // }
      // ⌘⇧V → clipboard history
      if ((e.key === 'v' || e.key === 'V') && e.shiftKey) {
        e.preventDefault(); setShowClipboard(s => !s); return;
      }
      // ⌘1-9 → app by position
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= apps.length) {
        e.preventDefault(); setActiveId(apps[num - 1].id); setShowSettings(false); return;
      }
      // Custom letter shortcuts
      const customShortcuts = config?.customShortcuts || {};
      for (const [appId, key] of Object.entries(customShortcuts)) {
        if (e.key.toLowerCase() === key.toLowerCase() && !e.shiftKey) {
          const app = apps.find(a => a.id === appId);
          if (app) { e.preventDefault(); setActiveId(appId); setShowSettings(false); return; }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [apps, config]);

  // ── Dock badge ───────────────────────────────────────────────────────────────
  useEffect(() => {
    window.electronAPI.setBadge(Object.values(badges).reduce((a, b) => a + b, 0));
  }, [badges]);

  const handleBadge = useCallback((appId, count) => {
    setBadges(prev => ({ ...prev, [appId]: count }));
  }, []);

  // Contacts persisted to localStorage for instant search on next open
  const handleConversations = useCallback((appId, convs) => {
    // Filter out any garbage (URLs, very long strings) before storing
    const clean = convs.filter(c =>
      c?.name && c.name.length >= 2 && c.name.length <= 80 &&
      !c.name.startsWith('http') && !c.name.startsWith('*')
    );
    if (!clean.length) return;
    setConversations(prev => {
      const next = { ...prev, [appId]: clean };
      try { localStorage.setItem('om-conversations', JSON.stringify({ ...next, __ver: CONV_VER })); } catch {}
      return next;  // __ver never enters state
    });
  }, []);

  const registerControls = useCallback((controls) => {
    webviewControls.current = controls;
  }, []);

  // ── Config save ──────────────────────────────────────────────────────────────
  const handleSaveConfig = useCallback(async (newCfg) => {
    await window.electronAPI.saveConfig(newCfg);
    setConfig(newCfg);
    const allApps = await window.electronAPI.getApps();
    const enabled = allApps.filter(a => newCfg.enabledApps?.includes(a.id));
    const ordered = applyOrder(enabled.length ? enabled : allApps, newCfg.appOrder);
    setApps(ordered);
    if (!newCfg.enabledApps?.includes(activeId)) setActiveId(ordered[0]?.id ?? null);
  }, [activeId]);

  const handleSetupComplete = useCallback(async (cfg) => {
    setConfig(cfg);
    const allApps = await window.electronAPI.getApps();
    const enabled = allApps.filter(a => cfg.enabledApps?.includes(a.id));
    const ordered = applyOrder(enabled.length ? enabled : allApps, cfg.appOrder);
    setApps(ordered);
    setActiveId(ordered[0]?.id ?? null);
  }, []);

  // ── Sidebar reorder ──────────────────────────────────────────────────────────
  const handleReorder = useCallback(async (newApps) => {
    setApps(newApps);
    const newCfg = { ...config, appOrder: newApps.map(a => a.id) };
    setConfig(newCfg);
    await window.electronAPI.saveConfig(newCfg);
  }, [config]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!config) return null;

  const activeApp = apps.find(a => a.id === activeId) ?? null;
  const title     = config.nickname ? `${config.nickname}'s OS` : 'Oasis';

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {!config.setupComplete && (
        <SetupWizard theme={theme} onComplete={handleSetupComplete} />
      )}

      <Sidebar
        apps={apps}
        activeId={activeId}
        badges={badges}
        theme={theme}
        showSettings={showSettings}
        appGroups={config.appGroups || []}
        onSelect={(id) => { setActiveId(id); setShowSettings(false); }}
        onOpenSettings={() => setShowSettings(s => !s)}
        onOpenSearch={() => setShowSearch(true)}
        onOpenClipboard={() => setShowClipboard(true)}
        onReorder={handleReorder}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          app={showSettings ? null : activeApp}
          title={showSettings ? 'Settings' : title}
          theme={theme}
          showSettings={showSettings}
          onBack={()    => webviewControls.current.back?.()}
          onForward={()  => webviewControls.current.forward?.()}
          onReload={()   => webviewControls.current.reload?.()}
        />

        <div className="flex-1 relative overflow-hidden">
          {showSettings && (
            <div className="absolute inset-0 z-10">
              <Settings
                config={config}
                theme={theme}
                onSave={handleSaveConfig}
                onClose={() => setShowSettings(false)}
              />
            </div>
          )}

          {apps.map(app => (
            <WebViewPane
              key={app.id}
              app={app}
              isActive={app.id === activeId && !showSettings}
              theme={theme}
              onBadge={handleBadge}
              onConversations={handleConversations}
              onRegisterControls={app.id === activeId ? registerControls : null}
              pendingReply={pendingReply?.appId === app.id ? pendingReply.message : null}
              onPendingReplyDone={() => setPendingReply(null)}
            />
          ))}
        </div>
      </div>

      {/* Search modal ⌘K */}
      {showSearch && (
        <SearchModal
          apps={apps}
          conversations={conversations}
          theme={theme}
          onSelectApp={(id) => { setActiveId(id); setShowSettings(false); setShowSearch(false); }}
          onSelectConv={({ appId }) => { setActiveId(appId); setShowSettings(false); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Clipboard history ⌘⇧V */}
      {showClipboard && (
        <ClipboardHistory
          history={clipHistory}
          theme={theme}
          onRemove={(id) => setClipHistory(prev => prev.filter(h => h.id !== id))}
          onClearAll={() => { setClipHistory([]); lastClipRef.current = ''; }}
          onClose={() => setShowClipboard(false)}
        />
      )}
    </div>
  );
}

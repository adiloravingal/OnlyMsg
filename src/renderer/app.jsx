import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import WebViewPane from './components/WebViewPane';
import TopBar from './components/TopBar';
import SetupWizard from './components/SetupWizard';
import Settings from './components/Settings';

export default function App() {
  const [apps,         setApps]         = useState([]);
  const [config,       setConfig]       = useState(null);   // null = loading
  const [activeId,     setActiveId]     = useState(null);
  const [theme,        setTheme]        = useState('light');
  const [badges,       setBadges]       = useState({});
  const [showSettings, setShowSettings] = useState(false);

  // Topbar webview controls
  const webviewControls = useRef({ back: null, forward: null, reload: null });

  // ── Time tracking ──────────────────────────────────────────────────────────
  const sessionStartRef   = useRef(null);
  const windowFocusedRef  = useRef(true);
  const activeIdRef       = useRef(activeId);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const flushSession = useCallback(() => {
    if (!sessionStartRef.current || !windowFocusedRef.current) return;
    const seconds = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    if (seconds > 0 && activeIdRef.current) {
      window.electronAPI.trackTime({ appId: activeIdRef.current, seconds });
    }
    sessionStartRef.current = null;
  }, []);

  const startSession = useCallback(() => {
    sessionStartRef.current = Date.now();
  }, []);

  // Flush + restart on app switch
  useEffect(() => {
    if (!activeId) return;
    flushSession();
    if (windowFocusedRef.current) startSession();
  }, [activeId]);

  // Window focus / blur
  useEffect(() => {
    const onFocus = () => { windowFocusedRef.current = true;  startSession(); };
    const onBlur  = () => { windowFocusedRef.current = false; flushSession(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur',  onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur',  onBlur);
    };
  }, [flushSession, startSession]);

  // Periodic flush every 30s to avoid data loss
  useEffect(() => {
    const id = setInterval(() => {
      flushSession();
      if (windowFocusedRef.current) startSession();
    }, 30_000);
    return () => clearInterval(id);
  }, [flushSession, startSession]);

  // ── Boot: load config + theme + apps ──────────────────────────────────────
  useEffect(() => {
    (async () => {
      const [cfg, allApps, currentTheme] = await Promise.all([
        window.electronAPI.getConfig(),
        window.electronAPI.getApps(),
        window.electronAPI.getTheme(),
      ]);
      setConfig(cfg);
      setTheme(currentTheme);

      // Filter to enabled apps
      const enabled = allApps.filter(a => cfg.enabledApps?.includes(a.id));
      setApps(enabled.length ? enabled : allApps);
      setActiveId((enabled[0] ?? allApps[0])?.id ?? null);
    })();

    window.electronAPI.onThemeChange(t => setTheme(t));
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!e.metaKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= apps.length) {
        e.preventDefault();
        setActiveId(apps[num - 1].id);
        setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [apps]);

  // ── Dock badge ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const total = Object.values(badges).reduce((a, b) => a + b, 0);
    window.electronAPI.setBadge(total);
  }, [badges]);

  const handleBadge = useCallback((appId, count) => {
    setBadges(prev => ({ ...prev, [appId]: count }));
  }, []);

  const registerControls = useCallback((controls) => {
    webviewControls.current = controls;
  }, []);

  // ── Config save (from Settings) ────────────────────────────────────────────
  const handleSaveConfig = useCallback(async (newCfg) => {
    await window.electronAPI.saveConfig(newCfg);
    setConfig(newCfg);

    // Re-filter app list
    const allApps = await window.electronAPI.getApps();
    const enabled = allApps.filter(a => newCfg.enabledApps?.includes(a.id));
    setApps(enabled.length ? enabled : allApps);

    // If active app was disabled, switch to first enabled
    if (!newCfg.enabledApps?.includes(activeId)) {
      setActiveId(enabled[0]?.id ?? null);
    }
  }, [activeId]);

  // ── Setup wizard completion ────────────────────────────────────────────────
  const handleSetupComplete = useCallback(async (cfg) => {
    setConfig(cfg);
    const allApps = await window.electronAPI.getApps();
    const enabled = allApps.filter(a => cfg.enabledApps?.includes(a.id));
    setApps(enabled.length ? enabled : allApps);
    setActiveId((enabled[0] ?? allApps[0])?.id ?? null);
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!config) return null;

  const allApps = apps.length ? apps : [];
  const activeApp = allApps.find(a => a.id === activeId) ?? null;
  const title = config.nickname ? `${config.nickname}'s OS` : 'OnlyMsg';

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      {/* Setup wizard — shown on first launch */}
      {!config.setupComplete && (
        <SetupWizard theme={theme} onComplete={handleSetupComplete} />
      )}

      <Sidebar
        apps={allApps}
        activeId={activeId}
        badges={badges}
        theme={theme}
        showSettings={showSettings}
        onSelect={(id) => { setActiveId(id); setShowSettings(false); }}
        onOpenSettings={() => setShowSettings(s => !s)}
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
          onOpenSettings={() => setShowSettings(s => !s)}
        />

        <div className="flex-1 relative overflow-hidden">
          {/* Settings panel */}
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

          {/* Webview panes */}
          {allApps.map(app => (
            <WebViewPane
              key={app.id}
              app={app}
              isActive={app.id === activeId && !showSettings}
              theme={theme}
              onBadge={handleBadge}
              onRegisterControls={app.id === activeId ? registerControls : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

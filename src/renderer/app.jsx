import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import WebViewPane from './components/WebViewPane';

export default function App() {
  const [apps, setApps]             = useState([]);
  const [activeId, setActiveId]     = useState(null);
  const [theme, setTheme]           = useState('light');
  const [badges, setBadges]         = useState({});   // { appId: number }

  // Load app list + initial theme
  useEffect(() => {
    (async () => {
      const [appList, currentTheme] = await Promise.all([
        window.electronAPI.getApps(),
        window.electronAPI.getTheme(),
      ]);
      setApps(appList);
      setActiveId(appList[0]?.id ?? null);
      setTheme(currentTheme);
    })();

    window.electronAPI.onThemeChange((t) => setTheme(t));
  }, []);

  // Keyboard shortcuts Cmd+1…7, Cmd+R, Cmd+[, Cmd+]
  useEffect(() => {
    const handler = (e) => {
      if (!e.metaKey) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= apps.length) {
        e.preventDefault();
        setActiveId(apps[num - 1].id);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [apps]);

  // Sync total badge to dock
  useEffect(() => {
    const total = Object.values(badges).reduce((a, b) => a + b, 0);
    window.electronAPI.setBadge(total);
  }, [badges]);

  const handleBadge = useCallback((appId, count) => {
    setBadges(prev => ({ ...prev, [appId]: count }));
  }, []);

  if (!apps.length) return null;

  return (
    <div
      className={`flex h-screen w-screen overflow-hidden ${theme === 'dark' ? 'dark' : ''}`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
    >
      <Sidebar
        apps={apps}
        activeId={activeId}
        badges={badges}
        theme={theme}
        onSelect={setActiveId}
      />
      <main className="flex-1 relative overflow-hidden">
        {apps.map(app => (
          <WebViewPane
            key={app.id}
            app={app}
            isActive={app.id === activeId}
            theme={theme}
            onBadge={handleBadge}
          />
        ))}
      </main>
    </div>
  );
}

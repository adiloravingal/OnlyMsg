const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // App list
  getApps:            ()         => ipcRenderer.invoke('get-apps'),

  // Theme
  getTheme:           ()         => ipcRenderer.invoke('get-theme'),
  onThemeChange:      (cb)       => ipcRenderer.on('theme-changed', (_, t) => cb(t)),

  // Dock badge
  setBadge:           (n)        => ipcRenderer.send('set-badge', n),

  // Watched reels
  getWatchedReels:    ()         => ipcRenderer.invoke('get-watched-reels'),
  markReelWatched:    (url)      => ipcRenderer.send('mark-reel-watched', url),

  // Config
  getConfig:          ()         => ipcRenderer.invoke('get-config'),
  saveConfig:         (cfg)      => ipcRenderer.invoke('save-config', cfg),

  // Time tracking
  getTimeStats:       ()         => ipcRenderer.invoke('get-time-stats'),
  trackTime:          (payload)  => ipcRenderer.send('track-time', payload),

  // Data folder
  pickDataFolder:     ()         => ipcRenderer.invoke('pick-data-folder'),
  migrateDataFolder:  (paths)    => ipcRenderer.invoke('migrate-data-folder', paths),

  // Updates
  checkUpdate:        ()         => ipcRenderer.invoke('check-update'),
  openUrl:            (url)      => ipcRenderer.send('open-url', url),

  // Clipboard
  clipboardRead:      ()         => ipcRenderer.invoke('clipboard-read'),
  clipboardWrite:     (text)     => ipcRenderer.send('clipboard-write', text),
});

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getApps:          ()        => ipcRenderer.invoke('get-apps'),
  getTheme:         ()        => ipcRenderer.invoke('get-theme'),
  onThemeChange:    (cb)      => ipcRenderer.on('theme-changed', (_, theme) => cb(theme)),
  setBadge:         (count)   => ipcRenderer.send('set-badge', count),
  getWatchedReels:  ()        => ipcRenderer.invoke('get-watched-reels'),
  markReelWatched:  (url)     => ipcRenderer.send('mark-reel-watched', url),
});

const { app, BrowserWindow, ipcMain, session, shell, nativeTheme } = require('electron');
const path = require('path');
const fs   = require('fs');

// ─── Watched-reels persistence ────────────────────────────────────────────────

function watchedPath() {
  return path.join(app.getPath('userData'), 'watched-reels.json');
}
function readWatched() {
  try { return JSON.parse(fs.readFileSync(watchedPath(), 'utf8')); }
  catch { return []; }
}
function writeWatched(arr) {
  fs.writeFileSync(watchedPath(), JSON.stringify(arr));
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// Each app gets its own partition for isolated sessions
const APPS = [
  { id: 'whatsapp',          label: 'WhatsApp',          url: 'https://web.whatsapp.com',                   partition: 'persist:whatsapp' },
  { id: 'whatsapp-business', label: 'WhatsApp Business', url: 'https://web.whatsapp.com',                   partition: 'persist:whatsapp-business' },
  { id: 'instagram',         label: 'Instagram',         url: 'https://www.instagram.com/direct/inbox/',    partition: 'persist:instagram' },
  { id: 'twitter',           label: 'Twitter / X',       url: 'https://x.com/messages',                    partition: 'persist:twitter' },
  { id: 'linkedin',          label: 'LinkedIn',          url: 'https://www.linkedin.com/messaging/',        partition: 'persist:linkedin' },
  { id: 'teams',             label: 'Microsoft Teams',   url: 'https://teams.microsoft.com',                partition: 'persist:teams' },
  { id: 'classroom',         label: 'Google Classroom',  url: 'https://classroom.google.com',               partition: 'persist:classroom' },
];

// Real Chrome UA to avoid bot detection
const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function setupPartition(partitionName) {
  const ses = session.fromPartition(partitionName);
  ses.setUserAgent(CHROME_UA);

  // Block telltale Electron headers
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    delete headers['X-Electron'];
    // Remove sec-ch-ua that mentions Electron
    if (headers['sec-ch-ua']) {
      headers['sec-ch-ua'] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
    }
    callback({ requestHeaders: headers });
  });
}

function createWindow() {
  APPS.forEach(a => setupPartition(a.partition));

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 760,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#1a1a1a' : '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      // Allow webviews to use their own partitions
    },
  });

  // Pass app list to renderer via query string isn't ideal — use IPC instead
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // IPC: provide app config to renderer
  ipcMain.handle('get-apps', () => APPS);

  // IPC: watched reels
  ipcMain.handle('get-watched-reels', () => readWatched());
  ipcMain.on('mark-reel-watched', (_, url) => {
    const w = readWatched();
    if (!w.includes(url)) writeWatched([...w, url]);
  });

  // IPC: theme
  ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  nativeTheme.on('updated', () => {
    win.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  // IPC: badge count (macOS dock badge)
  ipcMain.on('set-badge', (_, count) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(count > 0 ? String(count) : '');
    }
  });

  // Open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
}

app.whenReady().then(() => {
  // Register the webview partition user-agents before any webview loads
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

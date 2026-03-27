const { app, BrowserWindow, ipcMain, session, shell, nativeTheme, Menu, dialog } = require('electron');
const path  = require('path');
const fs    = require('fs');
const https = require('https');

// ─── Config (always at userData, so we can find custom dataFolder) ────────────

const CONFIG_PATH = () => path.join(app.getPath('userData'), 'config.json');

const DEFAULT_CONFIG = {
  setupComplete: false,
  nickname: '',
  enabledApps: ['whatsapp','whatsapp-business','instagram','twitter','linkedin','teams','classroom'],
  dataFolder: null,   // null = use userData
};

function readConfig() {
  try { return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH(), 'utf8')) }; }
  catch { return { ...DEFAULT_CONFIG }; }
}
function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH(), JSON.stringify(cfg, null, 2));
}

// ─── Data folder (configurable) ───────────────────────────────────────────────

function dataDir(cfg) {
  const d = cfg?.dataFolder || app.getPath('userData');
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  return d;
}

// ─── Watched-reels ────────────────────────────────────────────────────────────

function watchedPath(cfg) { return path.join(dataDir(cfg), 'watched-reels.json'); }
function readWatched(cfg) {
  try { return JSON.parse(fs.readFileSync(watchedPath(cfg), 'utf8')); }
  catch { return []; }
}
function writeWatched(cfg, arr) { fs.writeFileSync(watchedPath(cfg), JSON.stringify(arr)); }

// ─── Time tracking ────────────────────────────────────────────────────────────

function timePath(cfg) { return path.join(dataDir(cfg), 'time-tracking.json'); }
function readTime(cfg) {
  try { return JSON.parse(fs.readFileSync(timePath(cfg), 'utf8')); }
  catch { return {}; }
}
function writeTime(cfg, data) { fs.writeFileSync(timePath(cfg), JSON.stringify(data)); }

function todayKey() { return new Date().toISOString().slice(0, 10); }

function addTime(cfg, appId, seconds) {
  if (!appId || seconds <= 0) return;
  const data  = readTime(cfg);
  const today = todayKey();
  if (!data[today]) data[today] = {};
  data[today][appId] = (data[today][appId] || 0) + Math.floor(seconds);
  writeTime(cfg, data);
}

// ─── Update check ─────────────────────────────────────────────────────────────

function checkUpdate() {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'api.github.com',
      path: '/repos/adiloravingal/OnlyMsg/releases/latest',
      headers: { 'User-Agent': 'OnlyMsg-App' },
    };
    https.get(opts, (res) => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        try {
          const rel  = JSON.parse(raw);
          const latest  = (rel.tag_name || '').replace(/^v/, '');
          const pkg     = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
          const current = pkg.version || '1.0.0';
          resolve({ current, latest, hasUpdate: latest && latest !== current, url: rel.html_url });
        } catch { resolve({ current: '1.0.0', latest: null, hasUpdate: false, error: true }); }
      });
    }).on('error', () => resolve({ current: '1.0.0', latest: null, hasUpdate: false, error: true }));
  });
}

// ─── App list ─────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const APPS = [
  { id: 'whatsapp',          label: 'WhatsApp',          url: 'https://web.whatsapp.com',                   partition: 'persist:whatsapp' },
  { id: 'whatsapp-business', label: 'WhatsApp Business', url: 'https://web.whatsapp.com',                   partition: 'persist:whatsapp-business' },
  { id: 'instagram',         label: 'Instagram',         url: 'https://www.instagram.com/direct/inbox/',    partition: 'persist:instagram' },
  { id: 'twitter',           label: 'Twitter / X',       url: 'https://x.com/messages',                    partition: 'persist:twitter' },
  { id: 'linkedin',          label: 'LinkedIn',          url: 'https://www.linkedin.com/messaging/',        partition: 'persist:linkedin' },
  { id: 'teams',             label: 'Microsoft Teams',   url: 'https://teams.microsoft.com',                partition: 'persist:teams' },
  { id: 'classroom',         label: 'Google Classroom',  url: 'https://classroom.google.com',               partition: 'persist:classroom' },
];

const CHROME_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function setupPartition(partitionName) {
  const ses = session.fromPartition(partitionName);
  ses.setUserAgent(CHROME_UA);
  ses.webRequest.onBeforeSendHeaders((details, callback) => {
    const headers = { ...details.requestHeaders };
    delete headers['X-Electron'];
    if (headers['sec-ch-ua']) {
      headers['sec-ch-ua'] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
    }
    callback({ requestHeaders: headers });
  });
}

// ─── Window ───────────────────────────────────────────────────────────────────

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
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ── IPC handlers ─────────────────────────────────────────────────────────────

  ipcMain.handle('get-apps', () => APPS);

  // Config
  ipcMain.handle('get-config',  ()      => readConfig());
  ipcMain.handle('save-config', (_, cfg) => { writeConfig(cfg); return true; });

  // Watched reels
  ipcMain.handle('get-watched-reels', () => readWatched(readConfig()));
  ipcMain.on('mark-reel-watched', (_, url) => {
    const cfg = readConfig();
    const w   = readWatched(cfg);
    if (!w.includes(url)) writeWatched(cfg, [...w, url]);
  });

  // Time tracking
  ipcMain.handle('get-time-stats', () => readTime(readConfig()));
  ipcMain.on('track-time', (_, { appId, seconds }) => addTime(readConfig(), appId, seconds));

  // Data folder picker + migration
  ipcMain.handle('pick-data-folder', async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog(win, {
      title: 'Choose data storage folder',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (canceled || !filePaths[0]) return null;
    return filePaths[0];
  });

  ipcMain.handle('migrate-data-folder', (_, { from, to }) => {
    const files = ['watched-reels.json', 'time-tracking.json'];
    if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
    files.forEach(f => {
      const src = path.join(from, f);
      const dst = path.join(to, f);
      if (fs.existsSync(src) && !fs.existsSync(dst)) fs.copyFileSync(src, dst);
    });
    return true;
  });

  // Updates
  ipcMain.handle('check-update', () => checkUpdate());

  // Open release URL in browser
  ipcMain.on('open-url', (_, url) => shell.openExternal(url));

  // Theme
  ipcMain.handle('get-theme', () => nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  nativeTheme.on('updated', () => {
    win.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
  });

  // Dock badge
  ipcMain.on('set-badge', (_, count) => {
    if (process.platform === 'darwin') {
      app.dock.setBadge(count > 0 ? String(count) : '');
    }
  });

  // External links
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Menu — Cmd+R removed so webviews handle their own reload
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    { role: 'windowMenu' },
  ]));

  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

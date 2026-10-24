const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = require('electron');
const http = require('http');
const path = require('path');

const WIN_W = 560;
const WIN_H = 130;
const API_PORT = 41234;
const TYPES = ['music', 'timer', 'notif', 'progress'];

let win = null;
let tray = null;

if (!app.requestSingleInstanceLock()) app.quit();

function placeWindow() {
  if (!win) return;
  const { bounds } = screen.getPrimaryDisplay();
  win.setBounds({
    x: Math.round(bounds.x + (bounds.width - WIN_W) / 2),
    y: bounds.y,
    width: WIN_W,
    height: WIN_H
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, 'index.html'));
  win.once('ready-to-show', () => {
    placeWindow();
    win.showInactive();
  });
}

function sendTask(data) {
  if (win) win.webContents.send('task', data);
}

function sendEnd() {
  if (win) win.webContents.send('end');
}

// Quand la souris est sur la pilule, la fenêtre capte les clics ; sinon ils passent au travers.
ipcMain.on('interactive', (_e, value) => {
  if (win) win.setIgnoreMouseEvents(!value, { forward: true });
});

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon-pc.png')).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.setToolTip('Dynamic Island PC');
  const rebuild = () => {
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: 'Tester une tâche',
        submenu: [
          { label: 'Musique', click: () => sendTask({ type: 'music', title: 'Nuit blanche', artist: 'Aya' }) },
          { label: 'Minuteur (10 s)', click: () => sendTask({ type: 'timer', seconds: 10 }) },
          { label: 'Notification', click: () => sendTask({ type: 'notif', title: 'Koffi', text: 'On se voit à 18 h ?' }) },
          { label: 'Copie de fichier', click: () => demoProgress() }
        ]
      },
      { label: 'Terminer la tâche en cours', click: sendEnd },
      { type: 'separator' },
      {
        label: 'Lancer au démarrage de Windows',
        type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => { app.setLoginItemSettings({ openAtLogin: item.checked }); rebuild(); }
      },
      { label: 'Quitter', click: () => app.quit() }
    ]));
  };
  rebuild();
}

function demoProgress() {
  let value = 0;
  const timer = setInterval(() => {
    value = Math.min(100, value + 4);
    sendTask({ type: 'progress', label: 'Copie en cours', value });
    if (value >= 100) clearInterval(timer);
  }, 250);
}

// Petite API locale pour que d'autres programmes pilotent l'île (127.0.0.1 uniquement).
function startApi() {
  const server = http.createServer((req, res) => {
    const reply = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.method !== 'POST' || (req.url !== '/task' && req.url !== '/end')) return reply(404, { error: 'not found' });
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; if (raw.length > 10000) req.destroy(); });
    req.on('end', () => {
      if (req.url === '/end') { sendEnd(); return reply(200, { ok: true }); }
      try {
        const data = JSON.parse(raw || '{}');
        if (!TYPES.includes(data.type)) return reply(400, { error: 'type invalide', types: TYPES });
        sendTask(data);
        reply(200, { ok: true });
      } catch {
        reply(400, { error: 'JSON invalide' });
      }
    });
  });
  server.on('error', (err) => console.error('API locale indisponible :', err.message));
  server.listen(API_PORT, '127.0.0.1');
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  startApi();
  screen.on('display-metrics-changed', placeWindow);
});

app.on('second-instance', () => { if (win) win.showInactive(); });
app.on('window-all-closed', () => app.quit());

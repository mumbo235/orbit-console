// ORBIT desktop shell: hosts index.html and lets web apps load inside <webview>s,
// which (unlike iframes) aren't blocked by sites that forbid embedding.
const { app, BrowserWindow, session, shell, ipcMain } = require('electron');
const path = require('path');

// Present as plain Chrome so sites (and sign-in pages) don't treat us as an unknown embedded browser.
const cleanUA = ua => ua.replace(/\s(Electron|orbit-console)\/\S+/g, '');
app.userAgentFallback = cleanUA(app.userAgentFallback);

const ALLOWED_PERMISSIONS = new Set(['fullscreen', 'clipboard-sanitized-write', 'clipboard-read', 'media', 'pointerLock', 'notifications']);

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1600, height: 900, minWidth: 900, minHeight: 560,
    backgroundColor: '#000000', autoHideMenuBar: true, title: 'ORBIT',
    fullscreen: process.argv.includes('--fullscreen'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, webviewTag: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'index.html'));

  // The console page itself never navigates away; links that try to open a window go to the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
}

app.on('web-contents-created', (_e, wc) => {
  // Lock down every webview the page creates.
  wc.on('will-attach-webview', (_ev, prefs, params) => {
    delete prefs.preload;
    prefs.nodeIntegration = false;
    prefs.contextIsolation = true;
    if (!/^https?:/.test(params.src)) params.src = 'about:blank';
  });

  if (wc.getType() !== 'webview') return;
  // Popups (e.g. "open in new window", OAuth) stay inside the same app view.
  wc.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) wc.loadURL(url); return { action: 'deny' }; });

  // Keys that must always reach the console, even while a web app has focus:
  // Esc twice quickly = back to home, F1 = quick menu, F11 = fullscreen.
  let lastEsc = 0;
  wc.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    const host = wc.hostWebContents;
    if (input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (input.key === 'F1') { host?.send('orbit-key', 'home'); e.preventDefault(); }
    else if (input.key === 'Escape') {
      const now = Date.now();
      if (now - lastEsc < 450) { host?.send('orbit-key', 'back'); e.preventDefault(); lastEsc = 0; }
      else lastEsc = now;
    }
  });
});

ipcMain.on('orbit-quit', () => app.quit());
ipcMain.on('orbit-fullscreen', () => win && win.setFullScreen(!win.isFullScreen()));

app.whenReady().then(() => {
  const ses = session.fromPartition('persist:orbit');
  ses.setUserAgent(cleanUA(ses.getUserAgent()));
  for (const s of [ses, session.defaultSession]) {
    s.setPermissionRequestHandler((_wc, perm, cb) => cb(ALLOWED_PERMISSIONS.has(perm)));
  }
  createWindow();
});
app.on('window-all-closed', () => app.quit());

const path = require('path');
const { app, BrowserWindow, Menu, Tray, ipcMain, screen, nativeImage } = require('electron');
const Store = require('electron-store');
const AutoLaunch = require('auto-launch');
const { defaultSettings } = require('./defaults');
const { attachToDesktop, getWallpaperStatus } = require('./workerw');

const store = new Store({ defaults: defaultSettings });
let wallpaperWindow;
let settingsWindow;
let tray;
let autoLauncher;

function createWallpaperWindow() {
  const bounds = screen.getAllDisplays().reduce((area, display) => ({
    x: Math.min(area.x, display.bounds.x), y: Math.min(area.y, display.bounds.y),
    right: Math.max(area.right, display.bounds.x + display.bounds.width),
    bottom: Math.max(area.bottom, display.bounds.y + display.bounds.height)
  }), { x: 0, y: 0, right: 0, bottom: 0 });

  wallpaperWindow = new BrowserWindow({
    x: bounds.x, y: bounds.y, width: bounds.right - bounds.x, height: bounds.bottom - bounds.y,
    frame: false, transparent: true, resizable: false, movable: false, focusable: false,
    skipTaskbar: true, show: false, hasShadow: false, webPreferences: {
      preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false
    }
  });
  wallpaperWindow.setMenuBarVisibility(false);
  wallpaperWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  wallpaperWindow.once('ready-to-show', () => reattachWallpaper());
  return wallpaperWindow;
}

function reattachWallpaper() {
  if (!wallpaperWindow) return;
  const displays = screen.getAllDisplays();
  const union = displays.reduce((area, display) => ({
    x: Math.min(area.x, display.bounds.x), y: Math.min(area.y, display.bounds.y),
    right: Math.max(area.right, display.bounds.x + display.bounds.width),
    bottom: Math.max(area.bottom, display.bounds.y + display.bounds.height)
  }), { x: 0, y: 0, right: 0, bottom: 0 });
  wallpaperWindow.setBounds({ x: union.x, y: union.y, width: union.right - union.x, height: union.bottom - union.y });
  wallpaperWindow.setIgnoreMouseEvents(true, { forward: true });
  const result = attachToDesktop(wallpaperWindow);
  if (!result.ok) wallpaperWindow.setAlwaysOnTop(false, 'desktop');
  wallpaperWindow.showInactive();
  wallpaperWindow.webContents.send('wallpaper:status', getDiagnostics());
  wallpaperWindow.webContents.send('settings:changed', store.store);
}

function createSettingsWindow() {
  if (settingsWindow && !settingsWindow.isDestroyed()) return settingsWindow.show();
  settingsWindow = new BrowserWindow({
    width: 460, height: 680, title: 'FlipClock Wallpaper Settings', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });
  settingsWindow.loadFile(path.join(__dirname, '../renderer/settings.html'));
  settingsWindow.once('ready-to-show', () => settingsWindow.show());
}

async function configureAutoLaunch(enabled) {
  autoLauncher ||= new AutoLaunch({ name: 'FlipClock Wallpaper', path: app.getPath('exe'), isHidden: true });
  const active = await autoLauncher.isEnabled().catch(() => false);
  if (enabled && !active) await autoLauncher.enable().catch(() => {});
  if (!enabled && active) await autoLauncher.disable().catch(() => {});
}

function createTrayIcon() {
  const svg = encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect width="64" height="64" rx="14" fill="#111318"/>
      <rect x="10" y="12" width="44" height="40" rx="6" fill="#1a1d25" stroke="#8fb7ff" stroke-width="3"/>
      <path d="M10 32h44" stroke="#8fb7ff" stroke-width="3" opacity=".7"/>
      <text x="32" y="41" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-size="24" font-weight="700" fill="#f4f1e8">12</text>
    </svg>`);
  const icon = nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${svg}`);
  return icon.isEmpty() ? nativeImage.createEmpty() : icon;
}

function createTray() {
  tray = new Tray(createTrayIcon());
  const rebuild = () => tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Settings', click: createSettingsWindow },
    { label: 'Start with Windows', type: 'checkbox', checked: store.get('startup.autoLaunch'), click: (item) => {
      store.set('startup.autoLaunch', item.checked); configureAutoLaunch(item.checked); rebuild();
    }},
    { label: 'Restart clock', click: () => wallpaperWindow?.webContents.reloadIgnoringCache() },
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } }
  ]));
  tray.setToolTip('FlipClock Wallpaper');
  rebuild();
}

ipcMain.handle('settings:get', () => store.store);
function getDiagnostics() {
  const status = getWallpaperStatus();
  return {
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    mode: status.workerWActive ? 'V2 WorkerW desktop wallpaper mode' : 'V1 fullscreen transparent fallback mode',
    ...status
  };
}

ipcMain.handle('app:info', () => getDiagnostics());
ipcMain.handle('settings:set', (_event, patch) => {
  store.set(patch);
  const settings = store.store;
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('settings:changed', settings);
    win.webContents.send('wallpaper:status', getDiagnostics());
  });
  configureAutoLaunch(settings.startup.autoLaunch);
  return settings;
});
ipcMain.handle('clock:restart', () => wallpaperWindow?.webContents.reloadIgnoringCache());

app.whenReady().then(async () => {
  app.setAppUserModelId('com.flipclock.wallpaper');
  createWallpaperWindow(); createTray();
  await configureAutoLaunch(store.get('startup.autoLaunch'));
  screen.on('display-added', reattachWallpaper);
  screen.on('display-removed', reattachWallpaper);
  screen.on('display-metrics-changed', reattachWallpaper);
  setInterval(reattachWallpaper, 15000).unref();
});
app.on('window-all-closed', (event) => event.preventDefault());

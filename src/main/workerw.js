const path = require('path');
const { app } = require('electron');

let nativeAddon;
let lastStatus = {
  workerWActive: false,
  fallbackActive: true,
  attachError: 'WorkerW has not been attempted yet',
  lastAttachedAt: null
};

function loadAddon() {
  if (process.platform !== 'win32') return null;
  if (nativeAddon) return nativeAddon;
  const candidates = [
    path.join(__dirname, '../native/workerw.node'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked/src/native/workerw.node'),
    path.join(process.resourcesPath || '', 'app.asar.unpacked/build/Release/workerw.node'),
    path.join(app.getAppPath(), 'build/Release/workerw.node'),
    path.join(__dirname, '../../build/Release/workerw.node')
  ];
  for (const candidate of candidates) {
    try {
      nativeAddon = require(candidate);
      return nativeAddon;
    } catch (_) { /* try next path */ }
  }
  return null;
}

function attachToDesktop(window) {
  if (!window || window.isDestroyed()) return { ok: false, reason: 'wallpaper window is unavailable' };
  if (process.platform !== 'win32') return updateStatus(false, 'WorkerW is only available on Windows');
  const addon = loadAddon();
  if (!addon?.attach) return updateStatus(false, 'WorkerW native addon could not be loaded');
  try {
    const result = addon.attach(window.getNativeWindowHandle());
    return updateStatus(Boolean(result.ok), result.reason || (result.ok ? 'attached to WorkerW' : 'unknown attach failure'));
  } catch (error) {
    return updateStatus(false, error.message);
  }
}

function updateStatus(ok, reason) {
  lastStatus = {
    workerWActive: ok,
    fallbackActive: !ok,
    attachError: ok ? '' : reason,
    lastAttachedAt: new Date().toISOString()
  };
  return { ok, reason, ...lastStatus };
}

function getWallpaperStatus() { return { ...lastStatus }; }

module.exports = { attachToDesktop, getWallpaperStatus };

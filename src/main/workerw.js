const path = require('path');
const { app } = require('electron');

let nativeAddon;
let loadAttempted = false;
let nativeAddonPath = '';
let nativeAddonError = '';
let lastStatus = {
  workerWActive: false,
  fallbackActive: true,
  nativeAddonLoaded: false,
  nativeAddonPath: '',
  nativeAddonError: 'WorkerW native addon has not been loaded yet',
  attachError: 'WorkerW has not been attempted yet',
  lastAttachedAt: null
};

function addonCandidates() {
  const resourcesPath = process.resourcesPath || '';
  return [
    path.join(__dirname, '../native/workerw.node'),
    path.join(resourcesPath, 'app.asar.unpacked/build/Release/workerw.node'),
    path.join(resourcesPath, 'app.asar.unpacked/src/native/workerw.node'),
    path.join(app.getAppPath(), 'build/Release/workerw.node'),
    path.join(__dirname, '../../build/Release/workerw.node')
  ];
}

function loadAddon() {
  if (process.platform !== 'win32') {
    nativeAddonError = 'WorkerW native addon is only loaded on Windows';
    return null;
  }
  if (nativeAddon) return nativeAddon;
  if (loadAttempted) return null;
  loadAttempted = true;

  const errors = [];
  for (const candidate of addonCandidates()) {
    try {
      nativeAddon = require(candidate);
      nativeAddonPath = candidate;
      nativeAddonError = '';
      console.log(`[WorkerW] Native addon loaded: ${candidate}`);
      return nativeAddon;
    } catch (error) {
      errors.push(`${candidate}: ${error.message}`);
    }
  }
  nativeAddonError = errors.join(' | ') || 'No WorkerW native addon candidates were available';
  console.warn(`[WorkerW] Native addon load failed; using fallback wallpaper mode. ${nativeAddonError}`);
  return null;
}

function attachToDesktop(window) {
  if (!window || window.isDestroyed()) return updateStatus(false, 'wallpaper window is unavailable');
  if (process.platform !== 'win32') return updateStatus(false, 'WorkerW is only available on Windows');
  const addon = loadAddon();
  if (!addon?.attach) return updateStatus(false, 'WorkerW native addon could not be loaded');
  try {
    const result = addon.attach(window.getNativeWindowHandle());
    const ok = Boolean(result.ok);
    const reason = result.reason || (ok ? 'attached to WorkerW' : 'unknown attach failure');
    if (ok) console.log(`[WorkerW] Attach succeeded: ${reason}`);
    else console.warn(`[WorkerW] Attach failed; using fallback wallpaper mode: ${reason}`);
    return updateStatus(ok, reason);
  } catch (error) {
    console.warn(`[WorkerW] Attach threw; using fallback wallpaper mode: ${error.message}`);
    return updateStatus(false, error.message);
  }
}

function updateStatus(ok, reason) {
  lastStatus = {
    workerWActive: ok,
    fallbackActive: !ok,
    nativeAddonLoaded: Boolean(nativeAddon),
    nativeAddonPath,
    nativeAddonError,
    attachError: ok ? '' : reason,
    lastAttachedAt: new Date().toISOString()
  };
  return { ok, reason, ...lastStatus };
}

function getWallpaperStatus() {
  return {
    ...lastStatus,
    nativeAddonLoaded: Boolean(nativeAddon),
    nativeAddonPath,
    nativeAddonError
  };
}

module.exports = { attachToDesktop, getWallpaperStatus };

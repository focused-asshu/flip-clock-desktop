const THEMES = {
  graphite: { cardColor: '#111318', digitColor: '#f4f1e8', backgroundColor: '#05070a', accentColor: '#8fb7ff' },
  ivory: { cardColor: '#e8dfce', digitColor: '#1d1b18', backgroundColor: '#c7bdac', accentColor: '#f7b267' },
  midnight: { cardColor: '#07111f', digitColor: '#c9f2ff', backgroundColor: '#02050a', accentColor: '#5eead4' }
};
const COLOR_IDS = ['cardColor', 'digitColor', 'backgroundColor', 'accentColor'];
const $ = (id) => document.getElementById(id);
let settings;

function presetFor(theme) {
  return Object.entries(THEMES).find(([, colors]) => COLOR_IDS.every((id) => colors[id] === theme[id]))?.[0] || 'custom';
}

function render(s) {
  settings = s;
  $('use24Hour').checked = s.clock.use24Hour;
  $('showSeconds').checked = s.clock.showSeconds;
  $('showDate').checked = s.clock.showDate;
  $('preset').value = s.theme.preset === 'custom' ? 'custom' : presetFor(s.theme);
  COLOR_IDS.forEach((id) => { $(id).value = s.theme[id]; });
  $('scale').value = s.layout.scale;
  $('tilt').value = s.camera.tilt;
  $('animationSpeed').value = s.animation?.speed ?? 1;
  $('shadowStrength').value = s.animation?.shadowStrength ?? 0.35;
  $('glowStrength').value = s.animation?.glowStrength ?? 0.35;
  $('position').value = s.layout.position;
  $('offsetX').value = s.layout.offsetX || 0;
  $('offsetY').value = s.layout.offsetY || 0;
  ['scale', 'tilt', 'offsetX', 'offsetY', 'animationSpeed', 'shadowStrength', 'glowStrength'].forEach((id) => {
    const out = $(`${id}Value`);
    if (out) out.textContent = $(id).value;
  });
}

async function save(patch) {
  settings = await window.flipClock.setSettings(patch);
  render(settings);
}

window.flipClock.getSettings().then(render);
function renderDiagnostics(info) {
  $('version').textContent = info.appVersion || info.version || '—';
  $('electron').textContent = info.electronVersion || '—';
  $('mode').textContent = info.mode || '—';
  $('workerWActive').textContent = info.workerWActive ? 'Yes' : 'No';
  $('fallbackActive').textContent = info.fallbackActive ? 'Yes' : 'No';
  $('attachError').textContent = info.attachError || 'None';
}
window.flipClock.getAppInfo?.().then(renderDiagnostics);
window.flipClock.onWallpaperStatus?.(renderDiagnostics);
window.flipClock.onSettings(render);

['use24Hour', 'showSeconds', 'showDate'].forEach((id) => $(id).addEventListener('change', () => save({ clock: { ...settings.clock, [id]: $(id).checked } })));
$('preset').addEventListener('change', () => {
  const preset = $('preset').value;
  if (preset === 'custom') return save({ theme: { ...settings.theme, preset } });
  return save({ theme: { ...settings.theme, ...THEMES[preset], preset } });
});
COLOR_IDS.forEach((id) => $(id).addEventListener('input', () => save({ theme: { ...settings.theme, [id]: $(id).value, preset: presetFor({ ...settings.theme, [id]: $(id).value }) } })));
$('scale').addEventListener('input', () => save({ layout: { ...settings.layout, scale: Number($('scale').value) } }));
$('tilt').addEventListener('input', () => save({ camera: { ...settings.camera, tilt: Number($('tilt').value) } }));
$('position').addEventListener('change', () => save({ layout: { ...settings.layout, position: $('position').value } }));
$('offsetX').addEventListener('input', () => save({ layout: { ...settings.layout, offsetX: Number($('offsetX').value) } }));
$('offsetY').addEventListener('input', () => save({ layout: { ...settings.layout, offsetY: Number($('offsetY').value) } }));
$('resetPosition').addEventListener('click', () => save({ layout: { ...settings.layout, position: 'center', offsetX: 0, offsetY: 0 } }));
$('restart').addEventListener('click', () => window.flipClock.restartClock());

$('animationSpeed').addEventListener('input', () => save({ animation: { ...settings.animation, speed: Number($('animationSpeed').value) } }));
$('shadowStrength').addEventListener('input', () => save({ animation: { ...settings.animation, shadowStrength: Number($('shadowStrength').value) } }));
$('glowStrength').addEventListener('input', () => save({ animation: { ...settings.animation, glowStrength: Number($('glowStrength').value) } }));

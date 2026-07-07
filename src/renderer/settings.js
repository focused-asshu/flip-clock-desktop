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
  $('position').value = s.layout.position;
  $('offsetX').value = s.layout.offsetX || 0;
  $('offsetY').value = s.layout.offsetY || 0;
}

async function save(patch) {
  settings = await window.flipClock.setSettings(patch);
  render(settings);
}

window.flipClock.getSettings().then(render);
window.flipClock.getAppInfo?.().then((info) => {
  $('version').textContent = info.version;
  $('mode').textContent = info.mode;
});
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

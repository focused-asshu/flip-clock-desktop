const defaultSettings = {
  clock: { use24Hour: true, showSeconds: true, showDate: true, dateMode: 'overlay' },
  theme: {
    preset: 'graphite', cardColor: '#111318', digitColor: '#f4f1e8', backgroundColor: '#05070a',
    accentColor: '#8fb7ff', rimColor: '#ffffff'
  },
  layout: { scale: 1, position: 'center', offsetX: 0, offsetY: 0, perDisplay: {} },
  camera: { tilt: 0.42 },
  startup: { autoLaunch: true }
};
module.exports = { defaultSettings };

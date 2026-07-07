import * as THREE from '../../../node_modules/three/build/three.module.js';

const canvas = document.getElementById('scene');
const dateOverlay = document.getElementById('dateOverlay');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.1, 100);
const root = new THREE.Group();
scene.add(root);

scene.add(new THREE.AmbientLight(0xffffff, 0.35));
const key = new THREE.DirectionalLight(0xffffff, 2.4);
key.position.set(-4, 7, 6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb7ff, 0.65);
rim.position.set(5, 2, -5);
scene.add(rim);
const plane = new THREE.Mesh(new THREE.PlaneGeometry(16, 5), new THREE.ShadowMaterial({ opacity: 0.35 }));
plane.rotation.x = -Math.PI / 2;
plane.position.y = -1.15;
plane.receiveShadow = true;
scene.add(plane);

let settings = await window.flipClock.getSettings();
let digits = [];
let colons = [];
let last = '';
let animating = false;
let renderTimer = null;
const cardGeometry = createRoundedCardGeometry();
const textureCache = new Map();

function createRoundedCardGeometry() {
  const w = 1; const h = 0.62; const r = 0.07;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 5 });
  geo.center();
  return geo;
}

function textureFor(char, half, theme) {
  const cacheKey = `${char}:${half}:${theme.cardColor}:${theme.digitColor}:${theme.accentColor}`;
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey);
  const canvasTexture = document.createElement('canvas');
  canvasTexture.width = 512;
  canvasTexture.height = 320;
  const g = canvasTexture.getContext('2d');
  g.fillStyle = theme.cardColor;
  g.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
  g.shadowColor = theme.accentColor; g.shadowBlur = 16;
  const gradient = g.createLinearGradient(0, 0, 0, canvasTexture.height);
  gradient.addColorStop(0, 'rgba(255,255,255,.10)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,.14)');
  gradient.addColorStop(1, 'rgba(0,0,0,.24)');
  g.fillStyle = gradient;
  g.fillRect(0, 0, canvasTexture.width, canvasTexture.height);
  g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, 0, canvasTexture.width, 3);
  g.fillStyle = theme.digitColor;
  g.font = '700 330px Segoe UI,Arial';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(char, canvasTexture.width / 2, half === 'top' ? canvasTexture.height * 0.92 : canvasTexture.height * 0.08);
  g.fillStyle = 'rgba(0,0,0,.45)';
  g.fillRect(0, half === 'top' ? canvasTexture.height - 7 : 0, canvasTexture.width, 7);
  const texture = new THREE.CanvasTexture(canvasTexture);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

class DigitCard {
  constructor() {
    this.group = new THREE.Group();
    this.value = '0';
    this.next = '0';
    this.body = new THREE.MeshStandardMaterial({ color: settings.theme.cardColor, roughness: 0.7, metalness: 0.04 });
    this.top = this.half('top');
    this.bottom = this.half('bottom');
    this.flap = this.half('top');
    this.flap.position.z = 0.04;
    this.group.add(this.top, this.bottom, this.flap);
  }

  half(halfName) {
    const mesh = new THREE.Mesh(cardGeometry, this.body.clone());
    mesh.position.y = halfName === 'top' ? 0.33 : -0.33;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  setFace(mesh, char, half) {
    mesh.material = new THREE.MeshStandardMaterial({
      map: textureFor(char, half, settings.theme),
      roughness: 0.58,
      metalness: 0.08,
      envMapIntensity: 0.7
    });
  }

  display(value) {
    this.value = value;
    this.setFace(this.top, value, 'top');
    this.setFace(this.bottom, value, 'bottom');
    this.flap.visible = false;
  }

  flip(value) {
    if (value === this.value) return;
    this.next = value;
    this.setFace(this.flap, this.value, 'top');
    this.flap.rotation.x = 0;
    this.flap.visible = true;
    this.setFace(this.top, value, 'top');
    this.setFace(this.bottom, value, 'bottom');
    this.started = performance.now();
    animating = true;
    requestRender();
  }

  update(now) {
    if (!this.started) return false;
    const progress = Math.min((now - this.started) / (780 / (settings.animation?.speed || 1)), 1);
    const ease = progress < 0.82
      ? 1 - Math.pow(1 - (progress / 0.82), 3) * 0.98
      : 1 + Math.sin(((progress - 0.82) / 0.18) * Math.PI * 2) * 0.035 * (1 - progress);
    this.flap.rotation.x = -Math.PI * ease;
    if (progress >= 1) {
      this.value = this.next;
      this.flap.visible = false;
      this.started = 0;
      return false;
    }
    return true;
  }
}

function colon() {
  const group = new THREE.Group();
  [-0.22, 0.22].forEach((y) => {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 24, 12),
      new THREE.MeshStandardMaterial({ color: settings.theme.accentColor, emissive: settings.theme.accentColor, emissiveIntensity: settings.animation?.glowStrength ?? 0.35, roughness: 0.35 })
    );
    mesh.position.y = y;
    mesh.castShadow = true;
    group.add(mesh);
  });
  return group;
}

function layoutClock(visibleDigits) {
  const digitXs = visibleDigits === 4 ? [-1.8, -0.6, 0.6, 1.8] : [-3, -1.8, -0.6, 0.6, 1.8, 3];
  const colonXs = visibleDigits === 4 ? [0] : [-1.2, 1.2];
  digits.forEach((digit, index) => {
    digit.group.visible = index < visibleDigits;
    if (index < visibleDigits) digit.group.position.x = digitXs[index];
  });
  colons.forEach((separator, index) => {
    separator.visible = index < colonXs.length;
    if (separator.visible) separator.position.x = colonXs[index];
  });
}

function updateDateOverlay() {
  dateOverlay.style.display = settings.clock.showDate ? 'block' : 'none';
  dateOverlay.style.color = settings.theme.digitColor;
  dateOverlay.style.textShadow = `0 6px 24px #000, 0 0 18px ${settings.theme.accentColor}`;
  const clockBottom = new THREE.Vector3(root.position.x, root.position.y - (0.92 * root.scale.y), 0);
  clockBottom.project(camera);
  const left = ((clockBottom.x + 1) / 2) * innerWidth;
  const top = ((-clockBottom.y + 1) / 2) * innerHeight + Math.max(18, 28 * root.scale.y);
  dateOverlay.style.left = `${Math.max(16, Math.min(innerWidth - 16, left))}px`;
  dateOverlay.style.top = `${Math.max(16, Math.min(innerHeight - 16, top))}px`;
}

function applyPosition() {
  const paddingX = camera.aspect * 2.8;
  const paddingY = 1.65;
  const positions = {
    center: [0, 0],
    'top-left': [-paddingX, paddingY],
    'top-right': [paddingX, paddingY],
    'bottom-left': [-paddingX, -paddingY],
    'bottom-right': [paddingX, -paddingY]
  };
  const [x, y] = positions[settings.layout.position] || positions.center;
  root.position.set(x + (settings.layout.offsetX || 0), y + (settings.layout.offsetY || 0), 0);
  updateDateOverlay();
}

function build() {
  root.clear();
  digits = [];
  colons = [];
  for (let index = 0; index < 6; index += 1) {
    const digit = new DigitCard();
    digits.push(digit);
    root.add(digit.group);
  }
  colons = [colon(), colon()];
  colons.forEach((separator) => root.add(separator));
  applySettings(true);
}

function timeString() {
  const now = new Date();
  let hours = now.getHours();
  if (!settings.clock.use24Hour) hours = ((hours + 11) % 12) + 1;
  const parts = [String(hours).padStart(2, '0'), String(now.getMinutes()).padStart(2, '0')];
  if (settings.clock.showSeconds) parts.push(String(now.getSeconds()).padStart(2, '0'));
  return parts.join('');
}

function applySettings(reset = false) {
  scene.background = new THREE.Color(settings.theme.backgroundColor);
  rim.color.set(settings.theme.accentColor);
  rim.intensity = 0.45 + (settings.animation?.glowStrength ?? 0.35);
  key.intensity = 1.8 + ((settings.animation?.shadowStrength ?? 0.35) * 1.6);
  plane.material.opacity = settings.animation?.shadowStrength ?? 0.35;
  root.scale.setScalar(settings.layout.scale);
  colons.flatMap((separator) => separator.children).forEach((dot) => {
    dot.material.color.set(settings.theme.accentColor);
    dot.material.emissive.set(settings.theme.accentColor);
    dot.material.emissiveIntensity = settings.animation?.glowStrength ?? 0.35;
  });
  camera.position.set(0, 1.2 + settings.camera.tilt * 1.5, 8 - settings.camera.tilt);
  camera.lookAt(0, 0, 0);
  applyPosition();
  if (reset) {
    last = '';
    tick(true);
  }
  requestRender();
}

function tick(force = false) {
  const value = timeString();
  layoutClock(value.length);
  digits.forEach((digit, index) => {
    if (index >= value.length) return;
    if (force) digit.display(value[index]);
    else digit.flip(value[index]);
  });
  last = value;
  dateOverlay.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  updateDateOverlay();
}

function animate(now) {
  animating = false;
  digits.forEach((digit) => { if (digit.update(now)) animating = true; });
  renderer.render(scene, camera);
  if (animating) requestAnimationFrame(animate);
}

function requestRender() {
  if (renderTimer) clearTimeout(renderTimer);
  requestAnimationFrame(animate);
  renderTimer = setTimeout(() => renderer.render(scene, camera), 80);
}

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  applyPosition();
  requestRender();
});
setInterval(() => {
  const value = timeString();
  if (value !== last) tick(false);
}, 250);
window.flipClock.onSettings((nextSettings) => {
  settings = nextSettings;
  applySettings(true);
});
renderer.setSize(innerWidth, innerHeight, false);
build();

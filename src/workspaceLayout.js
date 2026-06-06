const GRID = 8;
export const DOCK_GAP = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.05;
const ZOOM_TRANSITION_MS = 220;

const DEFAULT_TOOL_ORDER = ['root', 'chords', 'fretboard', 'now-playing', 'tools'];
const DEFAULT_CONTENT_ORDER = [
  'chords-notes',
  'chords-theory',
  'scales-modes',
  'scale-progressions',
  'genre-theory',
  'useful-links',
  'gallery',
];

let userZoom = 1;
let effectiveZoom = 1;

export function getUserZoom() {
  return userZoom;
}

export function getEffectiveZoom() {
  return effectiveZoom;
}

function ensureViewportRoot() {
  let root = document.getElementById('viewport-root');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'viewport-root';
  root.className = 'viewport-root';
  const nodes = [...document.body.childNodes];
  for (const node of nodes) {
    root.appendChild(node);
  }
  document.body.appendChild(root);
  return root;
}

export function ensureModuleCanvas() {
  ensureViewportRoot();
  let canvas = document.getElementById('module-canvas');
  if (!canvas) {
    canvas = document.createElement('div');
    canvas.id = 'module-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.getElementById('viewport-root').appendChild(canvas);
    document.body.classList.add('has-module-canvas');
  }
  return canvas;
}

function applyPageZoom(zoom) {
  effectiveZoom = zoom;
  const root = ensureViewportRoot();
  root.style.transform = `scale(${zoom})`;
  root.dataset.effectiveZoom = String(zoom);
  document.documentElement.style.setProperty('--page-zoom', String(zoom));
}

export function setUserZoom(value) {
  userZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  const canvas = ensureModuleCanvas();
  canvas.dataset.userZoom = String(userZoom);
  updateWorkspaceZoom();
  return userZoom;
}

export function zoomIn() {
  return setUserZoom(userZoom + ZOOM_STEP);
}

export function zoomOut() {
  return setUserZoom(userZoom - ZOOM_STEP);
}

export function resetUserZoom() {
  return setUserZoom(1);
}

export function initWorkspace() {
  ensureModuleCanvas();
  window.addEventListener('resize', () => updateWorkspaceZoom());
}

function snap(value) {
  return Math.round(value / GRID) * GRID;
}

function floatingModules() {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return [];
  return [...canvas.querySelectorAll('.dock-module.is-floating')];
}

export function expandedFloatingModules() {
  return floatingModules().filter((mod) => mod.classList.contains('is-expanded'));
}

function canvasLocalRect() {
  const canvas = ensureModuleCanvas();
  const root = ensureViewportRoot();
  const canvasRect = canvas.getBoundingClientRect();
  const scale = effectiveZoom || 1;
  return {
    canvas,
    left: (canvasRect.left - root.getBoundingClientRect().left) / scale,
    top: (canvasRect.top - root.getBoundingClientRect().top) / scale,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
  };
}

export function pointerToCanvasLocal(canvas, clientX, clientY) {
  const scale = effectiveZoom || 1;
  const canvasEl = canvas || ensureModuleCanvas();
  const canvasRect = canvasEl.getBoundingClientRect();
  return {
    x: (clientX - canvasRect.left) / scale,
    y: (clientY - canvasRect.top) / scale,
  };
}

const BAR_H = 52;
const MIN_FLOAT_W = 220;
const MIN_FLOAT_H = 160;
const MAX_FLOAT_W = 560;
const MAX_FLOAT_H = () => Math.min(window.innerHeight * 0.88, 780);

export function measureModuleFullSize(mod) {
  const panel = mod.querySelector('.dock-module-panel');
  if (!panel) return { width: MIN_FLOAT_W, height: MIN_FLOAT_H };

  const prev = {
    hidden: panel.hidden,
    width: mod.style.width,
    height: mod.style.height,
    panelHeight: panel.style.height,
  };

  panel.hidden = false;
  mod.style.width = `${MAX_FLOAT_W}px`;
  mod.style.height = 'auto';
  panel.style.height = 'auto';

  const barH = mod.querySelector('.dock-module-bar')?.offsetHeight || BAR_H;
  const pad = 16;
  const contentW = Math.max(panel.scrollWidth, MIN_FLOAT_W - pad);
  const contentH = panel.scrollHeight;
  const width = Math.min(MAX_FLOAT_W, Math.max(MIN_FLOAT_W, contentW + pad));
  const height = Math.min(MAX_FLOAT_H(), Math.max(MIN_FLOAT_H, barH + contentH + pad));

  panel.hidden = prev.hidden;
  mod.style.width = prev.width;
  mod.style.height = prev.height;
  panel.style.height = prev.panelHeight;

  mod.dataset.maxWidth = String(width);
  mod.dataset.maxHeight = String(height);
  return { width, height };
}

export function applyModuleSize(mod, width, height) {
  const maxW = parseInt(mod.dataset.maxWidth, 10) || MAX_FLOAT_W;
  const maxH = parseInt(mod.dataset.maxHeight, 10) || MAX_FLOAT_H();
  const w = snap(Math.min(maxW, Math.max(MIN_FLOAT_W, width)));
  const h = snap(Math.min(maxH, Math.max(MIN_FLOAT_H, height)));
  mod.style.width = `${w}px`;
  mod.style.height = `${h}px`;
  return { width: w, height: h };
}

export function positionModuleAtBar(mod, barClientRect) {
  const canvas = ensureModuleCanvas();
  const { width: canvasW, height: canvasH } = canvasLocalRect();
  const { y: localY } = pointerToCanvasLocal(canvas, barClientRect.left, barClientRect.top);

  const modW = mod.offsetWidth;
  const modH = mod.offsetHeight;
  const fromRight = mod.dataset.originDock === 'content-dock';

  const left = fromRight
    ? snap(Math.max(0, canvasW - modW))
    : 0;
  const top = snap(Math.max(0, Math.min(localY, Math.max(0, canvasH - modH))));

  mod.style.left = `${left}px`;
  mod.style.top = `${top}px`;
}

function computeFitCap() {
  const modules = expandedFloatingModules();
  if (!modules.length) return 1;

  const { width: canvasW, height: canvasH } = canvasLocalRect();
  let maxRight = 0;
  let maxBottom = 0;

  for (const mod of modules) {
    const left = parseInt(mod.style.left, 10) || 0;
    const top = parseInt(mod.style.top, 10) || 0;
    maxRight = Math.max(maxRight, left + mod.offsetWidth);
    maxBottom = Math.max(maxBottom, top + mod.offsetHeight);
  }

  if (maxRight <= canvasW && maxBottom <= canvasH) return 1;
  return Math.min(1, (canvasW / maxRight) * 0.97, (canvasH / maxBottom) * 0.97);
}

/** Auto zoom out only when content overflows; never zoom above userZoom. */
export function updateWorkspaceZoom() {
  const fitCap = computeFitCap();
  const target = Math.min(userZoom, fitCap);
  applyPageZoom(target);
}

export function getDefaultDockOrder(dockId) {
  return dockId === 'tool-dock' ? [...DEFAULT_TOOL_ORDER] : [...DEFAULT_CONTENT_ORDER];
}

export { snap, ZOOM_TRANSITION_MS };

const GRID = 8;
export const DOCK_GAP = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.05;
export const ZOOM_TRANSITION_MS = 220;

export const MODULE_ORDER = [
  'root',
  'chords',
  'fretboard',
  'now-playing',
  'tools',
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

/** Single shell for the whole UI — page zoom scales everything together. */
export function ensureViewportRoot() {
  let root = document.getElementById('viewport-root');
  if (root) return root;
  root = document.createElement('div');
  root.id = 'viewport-root';
  root.className = 'viewport-root';
  while (document.body.firstChild) {
    root.appendChild(document.body.firstChild);
  }
  document.body.appendChild(root);
  return root;
}

function ensureWorkspaceScroll() {
  ensureViewportRoot();
  let scroll = document.getElementById('workspace-scroll');
  if (!scroll) {
    scroll = document.createElement('div');
    scroll.id = 'workspace-scroll';
    ensureViewportRoot().appendChild(scroll);
  }
  return scroll;
}

export function ensureModuleCanvas() {
  const scroll = ensureWorkspaceScroll();
  let canvas = document.getElementById('module-canvas');
  if (!canvas) {
    canvas = document.createElement('div');
    canvas.id = 'module-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    scroll.appendChild(canvas);
    document.body.classList.add('has-module-canvas');
  }
  return canvas;
}

function applyPageZoom(zoom) {
  effectiveZoom = zoom;
  const root = ensureViewportRoot();
  root.style.transformOrigin = 'top left';
  root.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
  root.dataset.effectiveZoom = String(zoom);
  document.documentElement.style.setProperty('--page-zoom', String(zoom));
  document.body.style.minHeight = zoom === 1 ? '' : `${root.offsetHeight * zoom}px`;
}

export function setUserZoom(value) {
  userZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  ensureModuleCanvas().dataset.userZoom = String(userZoom);
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
  ensureViewportRoot();
  ensureModuleCanvas();
  window.addEventListener('resize', () => {
    resizeCanvasToContent();
    updateWorkspaceZoom();
  });
}

export function snap(value) {
  return Math.round(value / GRID) * GRID;
}

function floatingModules() {
  const canvas = document.getElementById('module-canvas');
  return canvas ? [...canvas.querySelectorAll('.dock-module.is-floating')] : [];
}

export function expandedFloatingModules() {
  return floatingModules().filter((mod) => mod.classList.contains('is-expanded'));
}

export function pointerToCanvasLocal(canvas, clientX, clientY) {
  const scale = effectiveZoom || 1;
  const canvasEl = canvas || ensureModuleCanvas();
  const scroll = document.getElementById('workspace-scroll');
  const canvasRect = canvasEl.getBoundingClientRect();
  const scrollLeft = scroll?.scrollLeft || 0;
  const scrollTop = scroll?.scrollTop || 0;
  return {
    x: (clientX - canvasRect.left) / scale + scrollLeft,
    y: (clientY - canvasRect.top) / scale + scrollTop,
  };
}

const BAR_H = 44;
const MIN_FLOAT_W = 200;
const MIN_FLOAT_H = 140;
const MAX_FLOAT_W = 480;
const MAX_FLOAT_H = () => Math.min(window.innerHeight * 0.92, 820);

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
  const pad = 8;
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

function moduleBox(mod) {
  const left = parseInt(mod.style.left, 10) || 0;
  const top = parseInt(mod.style.top, 10) || 0;
  return {
    left,
    top,
    right: left + mod.offsetWidth,
    bottom: top + mod.offsetHeight,
    width: mod.offsetWidth,
    height: mod.offsetHeight,
  };
}

function boxesOverlap(a, b, gap = DOCK_GAP) {
  return !(
    a.right + gap <= b.left
    || a.left >= b.right + gap
    || a.bottom + gap <= b.top
    || a.top >= b.bottom + gap
  );
}

export function resizeCanvasToContent() {
  const canvas = ensureModuleCanvas();
  const scroll = ensureWorkspaceScroll();
  const viewW = scroll.clientWidth;
  const viewH = scroll.clientHeight;

  let maxRight = viewW;
  let maxBottom = viewH;

  for (const mod of expandedFloatingModules()) {
    const box = moduleBox(mod);
    maxRight = Math.max(maxRight, box.right + DOCK_GAP * 2);
    maxBottom = Math.max(maxBottom, box.bottom + DOCK_GAP * 2);
  }

  canvas.style.width = `${Math.max(viewW, maxRight)}px`;
  canvas.style.minHeight = `${Math.max(viewH, maxBottom)}px`;
}

/** Push layout: prefer horizontal expansion, then vertical. */
export function layoutModuleWithPush(mod, preferredTop = 0) {
  const others = expandedFloatingModules().filter((m) => m !== mod);
  const w = mod.offsetWidth;
  const h = mod.offsetHeight;
  let left = 0;
  let top = snap(Math.max(0, preferredTop));

  for (let attempt = 0; attempt < 64; attempt++) {
    const box = { left, top, right: left + w, bottom: top + h };
    const hit = others.map(moduleBox).find((b) => boxesOverlap(box, b));
    if (!hit) break;

    const tryLeft = snap(hit.right + DOCK_GAP);
    if (!others.some((o) => o !== mod && boxesOverlap(
      { left: tryLeft, top, right: tryLeft + w, bottom: top + h },
      moduleBox(o),
    ))) {
      left = tryLeft;
      continue;
    }

    top = snap(hit.bottom + DOCK_GAP);
    left = 0;
  }

  mod.style.left = `${left}px`;
  mod.style.top = `${top}px`;
  resizeCanvasToContent();
}

export function positionModuleAtBar(mod, barClientRect) {
  const canvas = ensureModuleCanvas();
  const { y: localY } = pointerToCanvasLocal(canvas, barClientRect.left, barClientRect.top);
  layoutModuleWithPush(mod, localY);
}

function computeFitCap() {
  const scroll = document.getElementById('workspace-scroll');
  const modules = expandedFloatingModules();
  if (!scroll || !modules.length) return 1;

  const viewW = scroll.clientWidth;
  const viewH = scroll.clientHeight;
  let maxRight = 0;
  let maxBottom = 0;
  for (const mod of modules) {
    const box = moduleBox(mod);
    maxRight = Math.max(maxRight, box.right);
    maxBottom = Math.max(maxBottom, box.bottom);
  }
  if (maxRight <= viewW && maxBottom <= viewH) return 1;
  return Math.min(1, (viewW / maxRight) * 0.97, (viewH / maxBottom) * 0.97);
}

export function updateWorkspaceZoom() {
  resizeCanvasToContent();
  const fitCap = computeFitCap();
  applyPageZoom(Math.min(userZoom, fitCap));
  resizeCanvasToContent();
}

export function getDefaultDockOrder() {
  return [...MODULE_ORDER];
}

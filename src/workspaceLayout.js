const GRID = 8;
export const DOCK_GAP = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.05;
export const ZOOM_TRANSITION_MS = 220;
const OVERFLOW_TOLERANCE = 8;

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
  if (zoom === 1) {
    root.style.transform = '';
    root.style.width = '100vw';
    root.style.height = '100vh';
  } else {
    root.style.transform = `scale(${zoom})`;
    root.style.width = `${100 / zoom}vw`;
    root.style.height = `${100 / zoom}vh`;
  }
  root.dataset.effectiveZoom = String(zoom);
  document.documentElement.style.setProperty('--page-zoom', String(zoom));
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
  const scroll = ensureWorkspaceScroll();
  const scrollRect = scroll.getBoundingClientRect();
  return {
    x: (clientX - scrollRect.left + scroll.scrollLeft) / scale,
    y: (clientY - scrollRect.top + scroll.scrollTop) / scale,
  };
}

const BAR_H = 44;
const MIN_FLOAT_W = 200;
const MIN_FLOAT_H = 140;
const MAX_FLOAT_W = 720;
const MAX_FLOAT_H = () => Math.min(window.innerHeight * 0.95, 900);

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

  mod.dataset.naturalWidth = String(width);
  mod.dataset.naturalHeight = String(height);
  return { width, height };
}

export function applyModuleSize(mod, width, height) {
  const naturalW = parseInt(mod.dataset.naturalWidth, 10) || MAX_FLOAT_W;
  const naturalH = parseInt(mod.dataset.naturalHeight, 10) || MAX_FLOAT_H();
  const w = snap(Math.min(naturalW, Math.max(MIN_FLOAT_W, width)));
  const h = snap(Math.min(naturalH, Math.max(MIN_FLOAT_H, height)));
  mod.style.width = `${w}px`;
  mod.style.height = `${h}px`;
  return { width: w, height: h };
}

/** Free resize while dragging — only minimum size enforced. */
export function applyModuleSizeUser(mod, width, height) {
  const w = snap(Math.max(MIN_FLOAT_W, width));
  const h = snap(Math.max(MIN_FLOAT_H, height));
  mod.style.width = `${w}px`;
  mod.style.height = `${h}px`;
  mod.dataset.userWidth = String(w);
  mod.dataset.userHeight = String(h);
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

function boxAt(left, top, w, h) {
  return { left, top, right: left + w, bottom: top + h };
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

/** First free slot from top-left for a newly opened module. */
export function findInitialPosition(mod) {
  const scroll = ensureWorkspaceScroll();
  const viewW = scroll.clientWidth;
  const others = expandedFloatingModules().filter((m) => m !== mod);
  const w = mod.offsetWidth;
  const h = mod.offsetHeight;
  const step = snap(GRID * 4);

  for (let y = 0; y < 4096; y += step) {
    for (let x = 0; x + w <= viewW + step; x += step) {
      const candidate = boxAt(x, y, w, h);
      if (!others.some((o) => boxesOverlap(candidate, moduleBox(o)))) {
        mod.style.left = `${snap(x)}px`;
        mod.style.top = `${snap(y)}px`;
        return;
      }
    }
  }

  mod.style.left = '0px';
  mod.style.top = '0px';
}

/** Nudge only this module if it overlaps — never move other tiles. */
export function resolveOverlapForModule(mod) {
  const others = expandedFloatingModules().filter((m) => m !== mod);
  if (!others.length) return;

  let left = parseInt(mod.style.left, 10) || 0;
  let top = parseInt(mod.style.top, 10) || 0;
  const w = mod.offsetWidth;
  const h = mod.offsetHeight;

  for (let attempt = 0; attempt < 64; attempt++) {
    const box = boxAt(left, top, w, h);
    const hit = others.map(moduleBox).find((b) => boxesOverlap(box, b));
    if (!hit) break;

    const tryLeft = snap(hit.right + DOCK_GAP);
    const rightBox = boxAt(tryLeft, top, w, h);
    if (!others.some((o) => boxesOverlap(rightBox, moduleBox(o)))) {
      left = tryLeft;
      continue;
    }

    top = snap(hit.bottom + DOCK_GAP);
  }

  mod.style.left = `${snap(Math.max(0, left))}px`;
  mod.style.top = `${snap(Math.max(0, top))}px`;
}

/** Snap position and refresh canvas + zoom — never repositions other tiles. */
export function commitModulePosition(mod, { adjustZoom = true } = {}) {
  mod.style.left = `${snap(Math.max(0, parseInt(mod.style.left, 10) || 0))}px`;
  mod.style.top = `${snap(Math.max(0, parseInt(mod.style.top, 10) || 0))}px`;
  resizeCanvasToContent();
  if (adjustZoom) updateWorkspaceZoom();
}

function measureViewportOverflow() {
  const root = ensureViewportRoot();
  const scroll = document.getElementById('workspace-scroll');
  let maxRight = root.clientWidth;
  let maxBottom = root.clientHeight;

  if (scroll) {
    maxRight = Math.max(maxRight, scroll.offsetLeft + scroll.scrollWidth);
    maxBottom = Math.max(maxBottom, scroll.offsetTop + scroll.scrollHeight);
    for (const mod of expandedFloatingModules()) {
      const box = moduleBox(mod);
      maxRight = Math.max(maxRight, scroll.offsetLeft + box.right + DOCK_GAP);
      maxBottom = Math.max(maxBottom, scroll.offsetTop + box.bottom + DOCK_GAP);
    }
  }

  return {
    maxRight,
    maxBottom,
    viewW: root.clientWidth,
    viewH: root.clientHeight,
  };
}

/** Auto shrink only — never zoom in above 100%. */
function computeAutoFitZoom() {
  const { maxRight, maxBottom, viewW, viewH } = measureViewportOverflow();
  const overflowW = maxRight - viewW;
  const overflowH = maxBottom - viewH;
  if (overflowW <= OVERFLOW_TOLERANCE && overflowH <= OVERFLOW_TOLERANCE) return 1;
  return Math.min(1, (viewW / maxRight) * 0.99, (viewH / maxBottom) * 0.99);
}

export function updateWorkspaceZoom() {
  resizeCanvasToContent();
  const autoFit = computeAutoFitZoom();
  applyPageZoom(Math.min(userZoom, autoFit));
}

export function getDefaultDockOrder() {
  return [...MODULE_ORDER];
}

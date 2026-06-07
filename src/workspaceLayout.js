const GRID = 8;
export const WORKSPACE_GRID = GRID * 4;
export const DOCK_GAP = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.05;
export const ZOOM_TRANSITION_MS = 220;
export const MODULE_SETTLE_MS = 240;
export const MODULE_EXPAND_MS = 260;

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
  document.documentElement.style.setProperty('--workspace-grid', `${WORKSPACE_GRID}px`);
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
  const scroll = ensureWorkspaceScroll();
  const scrollRect = scroll.getBoundingClientRect();
  return {
    x: (clientX - scrollRect.left + scroll.scrollLeft) / scale,
    y: (clientY - scrollRect.top + scroll.scrollTop) / scale,
  };
}

export const DEFAULT_FLOAT_W = 280;
export const DEFAULT_FLOAT_H = 200;
export const MIN_FLOAT_W = 200;
export const MIN_FLOAT_H = 140;

const BAR_H = 44;
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

/** Live resize during pointer drag — soft mins, no grid snap for smooth motion. */
export function applyModuleSizeLive(mod, width, height, { minWidth = 120, minHeight = BAR_H } = {}) {
  const w = Math.max(minWidth, Math.round(width));
  const h = Math.max(minHeight, Math.round(height));
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

/** Push other expanded modules out of the way when source overlaps them. */
export function displaceOverlappingModules(sourceMod) {
  const others = expandedFloatingModules().filter((m) => m !== sourceMod);
  if (!others.length) return false;

  let changed = false;
  for (let pass = 0; pass < 24; pass += 1) {
    let movedThisPass = false;
    const sourceBox = moduleBox(sourceMod);

    for (const other of others) {
      const box = moduleBox(other);
      if (!boxesOverlap(sourceBox, box)) continue;

      let newLeft = box.left;
      let newTop = box.top;
      const tryLeft = snap(sourceBox.right + DOCK_GAP);
      const pushedRight = boxAt(tryLeft, box.top, box.width, box.height);

      if (!boxesOverlap(sourceBox, pushedRight)
        && !others.filter((o) => o !== other).some((o) => boxesOverlap(pushedRight, moduleBox(o)))) {
        newLeft = tryLeft;
      } else {
        newTop = snap(sourceBox.bottom + DOCK_GAP);
      }

      if (newLeft !== box.left || newTop !== box.top) {
        other.classList.add('is-settling');
        other.style.left = `${Math.max(0, newLeft)}px`;
        other.style.top = `${Math.max(0, newTop)}px`;
        movedThisPass = true;
        changed = true;
        setTimeout(() => other.classList.remove('is-settling'), MODULE_SETTLE_MS + 20);
      }
    }

    if (!movedThisPass) break;
  }

  if (changed) resizeCanvasToContent();
  return changed;
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

/** Snap position and grow scroll canvas — never changes zoom. */
export function commitModulePosition(mod) {
  mod.style.left = `${snap(Math.max(0, parseInt(mod.style.left, 10) || 0))}px`;
  mod.style.top = `${snap(Math.max(0, parseInt(mod.style.top, 10) || 0))}px`;
  resizeCanvasToContent();
}

/** Apply the user's zoom level and refresh canvas size. No auto-fit. */
export function updateWorkspaceZoom() {
  resizeCanvasToContent();
  applyPageZoom(userZoom);
}

export function getDefaultDockOrder() {
  return [...MODULE_ORDER];
}

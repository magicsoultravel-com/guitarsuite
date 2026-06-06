const GRID = 8;
const DOCK_GAP = 8;
const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.5;
const ZOOM_STEP = 0.1;

let userZoom = 1;

export function getUserZoom() {
  return userZoom;
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

export function ensureModuleCanvas() {
  let canvas = document.getElementById('module-canvas');
  if (!canvas) {
    canvas = document.createElement('div');
    canvas.id = 'module-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    document.body.classList.add('has-module-canvas');
  }
  return canvas;
}

export function initWorkspace() {
  ensureModuleCanvas();
  window.addEventListener('resize', () => {
    layoutFloatingModules({ skipZoom: false });
  });
}

function snap(value) {
  return Math.round(value / GRID) * GRID;
}

function floatingModules() {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return [];
  return [...canvas.querySelectorAll('.dock-module.is-floating')];
}

function expandedFloatingModules() {
  return floatingModules().filter((mod) => mod.classList.contains('is-expanded'));
}

/** Tile open modules: left-dock items on the left, right-dock items on the right. */
export function layoutFloatingModules({ skipZoom = false } = {}) {
  const canvas = ensureModuleCanvas();
  const modules = expandedFloatingModules();
  if (!modules.length) {
    if (!skipZoom) updateWorkspaceZoom();
    return;
  }

  const left = modules
    .filter((m) => m.dataset.originDock === 'tool-dock')
    .sort((a, b) => a.offsetTop - b.offsetTop);
  const right = modules
    .filter((m) => m.dataset.originDock === 'content-dock')
    .sort((a, b) => a.offsetTop - b.offsetTop);

  let yLeft = 0;
  for (const mod of left) {
    mod.style.left = '0px';
    mod.style.top = `${snap(yLeft)}px`;
    yLeft += mod.offsetHeight + DOCK_GAP;
  }

  let yRight = 0;
  const canvasW = canvas.clientWidth || canvas.getBoundingClientRect().width;
  for (const mod of right) {
    const w = mod.offsetWidth;
    mod.style.left = `${snap(Math.max(0, canvasW - w))}px`;
    mod.style.top = `${snap(yRight)}px`;
    yRight += mod.offsetHeight + DOCK_GAP;
  }

  if (!skipZoom) updateWorkspaceZoom();
}

export function updateWorkspaceZoom() {
  const canvas = ensureModuleCanvas();
  const modules = expandedFloatingModules();

  if (!modules.length) {
    canvas.style.transform = `scale(${userZoom})`;
    canvas.dataset.effectiveZoom = String(userZoom);
    return;
  }

  let maxW = 0;
  let maxH = 0;
  for (const mod of modules) {
    maxW = Math.max(maxW, mod.offsetLeft + mod.offsetWidth);
    maxH = Math.max(maxH, mod.offsetTop + mod.offsetHeight);
  }

  const cw = canvas.clientWidth || 1;
  const ch = canvas.clientHeight || 1;
  const autoFit = Math.min(1, (cw / maxW) * 0.96, (ch / maxH) * 0.96);
  const effective = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, userZoom * autoFit));

  canvas.style.transform = `scale(${effective})`;
  canvas.dataset.effectiveZoom = String(effective);
}

export function getCanvasScale() {
  const canvas = document.getElementById('module-canvas');
  return parseFloat(canvas?.dataset.effectiveZoom) || userZoom || 1;
}

export function pointerToCanvasLocal(canvas, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const scale = getCanvasScale();
  return {
    x: (clientX - rect.left) / scale,
    y: (clientY - rect.top) / scale,
  };
}

export { DOCK_GAP, snap };

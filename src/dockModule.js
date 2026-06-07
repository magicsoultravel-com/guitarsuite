import { isRestoring, touchSession } from './sessionState.js';
import {
  MODULE_ORDER,
  applyModuleSize,
  applyModuleSizeUser,
  applyModuleSizeLive,
  commitModulePosition,
  DEFAULT_FLOAT_H,
  DEFAULT_FLOAT_W,
  displaceOverlappingModules,
  ensureModuleCanvas,
  expandedFloatingModules,
  findInitialPosition,
  getDefaultDockOrder,
  getEffectiveZoom,
  getUserZoom,
  measureModuleFullSize,
  MIN_FLOAT_H,
  MIN_FLOAT_W,
  MODULE_EXPAND_MS,
  MODULE_SETTLE_MS,
  pointerToCanvasLocal,
  resetUserZoom,
  resizeCanvasToContent,
  setUserZoom,
  snap,
  updateWorkspaceZoom,
} from './workspaceLayout.js';

export { MODULE_ORDER };

const DOCK_ID = 'module-dock';
const expandHandlers = new Map();
const moduleHomes = new Map();
const savedDockOrders = {};

function notifySessionChange() {
  if (isRestoring()) return;
  touchSession(collectModulesState(), getUserZoom(), collectDockOrders());
}

export function wireDockExpand(el, { bodyClass, moduleId = null } = {}) {
  const panel = el.querySelector('.dock-module-panel');
  const chevron = el.querySelector('.dock-module-chevron');
  if (!panel || !chevron) return { setExpanded: () => {} };

  const id = moduleId || el.dataset.dockId;

  function setExpanded(open, { silent = false } = {}) {
    panel.hidden = !open;
    el.classList.toggle('is-expanded', open);
    if (bodyClass) document.body.classList.toggle(bodyClass, open);
    chevron.textContent = open ? '▼' : '▲';
    chevron.setAttribute('aria-expanded', String(open));

    if (!el.classList.contains('is-floating') && !open) {
      panel.hidden = true;
    }

    if (!silent && el.classList.contains('is-floating')) {
      requestAnimationFrame(() => resizeCanvasToContent());
    }
    if (!silent) notifySessionChange();
  }

  setExpanded(false, { silent: true });
  if (id) expandHandlers.set(id, setExpanded);
  return { setExpanded, panel };
}

export function registerModuleHome(mod, dockEl) {
  if (mod?.dataset?.dockId && dockEl) {
    moduleHomes.set(mod.dataset.dockId, dockEl);
  }
}

function findOriginDock(mod) {
  const id = mod.dataset.dockId;
  if (id && moduleHomes.has(id)) return moduleHomes.get(id);
  return document.getElementById(DOCK_ID);
}

export function collectDockOrders() {
  const dockEl = document.getElementById(DOCK_ID);
  if (!dockEl) return {};
  return {
    [DOCK_ID]: [...dockEl.querySelectorAll('.dock-module:not(.is-floating)')]
      .map((m) => m.dataset.dockId)
      .filter(Boolean),
  };
}

function loadDockOrder(dockEl) {
  const saved = savedDockOrders[dockEl.id] || getDefaultDockOrder();
  const present = [...dockEl.querySelectorAll('.dock-module')]
    .map((m) => m.dataset.dockId)
    .filter(Boolean);
  const order = [...saved];
  for (const id of present) {
    if (!order.includes(id)) order.push(id);
  }
  return order.filter((id) => present.includes(id));
}

export function orderModules(dockEl) {
  for (const id of loadDockOrder(dockEl)) {
    const mod = dockEl.querySelector(`[data-dock-id="${id}"]:not(.is-floating)`);
    if (mod) dockEl.appendChild(mod);
  }
}

export function applyDockOrders(orders = {}) {
  const merged = { ...orders };
  if (!merged[DOCK_ID] && (merged['tool-dock'] || merged['content-dock'])) {
    merged[DOCK_ID] = [
      ...(merged['tool-dock'] || []),
      ...(merged['content-dock'] || []),
    ];
  }
  Object.assign(savedDockOrders, merged);
  const dockEl = document.getElementById(DOCK_ID);
  if (dockEl) orderModules(dockEl);
}

function floatModule(mod, dockEl) {
  if (mod.classList.contains('is-floating')) return;
  const canvas = ensureModuleCanvas();
  mod.dataset.originDock = dockEl?.id || DOCK_ID;
  mod.classList.add('is-floating');
  canvas.appendChild(mod);
}

function waitModuleTransition(mod, ms = MODULE_SETTLE_MS) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      mod.removeEventListener('transitionend', onEnd);
      resolve();
    };
    const onEnd = (e) => {
      if (e.target === mod) finish();
    };
    mod.addEventListener('transitionend', onEnd);
    setTimeout(finish, ms);
  });
}

async function settleModulePosition(mod) {
  const targetLeft = snap(Math.max(0, parseInt(mod.style.left, 10) || 0));
  const targetTop = snap(Math.max(0, parseInt(mod.style.top, 10) || 0));
  const curLeft = parseInt(mod.style.left, 10) || 0;
  const curTop = parseInt(mod.style.top, 10) || 0;
  if (curLeft === targetLeft && curTop === targetTop) {
    resizeCanvasToContent();
    return;
  }
  mod.classList.add('is-settling');
  mod.style.left = `${targetLeft}px`;
  mod.style.top = `${targetTop}px`;
  await waitModuleTransition(mod);
  mod.classList.remove('is-settling');
  resizeCanvasToContent();
}

async function animateRedock(mod, dockEl, clientY) {
  const dockRect = dockEl.getBoundingClientRect();
  const canvas = ensureModuleCanvas();
  const anchorY = clientY;
  const anchorX = dockRect.right - 12;
  const local = pointerToCanvasLocal(canvas, anchorX, anchorY);
  const targetLeft = snap(Math.max(0, local.x - mod.offsetWidth));
  const targetTop = snap(Math.max(0, local.y - Math.round(mod.offsetHeight / 2)));

  mod.classList.add('is-settling', 'is-redocking');
  mod.style.left = `${targetLeft}px`;
  mod.style.top = `${targetTop}px`;
  await waitModuleTransition(mod);
  mod.classList.remove('is-settling', 'is-redocking');
  redock(mod, dockEl, { clientY });
}

function saveExpandedLayout(mod) {
  if (!mod.classList.contains('is-floating') || !mod.classList.contains('is-expanded')) return;
  mod.dataset.userWidth = String(mod.offsetWidth);
  mod.dataset.userHeight = String(mod.offsetHeight);
}

function resolveTargetSize(mod, { restoreUserSize = true } = {}) {
  const measured = measureModuleFullSize(mod);
  const barH = mod.querySelector('.dock-module-bar')?.offsetHeight || 44;
  const savedW = parseInt(mod.dataset.userWidth, 10);
  const savedH = parseInt(mod.dataset.userHeight, 10);
  if (restoreUserSize && savedW > 0 && savedH > barH + 8) {
    return { width: savedW, height: savedH, measured };
  }
  return { width: measured.width, height: measured.height, measured };
}

function collapseFloatingModule(mod) {
  if (!mod.classList.contains('is-floating')) return;
  saveExpandedLayout(mod);

  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });
  mod.classList.remove('is-float-preview');
  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;

  mod.style.height = '';
  mod.style.minHeight = 'var(--dock-bar-h)';
  ensureFloatingResize(mod);
  resizeCanvasToContent();
  notifySessionChange();
}

function expandFloatingModule(mod, {
  keepPosition = false,
  skipResizeHandles = false,
  animateOpen = true,
  restoreUserSize = true,
} = {}) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true });
  mod.classList.remove('is-float-preview');

  const prevTop = parseInt(mod.style.top, 10) || 0;
  const prevLeft = parseInt(mod.style.left, 10) || 0;
  const { width: targetW, height: targetH } = resolveTargetSize(mod, { restoreUserSize });
  const barH = mod.querySelector('.dock-module-bar')?.offsetHeight || 44;
  const startW = mod.offsetWidth || parseInt(mod.style.width, 10) || targetW;
  const startH = mod.classList.contains('is-expanded') && mod.offsetHeight
    ? mod.offsetHeight
    : barH;

  if (animateOpen && (startW !== targetW || startH !== targetH)) {
    applyModuleSizeLive(mod, startW, startH, { minWidth: 120, minHeight: barH });
    mod.classList.add('is-expanding');
    requestAnimationFrame(() => {
      applyModuleSizeUser(mod, targetW, targetH);
    });
    void waitModuleTransition(mod, MODULE_EXPAND_MS).then(() => {
      mod.classList.remove('is-expanding');
      resizeCanvasToContent();
    });
  } else {
    applyModuleSizeUser(mod, targetW, targetH);
  }

  if (!skipResizeHandles) ensureFloatingResize(mod);
  mod.style.zIndex = String(1000 + expandedFloatingModules().length);

  const hasPosition = mod.style.left !== '' && mod.style.top !== '';
  if (keepPosition && hasPosition) {
    mod.style.left = `${prevLeft}px`;
    mod.style.top = `${prevTop}px`;
    commitModulePosition(mod);
  } else {
    findInitialPosition(mod);
    commitModulePosition(mod);
  }
  displaceOverlappingModules(mod);
  notifySessionChange();
}

/** Move to canvas as a collapsed bar — expand only via chevron, not on drop. */
function beginCollapsedFloat(mod, dockEl) {
  if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });
  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;
  mod.classList.add('is-float-preview');
  mod.classList.remove('is-expanded');
  const dockW = dockEl?.offsetWidth || 208;
  mod.style.width = `${dockW}px`;
  mod.style.height = '';
  mod.style.minHeight = 'var(--dock-bar-h)';
  removeFloatingResize(mod);
}

function removeFloatingResize(mod) {
  mod.querySelectorAll('.dock-resize-handle, .dock-resize-edge').forEach((el) => el.remove());
}

function ensureFloatingResize(mod) {
  if (!mod.classList.contains('is-floating')) {
    removeFloatingResize(mod);
    return;
  }
  removeFloatingResize(mod);
  const expanded = mod.classList.contains('is-expanded');
  wireResizeEdge(mod, 'e', { horizontal: true, vertical: false });
  wireResizeEdge(mod, 's', { horizontal: false, vertical: true });
  wireResizeEdge(mod, 'se', { horizontal: true, vertical: true });
}

function clearFloatStyles(mod) {
  mod.classList.remove('is-floating', 'is-float-preview');
  mod.style.left = '';
  mod.style.top = '';
  mod.style.width = '';
  mod.style.height = '';
  mod.style.zIndex = '';
  delete mod.dataset.originDock;
  delete mod.dataset.naturalWidth;
  delete mod.dataset.naturalHeight;
  delete mod.dataset.userWidth;
  delete mod.dataset.userHeight;
  removeFloatingResize(mod);
}

function insertModuleInDockAtY(mod, dockEl, clientY) {
  const siblings = [...dockEl.querySelectorAll('.dock-module:not(.is-floating)')].filter((s) => s !== mod);
  for (const sib of siblings) {
    const rect = sib.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      dockEl.insertBefore(mod, sib);
      return;
    }
  }
  dockEl.appendChild(mod);
}

function isPointerOverDock(clientX, dockEl) {
  const dockRect = dockEl.getBoundingClientRect();
  return clientX <= dockRect.right + 12;
}

function redock(mod, dockEl, { clientY = null } = {}) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });
  clearFloatStyles(mod);
  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;
  if (clientY != null) {
    insertModuleInDockAtY(mod, dockEl, clientY);
  } else {
    dockEl.appendChild(mod);
    orderModules(dockEl);
  }
}

export function openFloatingModule(mod, barClientRect) {
  const dockEl = findOriginDock(mod);
  if (mod.classList.contains('is-floating') && !mod.classList.contains('is-expanded')) {
    expandFloatingModule(mod, { keepPosition: true, restoreUserSize: true });
    return;
  }
  if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
  expandFloatingModule(mod, { restoreUserSize: true });
}

/** Return module to the side dock — clears its canvas layout. */
export function closeFloatingModule(mod) {
  const dockEl = findOriginDock(mod);
  if (mod.classList.contains('is-floating') && dockEl) {
    redock(mod, dockEl);
  } else {
    expandHandlers.get(mod.dataset.dockId)?.(false, { silent: true });
  }
  updateWorkspaceZoom();
  notifySessionChange();
}

export function wireDockBarToggle(el, setExpanded) {
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  const toggle = () => {
    const isOpen = el.classList.contains('is-floating') && el.classList.contains('is-expanded');
    if (isOpen) collapseFloatingModule(el);
    else openFloatingModule(el, bar.getBoundingClientRect());
  };

  el.querySelector('.dock-module-chevron')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
}

function beginResizeExpand(mod) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true });
  mod.classList.remove('is-float-preview');

  const barH = mod.querySelector('.dock-module-bar')?.offsetHeight || 44;
  const w = mod.offsetWidth || parseInt(mod.style.width, 10) || DEFAULT_FLOAT_W;
  mod.style.minHeight = '';
  mod.style.width = `${w}px`;
  mod.style.height = `${barH}px`;
  mod.dataset.userWidth = String(w);
  mod.dataset.userHeight = String(barH);
  return { width: w, height: barH };
}

function autoScrollWorkspace(clientX, clientY) {
  const scroll = document.getElementById('workspace-scroll');
  if (!scroll) return;
  const rect = scroll.getBoundingClientRect();
  const pad = 48;
  const maxStep = 20;

  if (clientX > rect.right - pad) {
    scroll.scrollLeft += Math.min(maxStep, Math.ceil((clientX - (rect.right - pad)) / 3));
  } else if (clientX < rect.left + pad) {
    scroll.scrollLeft -= Math.min(maxStep, Math.ceil((rect.left + pad - clientX) / 3));
  }
  if (clientY > rect.bottom - pad) {
    scroll.scrollTop += Math.min(maxStep, Math.ceil((clientY - (rect.bottom - pad)) / 3));
  } else if (clientY < rect.top + pad) {
    scroll.scrollTop -= Math.min(maxStep, Math.ceil((rect.top + pad - clientY) / 3));
  }
}

function wireResizeEdge(mod, position, { horizontal, vertical }) {
  const el = document.createElement('div');
  el.className = `dock-resize-edge dock-resize-edge--${position}`;
  el.title = 'Resize';
  mod.appendChild(el);

  let active = false;
  let fromCompact = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    fromCompact = !mod.classList.contains('is-expanded');
    if (fromCompact) {
      const size = beginResizeExpand(mod);
      startW = size.width;
      startH = size.height;
    } else {
      startW = mod.offsetWidth;
      startH = mod.offsetHeight;
    }
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    mod.classList.add('is-resizing');
    document.getElementById('viewport-root')?.classList.add('is-ui-dragging');
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const scale = getEffectiveZoom() || 1;
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    const nextW = horizontal ? startW + dx : startW;
    const nextH = vertical ? startH + dy : startH;

    if (fromCompact) {
      applyModuleSizeLive(mod, nextW, nextH, {
        minWidth: Math.min(120, startW),
        minHeight: startH,
      });
    } else {
      applyModuleSizeLive(mod, nextW, nextH, {
        minWidth: MIN_FLOAT_W,
        minHeight: MIN_FLOAT_H,
      });
    }
    resizeCanvasToContent();
    autoScrollWorkspace(e.clientX, e.clientY);
    displaceOverlappingModules(mod);
  });

  const end = (e) => {
    if (!active) return;
    const compact = fromCompact;
    const barStartH = startH;
    active = false;
    fromCompact = false;
    mod.classList.remove('is-resizing');
    document.getElementById('viewport-root')?.classList.remove('is-ui-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    const w = mod.offsetWidth;
    const h = mod.offsetHeight;
    const grewVertical = h > barStartH + 4;
    if (compact && !grewVertical) {
      applyModuleSizeLive(mod, w, barStartH, {
        minWidth: Math.min(MIN_FLOAT_W, startW),
        minHeight: barStartH,
      });
      if (w < MIN_FLOAT_W) {
        mod.style.width = `${MIN_FLOAT_W}px`;
        mod.dataset.userWidth = String(MIN_FLOAT_W);
      }
    } else {
      applyModuleSizeUser(mod, w, h);
    }
    ensureFloatingResize(mod);
    displaceOverlappingModules(mod);
    commitModulePosition(mod);
    saveExpandedLayout(mod);
    notifySessionChange();
  };

  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
}

function wireModuleDrag(mod, dockEl) {
  const bar = mod.querySelector('.dock-module-bar');
  if (!bar) return;

  const DRAG_THRESHOLD = 6;
  let active = false;
  let mode = null;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let captureEl = null;
  let dragFromHandle = false;
  let viewportRoot = null;

  function canDragFromDock() {
    return mod.classList.contains('dock-module--expandable')
      || mod.classList.contains('dock-module--draggable');
  }

  function getHandle() {
    return mod.querySelector('.dock-drag-handle');
  }

  function setDragLock(on) {
    viewportRoot = viewportRoot || document.getElementById('viewport-root');
    viewportRoot?.classList.toggle('is-ui-dragging', on);
  }

  function bindDragListeners() {
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  }

  function unbindDragListeners() {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  }

  function syncDragOffset(clientX, clientY) {
    const canvas = ensureModuleCanvas();
    const local = pointerToCanvasLocal(canvas, clientX, clientY);
    offsetX = local.x - (parseInt(mod.style.left, 10) || 0);
    offsetY = local.y - (parseInt(mod.style.top, 10) || 0);
  }

  function placeAtPointer(clientX, clientY) {
    const canvas = ensureModuleCanvas();
    const local = pointerToCanvasLocal(canvas, clientX, clientY);
    mod.style.left = `${Math.max(0, Math.round(local.x - offsetX))}px`;
    mod.style.top = `${Math.max(0, Math.round(local.y - offsetY))}px`;
    resizeCanvasToContent();
    autoScrollWorkspace(clientX, clientY);
  }

  function isBlockedTarget(target) {
    if (target.closest('.dock-drag-handle')) return false;
    return !!target.closest('.dock-module-dock, .dock-module-chevron, .dock-resize-edge, .dock-chip, .root-chip, input, select, textarea, a');
  }

  function onPointerDown(e, sourceEl) {
    if (e.button !== 0) return;
    if (isBlockedTarget(e.target)) return;

    const handleEl = getHandle();
    dragFromHandle = sourceEl === handleEl;
    if (!mod.classList.contains('is-floating')) {
      if (!canDragFromDock()) return;
      if (!dragFromHandle) return;
    } else if (e.target.closest('button') && !dragFromHandle) {
      return;
    }

    active = true;
    mode = null;
    startX = e.clientX;
    startY = e.clientY;
    captureEl = sourceEl;
    bar.dataset.dragMoved = '0';
    if (mod.classList.contains('is-floating') && mod.style.left !== '' && mod.style.top !== '') {
      syncDragOffset(startX, startY);
    } else {
      offsetX = 0;
      offsetY = 0;
    }
    setDragLock(true);
    bindDragListeners();
    sourceEl.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    handleEl?.classList.add('is-dragging');
    e.preventDefault();
    e.stopPropagation();
  }

  function onPointerMove(e) {
    if (!active) return;
    const canvas = ensureModuleCanvas();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!mode) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      bar.dataset.dragMoved = '1';

      const dockRect = dockEl.getBoundingClientRect();
      const inDockColumn = e.clientX < dockRect.right + 12;
      const horizontalIntent = Math.abs(dx) >= Math.abs(dy);
      const verticalReorder = !mod.classList.contains('is-floating')
        && inDockColumn
        && !horizontalIntent
        && Math.abs(dy) > DRAG_THRESHOLD;

      if (verticalReorder) {
        mode = 'reorder';
        reorderInDock(mod, dockEl, e.clientY);
        return;
      }

      mode = 'float';
      mod.classList.add('is-dragging-float');
      if (!mod.classList.contains('is-floating')) {
        const anchor = pointerToCanvasLocal(canvas, startX, startY);
        const grabX = Math.min((dockEl?.offsetWidth || 208) * 0.35, 48);
        const grabY = 16;
        offsetX = grabX;
        offsetY = grabY;
        beginCollapsedFloat(mod, dockEl);
        mod.style.left = `${snap(Math.max(0, anchor.x - grabX))}px`;
        mod.style.top = `${snap(Math.max(0, anchor.y - grabY))}px`;
      }

      mod.style.zIndex = String(1000 + expandedFloatingModules().length + 1);
    }

    if (mode === 'reorder') {
      reorderInDock(mod, dockEl, e.clientY);
      return;
    }

    if (mode === 'float') {
      placeAtPointer(e.clientX, e.clientY);
      if (mod.classList.contains('is-expanded')) {
        displaceOverlappingModules(mod);
      }
    }
  }

  async function onPointerUp(e) {
    if (!active) return;
    const wasFloat = mode === 'float';
    const wasReorder = mode === 'reorder';
    active = false;
    unbindDragListeners();
    setDragLock(false);
    bar.classList.remove('is-dragging');
    getHandle()?.classList.remove('is-dragging');
    try { captureEl?.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    captureEl = null;
    dragFromHandle = false;

    if (wasFloat) {
      mod.classList.remove('is-dragging-float');
      const overDock = isPointerOverDock(e.clientX, dockEl);

      if (mod.classList.contains('is-float-preview')) {
        if (overDock) {
          await animateRedock(mod, dockEl, e.clientY);
          updateWorkspaceZoom();
          notifySessionChange();
        } else {
          finalizeBarFloat(mod);
          await settleModulePosition(mod);
        }
      } else if (mod.classList.contains('is-floating') && overDock) {
        await animateRedock(mod, dockEl, e.clientY);
        updateWorkspaceZoom();
        notifySessionChange();
      } else {
        await settleModulePosition(mod);
        notifySessionChange();
      }
    } else if (wasReorder) {
      notifySessionChange();
    }
    mode = null;
    setTimeout(() => { bar.dataset.dragMoved = '0'; }, 0);
  }

  bar.addEventListener('pointerdown', (e) => {
    const handleEl = e.target.closest('.dock-drag-handle');
    if (handleEl) {
      onPointerDown(e, handleEl);
      return;
    }
    onPointerDown(e, bar);
  });

  mod.querySelector('.dock-module-dock')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (mod.classList.contains('is-floating') && mod.classList.contains('is-expanded')) {
      collapseFloatingModule(mod);
    } else {
      closeFloatingModule(mod);
    }
  });
}

function isBarOnlyModule(mod) {
  return mod.classList.contains('dock-module--draggable')
    && !mod.classList.contains('dock-module--expandable');
}

function finalizeBarFloat(mod) {
  mod.classList.remove('is-float-preview');
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });
  mod.classList.remove('is-expanded');
  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;
  if (!mod.style.width) {
    mod.style.width = `${mod.offsetWidth || 208}px`;
  }
  mod.style.height = '';
  mod.style.minHeight = 'var(--dock-bar-h)';
  ensureFloatingResize(mod);
  commitModulePosition(mod);
  notifySessionChange();
}

function reorderInDock(mod, dockEl, clientY) {
  insertModuleInDockAtY(mod, dockEl, clientY);
  notifySessionChange();
}

export function initDockModules(dockEl) {
  dockEl.querySelectorAll('.dock-module').forEach((mod) => {
    registerModuleHome(mod, dockEl);
    wireModuleDrag(mod, dockEl);
  });
  orderModules(dockEl);
}

export function collectModulesState() {
  const modules = {};
  document.querySelectorAll('.dock-module').forEach((mod) => {
    const id = mod.dataset.dockId;
    if (!id) return;
    const floating = mod.classList.contains('is-floating');
    const expanded = mod.classList.contains('is-expanded');
    if (floating && expanded) saveExpandedLayout(mod);

    const savedW = parseInt(mod.dataset.userWidth, 10) || null;
    const savedH = parseInt(mod.dataset.userHeight, 10) || null;

    modules[id] = {
      expanded: floating && expanded,
      floating,
      barOnly: floating && isBarOnlyModule(mod),
      left: floating ? parseInt(mod.style.left, 10) || 0 : null,
      top: floating ? parseInt(mod.style.top, 10) || 0 : null,
      width: floating ? (savedW || mod.offsetWidth) : null,
      height: floating ? (savedH || (expanded ? mod.offsetHeight : null)) : null,
      zIndex: floating ? (parseInt(mod.style.zIndex, 10) || null) : null,
    };
  });
  return modules;
}

export function applyModulesState(modules = {}, zoom = 1, dockOrders = {}) {
  if (zoom != null) setUserZoom(zoom);
  applyDockOrders(dockOrders);

  for (const [id, state] of Object.entries(modules)) {
    const mod = document.querySelector(`[data-dock-id="${id}"]`);
    if (!mod) continue;

    if (state.floating) {
      const dockEl = findOriginDock(mod);
      if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);

      if (state.expanded) {
        expandHandlers.get(id)?.(true, { silent: true });
        mod.classList.remove('is-float-preview');
        if (state.width) mod.dataset.userWidth = String(state.width);
        if (state.height) mod.dataset.userHeight = String(state.height);
        if (state.width && state.height) {
          applyModuleSizeUser(mod, state.width, state.height);
        } else {
          const measured = measureModuleFullSize(mod);
          applyModuleSizeUser(mod, measured.width, measured.height);
        }
        ensureFloatingResize(mod);
      } else {
        expandHandlers.get(id)?.(false, { silent: true });
        mod.classList.remove('is-expanded', 'is-float-preview');
        const panel = mod.querySelector('.dock-module-panel');
        if (panel) panel.hidden = true;
        if (state.width) {
          mod.dataset.userWidth = String(state.width);
          mod.style.width = `${state.width}px`;
        }
        if (state.height) mod.dataset.userHeight = String(state.height);
        mod.style.height = '';
        mod.style.minHeight = 'var(--dock-bar-h)';
        ensureFloatingResize(mod);
      }

      if (state.left != null) mod.style.left = `${state.left}px`;
      if (state.top != null) mod.style.top = `${state.top}px`;
      if (state.zIndex != null) mod.style.zIndex = String(state.zIndex);
    } else {
      const dockEl = findOriginDock(mod);
      if (mod.classList.contains('is-floating') && dockEl) redock(mod, dockEl);
      else if (dockEl && mod.parentElement !== dockEl) {
        dockEl.appendChild(mod);
        orderModules(dockEl);
      }
      expandHandlers.get(id)?.(false, { silent: true });
    }
  }

  updateWorkspaceZoom();
}

export function resetBlockPositions() {
  [...document.querySelectorAll('.dock-module.is-floating')].forEach((mod) => {
    const dockEl = findOriginDock(mod);
    if (dockEl) redock(mod, dockEl);
  });
  resetUserZoom();
  updateWorkspaceZoom();
  notifySessionChange();
}

export function ensureDockChrome(el, id, label, { expandable = true, draggable = expandable } = {}) {
  el.classList.add('dock-module', `dock-module--${id}`);
  el.classList.toggle('dock-module--expandable', expandable);
  el.classList.toggle('dock-module--draggable', draggable);
  el.dataset.dockId = id;
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  if (draggable && !bar.querySelector('.dock-drag-handle')) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'dock-drag-handle';
    handle.title = 'Drag';
    handle.setAttribute('aria-label', 'Drag module');
    handle.textContent = '⠿';
    bar.prepend(handle);
  }

  if (expandable && !bar.querySelector('.dock-module-dock')) {
    const dockBtn = document.createElement('button');
    dockBtn.type = 'button';
    dockBtn.className = 'dock-module-dock';
    dockBtn.title = 'Collapse to bar';
    dockBtn.setAttribute('aria-label', 'Collapse module to bar');
    dockBtn.textContent = '−';
    bar.append(dockBtn);
  }

  let labelEl = bar.querySelector('.dock-module-label');
  if (!labelEl) {
    labelEl = document.createElement('span');
    labelEl.className = 'dock-module-label';
    bar.querySelector('.dock-drag-handle')?.after(labelEl);
  }
  labelEl.textContent = label;

  if (!expandable) {
    bar.querySelector('.dock-module-chevron')?.remove();
    bar.querySelector('.dock-module-dock')?.remove();
  }
  if (!draggable) {
    bar.querySelector('.dock-drag-handle')?.remove();
  }
}

export function persistModuleSession() {
  notifySessionChange();
}

export function syncChipLayers(hub, container = document) {
  const root = container?.querySelectorAll ? container : document;
  root.querySelectorAll('.dock-chip[data-chord], .dock-chip[data-label]').forEach((chip) => {
    const key = chip.dataset.chord || chip.dataset.label;
    if (!key) return;
    const slot = hub.getLayerSlot(key);
    chip.classList.toggle('fb-active', slot > 0);
    chip.classList.toggle('fb-active-1', slot === 1);
    chip.classList.toggle('fb-active-2', slot === 2);
    chip.classList.toggle('fb-active-3', slot === 3);
  });
}

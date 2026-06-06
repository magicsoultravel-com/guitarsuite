import { isRestoring, touchSession } from './sessionState.js';
import {
  MODULE_ORDER,
  applyModuleSize,
  applyModuleSizeUser,
  commitModulePosition,
  DEFAULT_FLOAT_H,
  DEFAULT_FLOAT_W,
  ensureModuleCanvas,
  expandedFloatingModules,
  findInitialPosition,
  getDefaultDockOrder,
  getEffectiveZoom,
  getUserZoom,
  measureModuleFullSize,
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

function expandFloatingModule(mod, { keepPosition = false, skipResizeHandles = false } = {}) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true });
  mod.classList.remove('is-float-preview');

  const prevTop = parseInt(mod.style.top, 10) || 0;
  const prevLeft = parseInt(mod.style.left, 10) || 0;
  const measured = measureModuleFullSize(mod);
  const w = parseInt(mod.dataset.userWidth, 10)
    || snap(Math.min(measured.width, DEFAULT_FLOAT_W));
  const h = parseInt(mod.dataset.userHeight, 10)
    || snap(Math.min(measured.height, DEFAULT_FLOAT_H));
  applyModuleSizeUser(mod, w, h);
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
  if (expanded) {
    wireResizeEdge(mod, 's', { horizontal: false, vertical: true });
    wireResizeEdge(mod, 'se', { horizontal: true, vertical: true });
  } else {
    wireResizeEdge(mod, 'se', { horizontal: true, vertical: false });
  }
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

function redock(mod, dockEl) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });
  clearFloatStyles(mod);
  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;
  dockEl.appendChild(mod);
  orderModules(dockEl);
}

export function openFloatingModule(mod, barClientRect) {
  const dockEl = findOriginDock(mod);
  if (mod.classList.contains('is-floating') && !mod.classList.contains('is-expanded')) {
    expandFloatingModule(mod, { keepPosition: true });
    return;
  }
  if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
  expandFloatingModule(mod);
}

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
    if (isOpen) closeFloatingModule(el);
    else openFloatingModule(el, bar.getBoundingClientRect());
  };

  el.querySelector('.dock-module-chevron')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
}

function wireResizeEdge(mod, position, { horizontal, vertical }) {
  const el = document.createElement('div');
  el.className = `dock-resize-edge dock-resize-edge--${position}`;
  el.title = 'Resize';
  mod.appendChild(el);

  let active = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!mod.classList.contains('is-expanded')) {
      expandFloatingModule(mod, { keepPosition: true, skipResizeHandles: true });
    }
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = mod.offsetWidth;
    startH = mod.offsetHeight;
    document.getElementById('viewport-root')?.classList.add('is-ui-dragging');
    el.setPointerCapture(e.pointerId);
  });

  el.addEventListener('pointermove', (e) => {
    if (!active) return;
    const scale = getEffectiveZoom() || 1;
    const dx = (e.clientX - startX) / scale;
    const dy = (e.clientY - startY) / scale;
    applyModuleSizeUser(
      mod,
      horizontal ? startW + dx : startW,
      vertical ? startH + dy : startH,
    );
    mod.classList.add('is-resizing');
  });

  const end = (e) => {
    if (!active) return;
    active = false;
    mod.classList.remove('is-resizing');
    document.getElementById('viewport-root')?.classList.remove('is-ui-dragging');
    try { el.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    ensureFloatingResize(mod);
    commitModulePosition(mod);
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
    mod.style.left = `${snap(Math.max(0, local.x - offsetX))}px`;
    mod.style.top = `${snap(Math.max(0, local.y - offsetY))}px`;
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
      const inDockColumn = e.clientX < dockRect.right + 4;
      const horizontalIntent = Math.abs(dx) >= Math.abs(dy);
      const verticalReorder = !dragFromHandle
        && !mod.classList.contains('is-floating')
        && inDockColumn
        && !horizontalIntent
        && Math.abs(dy) > DRAG_THRESHOLD;

      if (verticalReorder) {
        mode = 'reorder';
        reorderInDock(mod, dockEl, e.clientY);
        return;
      }

      mode = 'float';
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
    }
  }

  function onPointerUp(e) {
    if (!active) return;
    const wasFloat = mode === 'float';
    active = false;
    unbindDragListeners();
    setDragLock(false);
    bar.classList.remove('is-dragging');
    getHandle()?.classList.remove('is-dragging');
    try { captureEl?.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    captureEl = null;
    dragFromHandle = false;

    if (wasFloat) {
      if (mod.classList.contains('is-float-preview')) {
        const dockRect = dockEl.getBoundingClientRect();
        if (e.clientX > dockRect.right + 8) {
          finalizeBarFloat(mod);
        } else {
          redock(mod, dockEl);
        }
      } else {
        commitModulePosition(mod);
        notifySessionChange();
      }
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
    closeFloatingModule(mod);
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
  const siblings = [...dockEl.querySelectorAll('.dock-module:not(.is-floating)')].filter((s) => s !== mod);
  for (const sib of siblings) {
    const rect = sib.getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      dockEl.insertBefore(mod, sib);
      notifySessionChange();
      return;
    }
  }
  dockEl.appendChild(mod);
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
    modules[id] = {
      expanded: floating && expanded,
      floating,
      barOnly: floating && isBarOnlyModule(mod),
      left: floating ? parseInt(mod.style.left, 10) || 0 : null,
      top: floating ? parseInt(mod.style.top, 10) || 0 : null,
      width: floating ? mod.offsetWidth : null,
      height: floating && expanded ? mod.offsetHeight : null,
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
        if (state.width && state.height) {
          applyModuleSizeUser(mod, state.width, state.height);
        } else {
          const measured = measureModuleFullSize(mod);
          applyModuleSizeUser(
            mod,
            snap(Math.min(measured.width, DEFAULT_FLOAT_W)),
            snap(Math.min(measured.height, DEFAULT_FLOAT_H)),
          );
        }
        ensureFloatingResize(mod);
      } else {
        expandHandlers.get(id)?.(false, { silent: true });
        mod.classList.remove('is-expanded', 'is-float-preview');
        const panel = mod.querySelector('.dock-module-panel');
        if (panel) panel.hidden = true;
        if (state.width) mod.style.width = `${state.width}px`;
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
    dockBtn.title = 'Close';
    dockBtn.setAttribute('aria-label', 'Close module');
    dockBtn.textContent = '⌂';
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

import { isRestoring, touchSession } from './sessionState.js';
import {
  MODULE_ORDER,
  applyModuleSize,
  applyModuleSizeUser,
  commitModulePosition,
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
      requestAnimationFrame(() => updateWorkspaceZoom());
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

function expandFloatingModule(mod, { keepPosition = false } = {}) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true });
  mod.classList.remove('is-float-preview');

  const { width, height } = measureModuleFullSize(mod);
  applyModuleSize(mod, width, height);
  ensureResizeHandle(mod);
  mod.style.zIndex = String(1000 + expandedFloatingModules().length);

  const hasPosition = mod.style.left !== '' && mod.style.top !== '';
  if (keepPosition && hasPosition) {
    commitModulePosition(mod);
  } else {
    findInitialPosition(mod);
    commitModulePosition(mod);
  }
  notifySessionChange();
}

/** Move to canvas as a collapsed bar preview — expand on drop, not on drag start. */
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
  mod.querySelector('.dock-resize-handle')?.remove();
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
  mod.querySelector('.dock-resize-handle')?.remove();
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

function ensureResizeHandle(mod) {
  if (mod.querySelector('.dock-resize-handle')) return;
  const grip = document.createElement('div');
  grip.className = 'dock-resize-handle';
  grip.title = 'Resize';
  mod.appendChild(grip);
  wireResize(mod, grip);
}

function wireResize(mod, grip) {
  let active = false;
  let startX = 0;
  let startY = 0;
  let startW = 0;
  let startH = 0;

  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    active = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = mod.offsetWidth;
    startH = mod.offsetHeight;
    document.getElementById('viewport-root')?.classList.add('is-ui-dragging');
    grip.setPointerCapture(e.pointerId);
  });

  grip.addEventListener('pointermove', (e) => {
    if (!active) return;
    const scale = getEffectiveZoom() || 1;
    applyModuleSizeUser(
      mod,
      startW + (e.clientX - startX) / scale,
      startH + (e.clientY - startY) / scale,
    );
    mod.classList.add('is-resizing');
  });

  const end = (e) => {
    if (!active) return;
    active = false;
    mod.classList.remove('is-resizing');
    document.getElementById('viewport-root')?.classList.remove('is-ui-dragging');
    try { grip.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    commitModulePosition(mod);
    notifySessionChange();
  };

  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
}

function wireModuleDrag(mod, dockEl) {
  const bar = mod.querySelector('.dock-module-bar');
  const handle = mod.querySelector('.dock-drag-handle');
  if (!bar) return;

  const DRAG_THRESHOLD = 6;
  let active = false;
  let mode = null;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;
  let captureEl = null;
  let viewportRoot = null;

  function setDragLock(on) {
    viewportRoot = viewportRoot || document.getElementById('viewport-root');
    viewportRoot?.classList.toggle('is-ui-dragging', on);
  }

  function syncDragOffset(clientX, clientY) {
    const canvas = ensureModuleCanvas();
    const local = pointerToCanvasLocal(canvas, clientX, clientY);
    offsetX = local.x - (parseInt(mod.style.left, 10) || 0);
    offsetY = local.y - (parseInt(mod.style.top, 10) || 0);
  }

  function isBlockedTarget(target) {
    return !!target.closest('.dock-module-dock, .dock-module-chevron, .dock-resize-handle, .dock-chip, .root-chip, input, select, textarea, a');
  }

  function onPointerDown(e, sourceEl) {
    if (e.button !== 0) return;
    if (isBlockedTarget(e.target)) return;
    if (!mod.classList.contains('is-floating')) {
      if (!mod.classList.contains('dock-module--expandable')) return;
      if (sourceEl !== handle) return;
    } else if (e.target.closest('button') && sourceEl !== handle && !e.target.closest('.dock-drag-handle')) {
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
    sourceEl.setPointerCapture(e.pointerId);
    bar.classList.add('is-dragging');
    handle?.classList.add('is-dragging');
    e.preventDefault();
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
      const verticalReorder = !mod.classList.contains('is-floating')
        && inDockColumn
        && Math.abs(dy) > Math.abs(dx) * 1.15;

      if (verticalReorder) {
        mode = 'reorder';
        reorderInDock(mod, dockEl, e.clientY);
        return;
      }

      mode = 'float';
      if (!mod.classList.contains('is-floating')) {
        beginCollapsedFloat(mod, dockEl);
        const anchor = pointerToCanvasLocal(canvas, startX, startY);
        const grabX = Math.min(mod.offsetWidth * 0.35, 48);
        const grabY = 16;
        mod.style.left = `${snap(Math.max(0, anchor.x - grabX))}px`;
        mod.style.top = `${snap(Math.max(0, anchor.y - grabY))}px`;
        syncDragOffset(startX, startY);
      }

      mod.style.zIndex = String(1000 + expandedFloatingModules().length + 1);
    }

    if (mode === 'reorder') {
      reorderInDock(mod, dockEl, e.clientY);
      return;
    }

    if (mode === 'float') {
      const local = pointerToCanvasLocal(canvas, e.clientX, e.clientY);
      mod.style.left = `${snap(Math.max(0, local.x - offsetX))}px`;
      mod.style.top = `${snap(Math.max(0, local.y - offsetY))}px`;
    }
  }

  function onPointerUp(e) {
    if (!active) return;
    const wasFloat = mode === 'float';
    active = false;
    setDragLock(false);
    bar.classList.remove('is-dragging');
    handle?.classList.remove('is-dragging');
    try { captureEl?.releasePointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    captureEl = null;

    if (wasFloat) {
      if (mod.classList.contains('is-float-preview')) {
        const dockRect = dockEl.getBoundingClientRect();
        if (e.clientX > dockRect.right + 8) {
          expandFloatingModule(mod, { keepPosition: true });
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

  if (handle) {
    handle.addEventListener('pointerdown', (e) => onPointerDown(e, handle));
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }

  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.dock-drag-handle')) return;
    onPointerDown(e, bar);
  });
  bar.addEventListener('pointermove', onPointerMove);
  bar.addEventListener('pointerup', onPointerUp);
  bar.addEventListener('pointercancel', onPointerUp);

  mod.querySelector('.dock-module-dock')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFloatingModule(mod);
  });
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
      floating: floating && expanded,
      left: floating ? parseInt(mod.style.left, 10) || 0 : null,
      top: floating ? parseInt(mod.style.top, 10) || 0 : null,
      width: floating ? mod.offsetWidth : null,
      height: floating ? mod.offsetHeight : null,
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

    if (state.floating && state.expanded) {
      const dockEl = findOriginDock(mod);
      if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
      expandHandlers.get(id)?.(true, { silent: true });
      measureModuleFullSize(mod);
      if (state.width && state.height) {
        applyModuleSizeUser(mod, state.width, state.height);
      } else {
        const full = measureModuleFullSize(mod);
        applyModuleSize(mod, full.width, full.height);
      }
      if (state.left != null) mod.style.left = `${state.left}px`;
      if (state.top != null) mod.style.top = `${state.top}px`;
      if (state.zIndex != null) mod.style.zIndex = String(state.zIndex);
      mod.classList.remove('is-float-preview');
      ensureResizeHandle(mod);
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

export function ensureDockChrome(el, id, label, { expandable = true } = {}) {
  el.classList.add('dock-module', `dock-module--${id}`);
  el.classList.toggle('dock-module--expandable', expandable);
  el.dataset.dockId = id;
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  if (expandable && !bar.querySelector('.dock-drag-handle')) {
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
    bar.querySelector('.dock-drag-handle')?.remove();
    bar.querySelector('.dock-module-dock')?.remove();
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

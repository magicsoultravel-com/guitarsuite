import { isRestoring, touchSession } from './sessionState.js';
import {
  DOCK_GAP,
  applyModuleSize,
  ensureModuleCanvas,
  expandedFloatingModules,
  getDefaultDockOrder,
  getEffectiveZoom,
  getUserZoom,
  measureModuleFullSize,
  pointerToCanvasLocal,
  positionModuleAtBar,
  resetUserZoom,
  setUserZoom,
  snap,
  updateWorkspaceZoom,
} from './workspaceLayout.js';

export const DEFAULT_ORDER = ['root', 'chords', 'fretboard', 'now-playing', 'tools'];

const expandHandlers = new Map();
const moduleHomes = new Map();
const savedDockOrders = {};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
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

function notifySessionChange() {
  if (isRestoring()) return;
  touchSession(collectModulesState(), getUserZoom(), collectDockOrders());
}

export function registerModuleHome(mod, dockEl) {
  if (mod?.dataset?.dockId && dockEl) {
    moduleHomes.set(mod.dataset.dockId, dockEl);
  }
}

function findOriginDock(mod) {
  const id = mod.dataset.dockId;
  if (id && moduleHomes.has(id)) return moduleHomes.get(id);
  const dockId = mod.dataset.originDock;
  if (dockId) return document.getElementById(dockId);
  return document.getElementById('tool-dock') || document.getElementById('content-dock');
}

export function collectDockOrders() {
  const orders = {};
  for (const dockEl of document.querySelectorAll('.tool-dock, .content-dock')) {
    orders[dockEl.id] = [...dockEl.querySelectorAll('.dock-module:not(.is-floating)')]
      .map((m) => m.dataset.dockId)
      .filter(Boolean);
  }
  return orders;
}

function loadDockOrder(dockEl) {
  const saved = savedDockOrders[dockEl.id];
  const defaults = getDefaultDockOrder(dockEl.id);
  const present = [...dockEl.querySelectorAll('.dock-module')]
    .map((m) => m.dataset.dockId)
    .filter(Boolean);
  const order = saved ? [...saved] : [...defaults];
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
  Object.assign(savedDockOrders, orders);
  for (const dockEl of document.querySelectorAll('.tool-dock, .content-dock')) {
    orderModules(dockEl);
  }
}

function floatModule(mod, dockEl) {
  if (mod.classList.contains('is-floating')) return;

  const canvas = ensureModuleCanvas();
  mod.dataset.originDock = dockEl?.id || mod.parentElement?.id || 'tool-dock';
  mod.classList.add('is-floating');
  canvas.appendChild(mod);
  mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
  ensureResizeHandle(mod);
}

function clearFloatStyles(mod) {
  mod.classList.remove('is-floating');
  mod.style.left = '';
  mod.style.top = '';
  mod.style.width = '';
  mod.style.height = '';
  mod.style.zIndex = '';
  delete mod.dataset.originDock;
  delete mod.dataset.maxWidth;
  delete mod.dataset.maxHeight;
  mod.querySelector('.dock-resize-handle')?.remove();
}

function redock(mod, dockEl) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true });

  clearFloatStyles(mod);

  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;

  mod.querySelector('.dock-module-dock')?.setAttribute('hidden', '');
  dockEl.appendChild(mod);
  orderModules(dockEl);
}

export function openFloatingModule(mod, barClientRect) {
  const dockEl = findOriginDock(mod);
  const barRect = barClientRect || mod.querySelector('.dock-module-bar')?.getBoundingClientRect();
  if (!barRect) return;

  if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);

  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true });

  const { width, height } = measureModuleFullSize(mod);
  applyModuleSize(mod, width, height);
  positionModuleAtBar(mod, barRect);

  mod.style.zIndex = String(1000 + expandedFloatingCount());

  updateWorkspaceZoom();
  notifySessionChange();
}

export function closeFloatingModule(mod) {
  const dockEl = findOriginDock(mod);
  if (mod.classList.contains('is-floating') && dockEl) {
    redock(mod, dockEl);
  } else {
    const setExpanded = expandHandlers.get(mod.dataset.dockId);
    setExpanded?.(false, { silent: true });
  }

  updateWorkspaceZoom();
  notifySessionChange();
}

function expandedFloatingCount() {
  return expandedFloatingModules().length;
}

export function wireDockBarToggle(el, setExpanded, ignoreSelector) {
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  const toggle = (e) => {
    const panel = el.querySelector('.dock-module-panel');
    const isOpen = panel && !panel.hidden && el.classList.contains('is-floating');
    if (isOpen) closeFloatingModule(el);
    else openFloatingModule(el, bar.getBoundingClientRect());
  };

  bar.addEventListener('click', (e) => {
    if (e.target.closest('.dock-drag-handle, .dock-module-dock, .dock-module-chevron, .dock-resize-handle')) return;
    if (ignoreSelector && e.target.closest(ignoreSelector)) return;
    toggle(e);
  });

  el.querySelector('.dock-module-chevron')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle(e);
  });
}

function ensureResizeHandle(mod) {
  if (mod.querySelector('.dock-resize-handle')) return;
  const grip = document.createElement('div');
  grip.className = 'dock-resize-handle';
  grip.title = 'Resize';
  grip.setAttribute('aria-label', 'Resize panel');
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
    grip.setPointerCapture(e.pointerId);
  });

  grip.addEventListener('pointermove', (e) => {
    if (!active) return;
    const scale = getEffectiveZoom() || 1;
    const dw = (e.clientX - startX) / scale;
    const dh = (e.clientY - startY) / scale;
    applyModuleSize(mod, startW + dw, startH + dh);
    updateWorkspaceZoom();
  });

  const end = (e) => {
    if (!active) return;
    active = false;
    try {
      grip.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
    notifySessionChange();
  };

  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
}

function reorderInDock(mod, dockEl, clientY) {
  const siblings = [...dockEl.querySelectorAll('.dock-module:not(.is-floating)')];
  const others = siblings.filter((s) => s !== mod);
  let inserted = false;

  for (const sib of others) {
    const rect = sib.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    if (clientY < mid) {
      dockEl.insertBefore(mod, sib);
      inserted = true;
      break;
    }
  }

  if (!inserted) dockEl.appendChild(mod);
  orderModules(dockEl);
}

function wireDrag(mod, dockEl) {
  const handle = mod.querySelector('.dock-drag-handle');
  if (!handle) return;

  const DRAG_THRESHOLD = 5;
  let armed = false;
  let mode = null;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    armed = true;
    mode = null;
    startX = e.clientX;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!armed && !mode) return;

    const canvas = ensureModuleCanvas();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!mode) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

      if (!mod.classList.contains('is-floating') && Math.abs(dy) > Math.abs(dx)) {
        mode = 'reorder';
        handle.classList.add('is-dragging');
        reorderInDock(mod, dockEl, e.clientY);
        return;
      }

      mode = 'float';
      if (!mod.classList.contains('is-floating')) {
        const barRect = mod.querySelector('.dock-module-bar')?.getBoundingClientRect();
        openFloatingModule(mod, barRect);
      }
      handle.classList.add('is-dragging');
      const local = pointerToCanvasLocal(canvas, e.clientX, e.clientY);
      offsetX = local.x - (parseInt(mod.style.left, 10) || 0);
      offsetY = local.y - (parseInt(mod.style.top, 10) || 0);
      mod.style.zIndex = String(1000 + expandedFloatingCount() + 1);
    }

    if (mode === 'reorder') {
      reorderInDock(mod, dockEl, e.clientY);
      return;
    }

    if (mode === 'float') {
      const local = pointerToCanvasLocal(canvas, e.clientX, e.clientY);
      const canvasW = canvas.clientWidth;
      const canvasH = canvas.clientHeight;
      const maxLeft = Math.max(0, canvasW - mod.offsetWidth);
      const maxTop = Math.max(0, canvasH - mod.offsetHeight);
      mod.style.left = `${snap(clamp(local.x - offsetX, 0, maxLeft))}px`;
      mod.style.top = `${snap(clamp(local.y - offsetY, 0, maxTop))}px`;
    }
  });

  const endDrag = (e) => {
    armed = false;
    handle.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }

    if (mode === 'reorder') {
      notifySessionChange();
    } else if (mode === 'float') {
      updateWorkspaceZoom();
      notifySessionChange();
    }
    mode = null;
  };

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  mod.querySelector('.dock-module-dock')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFloatingModule(mod);
  });
}

export function initDockModules(dockEl) {
  dockEl.querySelectorAll('.dock-module').forEach((mod) => {
    registerModuleHome(mod, dockEl);
    wireDrag(mod, dockEl);
  });
  orderModules(dockEl);
}

export function collectModulesState() {
  const modules = {};
  document.querySelectorAll('.dock-module').forEach((mod) => {
    const id = mod.dataset.dockId;
    if (!id) return;
    const panel = mod.querySelector('.dock-module-panel');
    const floating = mod.classList.contains('is-floating');
    const expanded = Boolean(panel && !panel.hidden);
    modules[id] = {
      expanded: floating && expanded,
      floating: floating && expanded,
      dockId: mod.dataset.originDock || moduleHomes.get(id)?.id || 'tool-dock',
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
      const dockEl = document.getElementById(state.dockId) || findOriginDock(mod);
      if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
      const setExpanded = expandHandlers.get(id);
      setExpanded?.(true, { silent: true });
      measureModuleFullSize(mod);
      if (state.width && state.height) {
        applyModuleSize(mod, state.width, state.height);
      } else {
        const full = measureModuleFullSize(mod);
        applyModuleSize(mod, full.width, full.height);
      }
      if (state.left != null) mod.style.left = `${state.left}px`;
      if (state.top != null) mod.style.top = `${state.top}px`;
      if (state.zIndex != null) mod.style.zIndex = String(state.zIndex);
      if (state.top != null) mod.style.top = `${state.top}px`;
      if (state.zIndex != null) mod.style.zIndex = String(state.zIndex);
    } else {
      const dockEl = document.getElementById(state.dockId) || findOriginDock(mod);
      if (mod.classList.contains('is-floating') && dockEl) {
        redock(mod, dockEl);
      } else if (dockEl && mod.parentElement !== dockEl) {
        dockEl.appendChild(mod);
        orderModules(dockEl);
      }
      const setExpanded = expandHandlers.get(id);
      setExpanded?.(false, { silent: true });
    }
  }

  updateWorkspaceZoom();
}

export function collapseAllModules() {
  [...document.querySelectorAll('.dock-module.is-floating.is-expanded')].forEach((mod) => {
    closeFloatingModule(mod);
  });
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
  el.dataset.dockId = id;

  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  if (!bar.querySelector('.dock-drag-handle')) {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'dock-drag-handle';
    handle.title = 'Drag to reorder (vertical) or move to workspace';
    handle.setAttribute('aria-label', 'Drag panel');
    handle.textContent = '⠿';
    bar.prepend(handle);
  }

  if (!bar.querySelector('.dock-module-dock')) {
    const dockBtn = document.createElement('button');
    dockBtn.type = 'button';
    dockBtn.className = 'dock-module-dock';
    dockBtn.title = 'Close and return to sidebar';
    dockBtn.setAttribute('aria-label', 'Close panel');
    dockBtn.textContent = '⌂';
    dockBtn.hidden = true;
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

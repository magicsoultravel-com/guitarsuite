import { isRestoring, touchSession } from './sessionState.js';
import {
  DOCK_GAP,
  ensureModuleCanvas,
  getCanvasScale,
  getUserZoom,
  layoutFloatingModules,
  pointerToCanvasLocal,
  resetUserZoom,
  setUserZoom,
  snap,
  updateWorkspaceZoom,
} from './workspaceLayout.js';

export const DEFAULT_ORDER = ['root', 'chords', 'fretboard', 'now-playing', 'tools'];

const expandHandlers = new Map();
const moduleHomes = new Map();

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function floatingBottomInset() {
  return document.body.classList.contains('has-selection-footer')
    ? 44 + DOCK_GAP * 3
    : DOCK_GAP;
}

export function wireDockExpand(el, { bodyClass, moduleId = null } = {}) {
  const panel = el.querySelector('.dock-module-panel');
  const chevron = el.querySelector('.dock-module-chevron');
  if (!panel || !chevron) return { setExpanded: () => {} };

  const id = moduleId || el.dataset.dockId;

  function setExpanded(open, { silent = false, skipLayout = false } = {}) {
    panel.hidden = !open;
    el.classList.toggle('is-expanded', open);
    if (bodyClass) document.body.classList.toggle(bodyClass, open);
    chevron.textContent = open ? '▼' : '▲';
    chevron.setAttribute('aria-expanded', String(open));

    if (!el.classList.contains('is-floating') && !open) {
      panel.hidden = true;
    }

    if (!skipLayout && el.classList.contains('is-floating')) {
      requestAnimationFrame(() => layoutFloatingModules());
    }

    if (!silent) notifySessionChange();
  }

  setExpanded(false, { silent: true, skipLayout: true });

  if (id) expandHandlers.set(id, setExpanded);

  return { setExpanded, panel };
}

function notifySessionChange() {
  if (isRestoring()) return;
  touchSession(collectModulesState(), getUserZoom());
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

function orderModules(dockEl) {
  if (dockEl.id !== 'tool-dock') return;
  for (const id of DEFAULT_ORDER) {
    const mod = dockEl.querySelector(`[data-dock-id="${id}"]`);
    if (mod && !mod.classList.contains('is-floating')) dockEl.appendChild(mod);
  }
}

function floatModule(mod, dockEl) {
  if (mod.classList.contains('is-floating')) return;

  const canvas = ensureModuleCanvas();
  mod.dataset.originDock = dockEl?.id || mod.parentElement?.id || 'tool-dock';
  mod.classList.add('is-floating');
  mod.style.width = `${mod.offsetWidth}px`;
  mod.style.left = '0px';
  mod.style.top = '0px';
  canvas.appendChild(mod);
  mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
}

function redock(mod, dockEl) {
  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(false, { silent: true, skipLayout: true });

  mod.classList.remove('is-floating');
  mod.style.left = '';
  mod.style.top = '';
  mod.style.width = '';
  mod.style.zIndex = '';
  delete mod.dataset.originDock;

  const panel = mod.querySelector('.dock-module-panel');
  if (panel) panel.hidden = true;

  mod.querySelector('.dock-module-dock')?.setAttribute('hidden', '');
  dockEl.appendChild(mod);
  orderModules(dockEl);
}

export function openFloatingModule(mod) {
  const dockEl = findOriginDock(mod);
  if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);

  const setExpanded = expandHandlers.get(mod.dataset.dockId);
  setExpanded?.(true, { silent: true, skipLayout: true });

  mod.style.zIndex = String(1000 + expandedFloatingCount());

  layoutFloatingModules();
  notifySessionChange();
}

export function closeFloatingModule(mod) {
  const dockEl = findOriginDock(mod);
  if (mod.classList.contains('is-floating') && dockEl) {
    redock(mod, dockEl);
  } else {
    const setExpanded = expandHandlers.get(mod.dataset.dockId);
    setExpanded?.(false, { silent: true, skipLayout: true });
  }

  layoutFloatingModules();
  notifySessionChange();
}

function expandedFloatingCount() {
  const canvas = document.getElementById('module-canvas');
  if (!canvas) return 0;
  return canvas.querySelectorAll('.dock-module.is-floating.is-expanded').length;
}

export function wireDockBarToggle(el, setExpanded, ignoreSelector) {
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  const toggle = () => {
    const panel = el.querySelector('.dock-module-panel');
    const isOpen = panel && !panel.hidden;
    if (isOpen) closeFloatingModule(el);
    else openFloatingModule(el);
  };

  bar.addEventListener('click', (e) => {
    if (e.target.closest('.dock-drag-handle, .dock-module-dock, .dock-module-chevron')) return;
    if (ignoreSelector && e.target.closest(ignoreSelector)) return;
    toggle();
  });

  el.querySelector('.dock-module-chevron')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });
}

function wireDrag(mod, dockEl) {
  const handle = mod.querySelector('.dock-drag-handle');
  if (!handle) return;

  const DRAG_THRESHOLD = 5;
  let armed = false;
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    armed = true;
    dragging = false;
    startX = e.clientX;
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });

  handle.addEventListener('pointermove', (e) => {
    if (!armed && !dragging) return;

    const canvas = ensureModuleCanvas();

    if (!dragging) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

      if (!mod.classList.contains('is-floating')) {
        floatModule(mod, dockEl);
        const setExpanded = expandHandlers.get(mod.dataset.dockId);
        setExpanded?.(true, { silent: true, skipLayout: true });
      }

      dragging = true;
      handle.classList.add('is-dragging');
      const local = pointerToCanvasLocal(canvas, e.clientX, e.clientY);
      offsetX = local.x - (parseInt(mod.style.left, 10) || 0);
      offsetY = local.y - (parseInt(mod.style.top, 10) || 0);
      mod.style.zIndex = String(1000 + expandedFloatingCount() + 1);
    }

    const local = pointerToCanvasLocal(canvas, e.clientX, e.clientY);
    const canvasW = canvas.clientWidth;
    const canvasH = canvas.clientHeight;
    const maxLeft = Math.max(0, canvasW - mod.offsetWidth);
    const maxTop = Math.max(0, canvasH - mod.offsetHeight);
    mod.style.left = `${snap(clamp(local.x - offsetX, 0, maxLeft))}px`;
    mod.style.top = `${snap(clamp(local.y - offsetY, 0, maxTop))}px`;
  });

  const endDrag = (e) => {
    armed = false;
    handle.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }

    if (!dragging) return;
    dragging = false;
    updateWorkspaceZoom();
    notifySessionChange();
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
      zIndex: floating ? (parseInt(mod.style.zIndex, 10) || null) : null,
    };
  });
  return modules;
}

export function applyModulesState(modules = {}, zoom = 1) {
  if (zoom != null) setUserZoom(zoom);

  for (const [id, state] of Object.entries(modules)) {
    const mod = document.querySelector(`[data-dock-id="${id}"]`);
    if (!mod) continue;

    if (state.floating && state.expanded) {
      const dockEl = document.getElementById(state.dockId) || findOriginDock(mod);
      if (!mod.classList.contains('is-floating')) floatModule(mod, dockEl);
      const setExpanded = expandHandlers.get(id);
      setExpanded?.(true, { silent: true, skipLayout: true });
      if (state.width) mod.style.width = `${state.width}px`;
      if (state.left != null) mod.style.left = `${state.left}px`;
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
      setExpanded?.(false, { silent: true, skipLayout: true });
    }
  }

  layoutFloatingModules();
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
  layoutFloatingModules();
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
    handle.title = 'Drag to move';
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

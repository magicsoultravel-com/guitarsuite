import { isRestoring, touchSession } from './sessionState.js';

const GRID = 8;
const DOCK_GAP = 8;

export const DEFAULT_ORDER = ['root', 'chords', 'fretboard', 'now-playing', 'tools'];

const expandHandlers = new Map();

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
    if (!silent) notifySessionChange();
    if (el.classList.contains('is-floating')) {
      requestAnimationFrame(() => clampFloatingToViewport(el));
    }
  }

  setExpanded(false, { silent: true });

  if (id) expandHandlers.set(id, setExpanded);

  return { setExpanded, panel };
}

function notifySessionChange() {
  if (isRestoring()) return;
  touchSession(collectModulesState());
}

export function wireDockBarToggle(el, setExpanded, ignoreSelector) {
  const bar = el.querySelector('.dock-module-bar');
  if (!bar) return;

  bar.addEventListener('click', (e) => {
    if (e.target.closest('.dock-drag-handle, .dock-module-dock, .dock-module-chevron')) return;
    if (ignoreSelector && e.target.closest(ignoreSelector)) return;
    const panel = el.querySelector('.dock-module-panel');
    if (panel) setExpanded(panel.hidden);
  });

  el.querySelector('.dock-module-chevron')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const panel = el.querySelector('.dock-module-panel');
    if (panel) setExpanded(panel.hidden);
  });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function snap(value) {
  return Math.round(value / GRID) * GRID;
}

function orderModules(dockEl) {
  if (dockEl.id !== 'tool-dock') return;
  for (const id of DEFAULT_ORDER) {
    const mod = dockEl.querySelector(`[data-dock-id="${id}"]`);
    if (mod && !mod.classList.contains('is-floating')) dockEl.appendChild(mod);
  }
}

function findOriginDock(mod) {
  const dockId = mod.dataset.originDock;
  if (dockId) return document.getElementById(dockId);
  return document.getElementById('tool-dock') || document.getElementById('content-dock');
}

function redock(mod, dockEl) {
  mod.classList.remove('is-floating');
  mod.style.left = '';
  mod.style.top = '';
  mod.style.width = '';
  mod.style.zIndex = '';
  delete mod.dataset.originDock;
  mod.querySelector('.dock-module-dock')?.setAttribute('hidden', '');
  dockEl.appendChild(mod);
  orderModules(dockEl);
  notifySessionChange();
}

function floatModule(mod) {
  if (mod.classList.contains('is-floating')) return;
  const rect = mod.getBoundingClientRect();
  mod.dataset.originDock = mod.parentElement?.id || 'tool-dock';
  mod.classList.add('is-floating');
  mod.style.width = `${rect.width}px`;
  mod.style.left = `${snap(rect.left)}px`;
  mod.style.top = `${snap(rect.top)}px`;
  document.body.appendChild(mod);
  mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
  requestAnimationFrame(() => clampFloatingToViewport(mod));
}

function floatingBottomInset() {
  return document.body.classList.contains('has-selection-footer')
    ? 44 + DOCK_GAP * 3
    : DOCK_GAP;
}

function clampFloatingToViewport(mod) {
  if (!mod?.classList.contains('is-floating')) return;
  const bottomInset = floatingBottomInset();
  const maxLeft = Math.max(DOCK_GAP, window.innerWidth - mod.offsetWidth - DOCK_GAP);
  const maxTop = Math.max(DOCK_GAP, window.innerHeight - mod.offsetHeight - bottomInset);
  const left = clamp(parseInt(mod.style.left, 10) || DOCK_GAP, DOCK_GAP, maxLeft);
  const top = clamp(parseInt(mod.style.top, 10) || DOCK_GAP, DOCK_GAP, maxTop);
  mod.style.left = `${snap(left)}px`;
  mod.style.top = `${snap(top)}px`;
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

    if (!dragging) {
      const dx = Math.abs(e.clientX - startX);
      const dy = Math.abs(e.clientY - startY);
      if (dx < DRAG_THRESHOLD && dy < DRAG_THRESHOLD) return;

      floatModule(mod);
      dragging = true;
      handle.classList.add('is-dragging');
      const rect = mod.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      mod.style.zIndex = String(1000 + document.querySelectorAll('.dock-module.is-floating').length);
    }

    const maxLeft = window.innerWidth - mod.offsetWidth - DOCK_GAP;
    const maxTop = window.innerHeight - mod.offsetHeight - floatingBottomInset();
    mod.style.left = `${snap(clamp(e.clientX - offsetX, DOCK_GAP, maxLeft))}px`;
    mod.style.top = `${snap(clamp(e.clientY - offsetY, DOCK_GAP, maxTop))}px`;
  });

  const endDrag = (e) => {
    armed = false;
    handle.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }

    if (!dragging) return;
    dragging = false;
    clampFloatingToViewport(mod);
    notifySessionChange();
  };

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  mod.querySelector('.dock-module-dock')?.addEventListener('click', (e) => {
    e.stopPropagation();
    redock(mod, dockEl);
  });
}

let resizeListenerAdded = false;

export function initDockModules(dockEl) {
  dockEl.querySelectorAll('.dock-module').forEach((mod) => {
    wireDrag(mod, dockEl);
  });
  orderModules(dockEl);

  if (!resizeListenerAdded) {
    resizeListenerAdded = true;
    window.addEventListener('resize', () => {
      document.querySelectorAll('.dock-module.is-floating').forEach(clampFloatingToViewport);
    });
  }
}

export function collectModulesState() {
  const modules = {};
  document.querySelectorAll('.dock-module').forEach((mod) => {
    const id = mod.dataset.dockId;
    if (!id) return;
    const panel = mod.querySelector('.dock-module-panel');
    const floating = mod.classList.contains('is-floating');
    modules[id] = {
      expanded: Boolean(panel && !panel.hidden),
      floating,
      dockId: floating ? (mod.dataset.originDock || 'tool-dock') : (mod.parentElement?.id || 'tool-dock'),
      left: floating ? parseInt(mod.style.left, 10) || 0 : null,
      top: floating ? parseInt(mod.style.top, 10) || 0 : null,
      width: floating ? mod.offsetWidth : null,
      zIndex: floating ? (parseInt(mod.style.zIndex, 10) || null) : null,
    };
  });
  return modules;
}

export function applyModulesState(modules = {}) {
  for (const [id, state] of Object.entries(modules)) {
    const mod = document.querySelector(`[data-dock-id="${id}"]`);
    if (!mod) continue;

    const setExpanded = expandHandlers.get(id);
    if (setExpanded) setExpanded(Boolean(state.expanded), { silent: true });

    if (state.floating) {
      const dockEl = document.getElementById(state.dockId) || findOriginDock(mod);
      if (!mod.classList.contains('is-floating')) {
        mod.dataset.originDock = state.dockId || dockEl?.id || 'tool-dock';
        mod.classList.add('is-floating');
        mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
        document.body.appendChild(mod);
      }
      if (state.width) mod.style.width = `${state.width}px`;
      if (state.left != null) mod.style.left = `${state.left}px`;
      if (state.top != null) mod.style.top = `${state.top}px`;
      if (state.zIndex != null) mod.style.zIndex = String(state.zIndex);
    } else {
      if (mod.classList.contains('is-floating')) {
        const dockEl = document.getElementById(state.dockId) || findOriginDock(mod);
        if (dockEl) redock(mod, dockEl);
      } else {
        const dockEl = document.getElementById(state.dockId);
        if (dockEl && mod.parentElement !== dockEl) {
          dockEl.appendChild(mod);
          orderModules(dockEl);
        }
      }
    }
  }

  for (const mod of document.querySelectorAll('.dock-module.is-floating')) {
    clampFloatingToViewport(mod);
  }
}

export function collapseAllModules() {
  expandHandlers.forEach((setExpanded) => setExpanded(false, { silent: true }));
  touchSession(collectModulesState());
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
    dockBtn.title = 'Return to dock';
    dockBtn.setAttribute('aria-label', 'Return to dock');
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

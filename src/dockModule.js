const EXPANDED_KEY = 'guitarsuite-dock-expanded';

const DEFAULT_ORDER = ['fretboard', 'chords', 'now-playing', 'root', 'tools'];

function loadExpanded(id) {
  try {
    const all = JSON.parse(localStorage.getItem(EXPANDED_KEY) || '{}');
    return all[id] === '1';
  } catch (_) {
    return false;
  }
}

function saveExpanded(id, open) {
  try {
    const all = JSON.parse(localStorage.getItem(EXPANDED_KEY) || '{}');
    all[id] = open ? '1' : '0';
    localStorage.setItem(EXPANDED_KEY, JSON.stringify(all));
  } catch (_) { /* ignore */ }
}

export function wireDockExpand(el, { bodyClass, moduleId = null, storageKey = null } = {}) {
  const panel = el.querySelector('.dock-module-panel');
  const chevron = el.querySelector('.dock-module-chevron');
  if (!panel || !chevron) return { setExpanded: () => {} };

  const id = moduleId || el.dataset.dockId;
  const persist = Boolean(storageKey || id);

  function setExpanded(open) {
    panel.hidden = !open;
    el.classList.toggle('is-expanded', open);
    if (bodyClass) document.body.classList.toggle(bodyClass, open);
    chevron.textContent = open ? '▼' : '▲';
    chevron.setAttribute('aria-expanded', String(open));
    if (persist && id) saveExpanded(id, open);
  }

  if (persist && id) {
    setExpanded(loadExpanded(id));
  }

  return { setExpanded, panel };
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

function orderModules(dockEl) {
  for (const id of DEFAULT_ORDER) {
    const mod = dockEl.querySelector(`[data-dock-id="${id}"]`);
    if (mod && !mod.classList.contains('is-floating')) dockEl.appendChild(mod);
  }
}

function redock(mod, dockEl) {
  mod.classList.remove('is-floating');
  mod.style.left = '';
  mod.style.top = '';
  mod.style.width = '';
  mod.style.zIndex = '';
  mod.querySelector('.dock-module-dock')?.setAttribute('hidden', '');
  dockEl.appendChild(mod);
  orderModules(dockEl);
}

function floatModule(mod) {
  if (mod.classList.contains('is-floating')) return;
  const rect = mod.getBoundingClientRect();
  mod.classList.add('is-floating');
  mod.style.width = `${rect.width}px`;
  mod.style.left = `${rect.left}px`;
  mod.style.top = `${rect.top}px`;
  document.body.appendChild(mod);
  mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
}

function wireDrag(mod, dockEl) {
  const handle = mod.querySelector('.dock-drag-handle');
  if (!handle) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  handle.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    floatModule(mod);
    dragging = true;
    const rect = mod.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    mod.style.zIndex = String(1000 + document.querySelectorAll('.dock-module.is-floating').length);
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('is-dragging');
  });

  handle.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const maxLeft = window.innerWidth - mod.offsetWidth - 8;
    const maxTop = window.innerHeight - mod.offsetHeight - 8;
    mod.style.left = `${clamp(e.clientX - offsetX, 8, maxLeft)}px`;
    mod.style.top = `${clamp(e.clientY - offsetY, 8, maxTop)}px`;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
  };

  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  mod.querySelector('.dock-module-dock')?.addEventListener('click', (e) => {
    e.stopPropagation();
    redock(mod, dockEl);
  });
}

export function initDockModules(dockEl) {
  dockEl.querySelectorAll('.dock-module').forEach((mod) => {
    wireDrag(mod, dockEl);
  });
  orderModules(dockEl);
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

export function syncChipLayers(hub, container) {
  container.querySelectorAll('.dock-chip[data-label]').forEach((chip) => {
    const slot = hub.getLayerSlot(chip.dataset.label);
    chip.classList.toggle('fb-active', slot > 0);
    chip.classList.toggle('fb-active-1', slot === 1);
    chip.classList.toggle('fb-active-2', slot === 2);
    chip.classList.toggle('fb-active-3', slot === 3);
  });
}

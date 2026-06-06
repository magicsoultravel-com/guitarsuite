const EXPANDED_KEY = 'guitarsuite-dock-expanded';
const GRID = 8;
const DOCK_GAP = 8;

export const DEFAULT_ORDER = ['root', 'chords', 'fretboard', 'now-playing', 'tools'];

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
    if (el.classList.contains('is-floating')) {
      requestAnimationFrame(resolveFloatingLayout);
    }
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

function snap(value) {
  return Math.round(value / GRID) * GRID;
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
  mod.style.left = `${snap(rect.left)}px`;
  mod.style.top = `${snap(rect.top)}px`;
  document.body.appendChild(mod);
  mod.querySelector('.dock-module-dock')?.removeAttribute('hidden');
}

function moduleBox(mod) {
  const left = parseInt(mod.style.left, 10) || 0;
  const top = parseInt(mod.style.top, 10) || 0;
  const width = mod.offsetWidth;
  const height = mod.offsetHeight;
  return { left, top, right: left + width, bottom: top + height, width, height };
}

function boxesOverlap(a, b, pad = DOCK_GAP) {
  return !(
    a.right + pad <= b.left
    || a.left >= b.right + pad
    || a.bottom + pad <= b.top
    || a.top >= b.bottom + pad
  );
}

function dockBarRect(dockEl) {
  if (!dockEl) return null;
  const rect = dockEl.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function resolveFloatingLayout(dockEl) {
  const floating = [...document.querySelectorAll('.dock-module.is-floating')];
  if (!floating.length) return;

  floating.sort((a, b) => {
    const za = parseInt(a.style.zIndex, 10) || 0;
    const zb = parseInt(b.style.zIndex, 10) || 0;
    if (za !== zb) return zb - za;
    const ta = parseInt(a.style.top, 10) || 0;
    const tb = parseInt(b.style.top, 10) || 0;
    if (ta !== tb) return ta - tb;
    return (parseInt(a.style.left, 10) || 0) - (parseInt(b.style.left, 10) || 0);
  });

  const dockRect = dockBarRect(dockEl);
  const placed = [];

  for (const mod of floating) {
    let { left, top } = moduleBox(mod);
    left = snap(left);
    top = snap(top);

    for (let attempt = 0; attempt < 48; attempt++) {
      const box = { left, top, right: left + mod.offsetWidth, bottom: top + mod.offsetHeight };
      const blockers = [...placed];
      if (dockRect && boxesOverlap(box, dockRect)) blockers.push(dockRect);

      const hit = blockers.find((b) => boxesOverlap(box, b));
      if (!hit) break;

      const tryRight = snap(hit.right + DOCK_GAP);
      const tryDown = snap(hit.bottom + DOCK_GAP);

      if (tryRight + mod.offsetWidth <= window.innerWidth - DOCK_GAP) {
        left = tryRight;
      } else {
        left = snap(parseInt(mod.style.left, 10) || DOCK_GAP);
        top = tryDown;
      }
    }

    left = clamp(left, DOCK_GAP, window.innerWidth - mod.offsetWidth - DOCK_GAP);
    top = clamp(top, DOCK_GAP, window.innerHeight - mod.offsetHeight - DOCK_GAP);

    mod.style.left = `${left}px`;
    mod.style.top = `${top}px`;
    placed.push(moduleBox(mod));
  }
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
    const maxLeft = window.innerWidth - mod.offsetWidth - DOCK_GAP;
    const maxTop = window.innerHeight - mod.offsetHeight - DOCK_GAP;
    mod.style.left = `${snap(clamp(e.clientX - offsetX, DOCK_GAP, maxLeft))}px`;
    mod.style.top = `${snap(clamp(e.clientY - offsetY, DOCK_GAP, maxTop))}px`;
  });

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    handle.classList.remove('is-dragging');
    try {
      handle.releasePointerCapture(e.pointerId);
    } catch (_) { /* ignore */ }
    resolveFloatingLayout(dockEl);
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

  window.addEventListener('resize', () => resolveFloatingLayout(dockEl));
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

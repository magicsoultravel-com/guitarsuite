const SIZE_KEY = 'guitarsuite-dock-sizes';

function loadSize(id) {
  try {
    const all = JSON.parse(localStorage.getItem(SIZE_KEY) || '{}');
    return all[id] ? parseInt(all[id], 10) : null;
  } catch (_) {
    return null;
  }
}

function saveSize(id, height) {
  try {
    const all = JSON.parse(localStorage.getItem(SIZE_KEY) || '{}');
    all[id] = height;
    localStorage.setItem(SIZE_KEY, JSON.stringify(all));
  } catch (_) { /* ignore */ }
}

export function wireDockResize(el, moduleId, defaultHeight = 240) {
  const panel = el.querySelector('.dock-module-panel');
  if (!panel) return;

  panel.classList.add('dock-panel-resizable');
  const saved = loadSize(moduleId);
  if (saved) panel.style.height = `${saved}px`;
  else panel.style.height = `${defaultHeight}px`;

  const observer = new ResizeObserver(() => {
    if (!el.classList.contains('is-expanded')) return;
    const h = Math.round(panel.getBoundingClientRect().height);
    if (h > 40) saveSize(moduleId, h);
  });
  observer.observe(panel);
}

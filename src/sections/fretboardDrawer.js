import { renderRootToolbar } from '../fretboardHub.js';
import { renderFretboard } from './fretboard.js';

const STORAGE_KEY = 'guitarsuite-fretboard-expanded';

export function renderFretboardDrawer(hub, notesJson) {
  const el = document.createElement('div');
  el.id = 'fretboard-drawer';
  el.className = 'fretboard-drawer';

  el.innerHTML = `
    <div class="fretboard-drawer-bar">
      <span class="fretboard-drawer-label">Fretboard</span>
      <div class="fretboard-drawer-controls"></div>
      <span class="fretboard-drawer-summary"></span>
      <span class="fretboard-drawer-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="fretboard-drawer-panel" hidden>
      <div class="fretboard-drawer-inner"></div>
    </div>
  `;

  const controls = el.querySelector('.fretboard-drawer-controls');
  const summary = el.querySelector('.fretboard-drawer-summary');
  const inner = el.querySelector('.fretboard-drawer-inner');
  const panel = el.querySelector('.fretboard-drawer-panel');
  const chevron = el.querySelector('.fretboard-drawer-chevron');

  renderRootToolbar(hub, { controlsEl: controls, summaryEl: summary });

  const fretboard = renderFretboard(notesJson);
  fretboard.classList.add('fretboard-drawer-board');
  inner.appendChild(fretboard);

  function setExpanded(open) {
    panel.hidden = !open;
    el.classList.toggle('is-expanded', open);
    document.body.classList.toggle('fretboard-expanded', open);
    chevron.textContent = open ? '▼' : '▲';
    try {
      localStorage.setItem(STORAGE_KEY, open ? '1' : '0');
    } catch (_) { /* ignore */ }
  }

  el.querySelector('.fretboard-drawer-bar').addEventListener('click', (e) => {
    if (e.target.closest('.fretboard-drawer-controls, .root-select, .reset-btn')) return;
    setExpanded(panel.hidden);
  });

  controls.querySelector('.root-select')?.addEventListener('click', (e) => e.stopPropagation());
  controls.querySelector('.reset-btn')?.addEventListener('click', (e) => e.stopPropagation());

  let startExpanded = false;
  try {
    startExpanded = localStorage.getItem(STORAGE_KEY) === '1';
  } catch (_) { /* ignore */ }

  setExpanded(startExpanded);

  return el;
}

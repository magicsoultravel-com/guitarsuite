import { renderRootToolbar } from '../fretboardHub.js';
import { renderFretboard } from './fretboard.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

const STORAGE_KEY = 'guitarsuite-fretboard-expanded';

export function renderFretboardDrawer(hub, notesJson) {
  const el = document.createElement('div');
  el.id = 'fretboard-drawer';
  el.className = 'fretboard-drawer';

  el.innerHTML = `
    <div class="dock-module-bar">
      <div class="dock-module-controls fretboard-drawer-controls"></div>
      <span class="dock-module-sub fretboard-drawer-summary"></span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="fretboard-drawer-inner"></div>
    </div>
  `;

  ensureDockChrome(el, 'fretboard', 'Fretboard');

  const controls = el.querySelector('.fretboard-drawer-controls');
  const summary = el.querySelector('.fretboard-drawer-summary');
  const inner = el.querySelector('.fretboard-drawer-inner');

  renderRootToolbar(hub, { controlsEl: controls, summaryEl: summary });

  const fretboard = renderFretboard(notesJson);
  fretboard.classList.add('fretboard-drawer-board');
  inner.appendChild(fretboard);

  const { setExpanded } = wireDockExpand(el, {
    bodyClass: 'fretboard-expanded',
    storageKey: STORAGE_KEY,
  });

  wireDockBarToggle(el, setExpanded, '.fretboard-drawer-controls, .root-select, .reset-btn');

  controls.querySelector('.root-select')?.addEventListener('click', (e) => e.stopPropagation());
  controls.querySelector('.reset-btn')?.addEventListener('click', (e) => e.stopPropagation());

  return el;
}

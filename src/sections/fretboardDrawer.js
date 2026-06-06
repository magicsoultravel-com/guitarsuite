import { renderFretboard } from './fretboard.js';
import { formatLayerSummary } from '../fretboardHub.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

export function renderFretboardDrawer(hub, notesJson) {
  const el = document.createElement('div');
  el.id = 'fretboard-drawer';
  el.className = 'fretboard-drawer';

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub fretboard-drawer-summary"></span>
      <button type="button" class="dock-nav-btn fretboard-reset" title="Clear highlights" aria-label="Clear highlights">↺</button>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="fretboard-drawer-inner"></div>
    </div>
  `;

  ensureDockChrome(el, 'fretboard', 'Fretboard');

  const summary = el.querySelector('.fretboard-drawer-summary');
  const inner = el.querySelector('.fretboard-drawer-inner');

  el.querySelector('.fretboard-reset')?.addEventListener('click', (e) => {
    e.stopPropagation();
    hub.reset();
  });

  hub.subscribe(() => {
    summary.textContent = formatLayerSummary(hub);
  });
  summary.textContent = formatLayerSummary(hub);

  const fretboard = renderFretboard(notesJson);
  fretboard.classList.add('fretboard-drawer-board');
  inner.appendChild(fretboard);

  const { setExpanded } = wireDockExpand(el, {
    bodyClass: 'fretboard-expanded',
    moduleId: 'fretboard',
  });

  wireDockBarToggle(el, setExpanded, '.fretboard-reset');

  return el;
}

import { renderFretboard } from './fretboard.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

export function renderFretboardDrawer(hub, notesJson) {
  const el = document.createElement('div');
  el.id = 'fretboard-drawer';
  el.className = 'fretboard-drawer';

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub fretboard-drawer-hint">Interactive fretboard</span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="fretboard-drawer-inner"></div>
    </div>
  `;

  ensureDockChrome(el, 'fretboard', 'Fretboard');

  const inner = el.querySelector('.fretboard-drawer-inner');
  const fretboard = renderFretboard(notesJson);
  fretboard.classList.add('fretboard-drawer-board');
  inner.appendChild(fretboard);

  const { setExpanded } = wireDockExpand(el, {
    bodyClass: 'fretboard-expanded',
    moduleId: 'fretboard',
  });

  wireDockBarToggle(el, setExpanded, '.dock-chip, .fb-selectable');

  return el;
}

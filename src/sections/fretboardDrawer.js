import { renderFretboard, applyFretboardOrientation } from './fretboard.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

export function renderFretboardDrawer(hub, notesJson) {
  const el = document.createElement('div');
  el.id = 'fretboard-drawer';
  el.className = 'fretboard-drawer';

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub fretboard-drawer-hint">Interactive fretboard</span>
      <button type="button" class="dock-module-orient" title="Horizontal fretboard (0 on left)" aria-label="Flip fretboard to horizontal" aria-pressed="false">↔</button>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="fretboard-drawer-inner"></div>
    </div>
  `;

  ensureDockChrome(el, 'fretboard', 'fretboard');

  const inner = el.querySelector('.fretboard-drawer-inner');
  const fretboard = renderFretboard(notesJson);
  fretboard.classList.add('fretboard-drawer-board');
  inner.appendChild(fretboard);

  const orientBtn = el.querySelector('.dock-module-orient');
  let orientation = 'vertical';

  function syncOrientChrome() {
    const horizontal = orientation === 'horizontal';
    orientBtn.textContent = horizontal ? '↕' : '↔';
    orientBtn.title = horizontal
      ? 'Vertical fretboard'
      : 'Horizontal fretboard (0 on left)';
    orientBtn.setAttribute(
      'aria-label',
      horizontal ? 'Flip fretboard to vertical' : 'Flip fretboard to horizontal',
    );
    orientBtn.setAttribute('aria-pressed', String(horizontal));
    el.classList.toggle('is-horizontal', horizontal);
  }

  orientBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    orientation = orientation === 'vertical' ? 'horizontal' : 'vertical';
    applyFretboardOrientation(fretboard, notesJson, orientation);
    syncOrientChrome();
  });

  syncOrientChrome();

  const { setExpanded } = wireDockExpand(el, {
    bodyClass: 'fretboard-expanded',
    moduleId: 'fretboard',
  });

  wireDockBarToggle(el, setExpanded);

  return el;
}

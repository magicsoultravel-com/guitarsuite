import { CHROMATIC } from '../music.js';
import { ensureDockChrome } from '../dockModule.js';
import { playNote } from '../playback.js';

export function renderRootModule(hub) {
  const el = document.createElement('div');
  el.id = 'root-module';
  el.className = 'root-module';

  const chips = CHROMATIC.map(
    (n) => `<button type="button" class="dock-chip root-chip" data-root="${n}">${n}</button>`,
  ).join('');

  el.innerHTML = `
    <div class="dock-module-bar dock-module-bar--root">
      <div class="dock-root-strip">${chips}</div>
      <span class="dock-root-hint" title="Select up to 3 consecutive roots">1–3</span>
    </div>
  `;

  ensureDockChrome(el, 'root', 'Root', { expandable: false });

  function syncRoot() {
    const roots = hub.getRoots();
    const rootSet = new Set(roots);
    el.querySelectorAll('.root-chip').forEach((chip) => {
      const active = rootSet.has(chip.dataset.root);
      chip.classList.toggle('fb-active', active);
      chip.classList.toggle('is-root-active', active);
      chip.classList.toggle('is-root-primary', active && chip.dataset.root === hub.getRoot());
    });
  }

  el.querySelectorAll('.root-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      hub.toggleRoot(chip.dataset.root);
      playNote(chip.dataset.root);
      const url = new URL(location.href);
      const roots = hub.getRoots();
      if (roots.length) {
        url.searchParams.set('root', roots.join(','));
      } else {
        url.searchParams.delete('root');
      }
      history.replaceState(null, '', url);
    });
  });

  hub.subscribe(syncRoot);
  syncRoot();

  return el;
}

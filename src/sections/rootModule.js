import { CHROMATIC } from '../music.js';
import { ensureDockChrome } from '../dockModule.js';

export function renderRootModule(hub) {
  const el = document.createElement('div');
  el.id = 'root-module';
  el.className = 'root-module';

  const chips = CHROMATIC.map(
    (n) => `<button type="button" class="dock-chip root-chip" data-root="${n}">${n}</button>`
  ).join('');

  el.innerHTML = `
    <div class="dock-module-bar dock-module-bar--root">
      <div class="dock-root-strip">${chips}</div>
    </div>
  `;

  ensureDockChrome(el, 'root', 'Root', { expandable: false });

  function syncRoot() {
    const root = hub.getRoot();
    el.querySelectorAll('.root-chip').forEach((chip) => {
      const active = chip.dataset.root === root;
      chip.classList.toggle('fb-active', active);
      chip.classList.toggle('is-root-active', active);
    });
  }

  el.querySelectorAll('.root-chip').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.stopPropagation();
      hub.setRoot(chip.dataset.root);
      const url = new URL(location.href);
      url.searchParams.set('root', chip.dataset.root);
      history.replaceState(null, '', url);
    });
  });

  hub.subscribe(syncRoot);
  syncRoot();

  return el;
}

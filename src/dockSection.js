import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from './dockModule.js';

/**
 * Wrap a section element (with optional h2) as a collapsible dock module.
 */
export function wrapAsDockModule(sectionEl, { id, label } = {}) {
  const mod = document.createElement('div');
  mod.className = 'dock-module dock-module--content';
  mod.dataset.dockId = id;
  if (sectionEl.id) {
    mod.id = sectionEl.id;
    sectionEl.id = '';
  }

  const heading = sectionEl.querySelector('h2');
  const title = label || heading?.textContent?.trim() || id;
  heading?.remove();
  sectionEl.classList.remove('section');

  mod.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub"></span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden></div>
  `;

  const panel = mod.querySelector('.dock-module-panel');
  while (sectionEl.firstChild) {
    panel.appendChild(sectionEl.firstChild);
  }

  ensureDockChrome(mod, id, title);
  const { setExpanded } = wireDockExpand(mod, {
    bodyClass: `content-${id}-expanded`,
    moduleId: id,
  });
  wireDockBarToggle(mod, setExpanded, '.dock-chip, a, button, input, select, .fb-selectable, .carousel-nav, .dot');

  return mod;
}

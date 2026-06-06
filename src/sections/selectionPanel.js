import { escapeHtml } from '../utils.js';

export function renderSelectionPanel(hub) {
  const el = document.createElement('aside');
  el.id = 'selection-panel';
  el.className = 'selection-panel';
  el.setAttribute('aria-label', 'Current selection');

  el.innerHTML = `
    <div class="selection-panel-head">
      <span class="selection-panel-title">Selection</span>
      <button type="button" class="dock-nav-btn selection-reset" title="Clear selections" aria-label="Clear selections">↺</button>
    </div>
    <div class="selection-panel-root"></div>
    <ul class="selection-layers"></ul>
    <p class="selection-empty">No layers active — root only</p>
  `;

  const rootEl = el.querySelector('.selection-panel-root');
  const listEl = el.querySelector('.selection-layers');
  const emptyEl = el.querySelector('.selection-empty');

  el.querySelector('.selection-reset')?.addEventListener('click', () => hub.reset());

  function render() {
    rootEl.textContent = `Root: ${hub.getRoot()}`;
    const layers = hub.getLayers();
    listEl.replaceChildren();

    if (!layers.length) {
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    for (const { slot, label, notes } of layers) {
      const li = document.createElement('li');
      li.className = `selection-layer selection-layer--${slot}`;
      const noteList = [...notes].join(', ');
      li.innerHTML = `
        <span class="selection-layer-badge">${slot}</span>
        <span class="selection-layer-body">
          <span class="selection-layer-label">${escapeHtml(label)}</span>
          <span class="selection-layer-notes">${escapeHtml(noteList)}</span>
        </span>
      `;
      listEl.appendChild(li);
    }
  }

  hub.subscribe(render);
  render();

  document.body.appendChild(el);
  document.body.classList.add('has-selection-panel');

  return el;
}

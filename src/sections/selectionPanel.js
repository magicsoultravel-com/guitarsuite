import { escapeHtml } from '../utils.js';
import {
  initPlayback,
  isFocusModules,
  isSoundEnabled,
  playLayerSelection,
  playNote,
  setFocusModules,
  setSoundEnabled,
  subscribeSound,
} from '../playback.js';

export function renderSelectionPanel(hub, context = {}) {
  initPlayback();

  const el = document.createElement('aside');
  el.id = 'selection-panel';
  el.className = 'selection-panel';
  el.setAttribute('aria-label', 'Current selection');

  el.innerHTML = `
    <div class="selection-panel-head">
      <span class="selection-panel-title">Selection</span>
      <div class="selection-panel-actions">
        <button type="button" class="dock-nav-btn selection-sound" title="Sound on" aria-label="Toggle sound" aria-pressed="true">🔊</button>
        <button type="button" class="dock-nav-btn selection-focus" title="Focus modules — hide page content" aria-label="Focus modules" aria-pressed="false">◧</button>
        <button type="button" class="dock-nav-btn selection-reset" title="Clear selections" aria-label="Clear selections">↺</button>
      </div>
    </div>
    <button type="button" class="selection-panel-root" title="Play root note"></button>
    <ul class="selection-layers"></ul>
    <p class="selection-empty">No layers active — root only</p>
  `;

  const rootEl = el.querySelector('.selection-panel-root');
  const listEl = el.querySelector('.selection-layers');
  const emptyEl = el.querySelector('.selection-empty');
  const soundBtn = el.querySelector('.selection-sound');
  const focusBtn = el.querySelector('.selection-focus');

  function syncSoundBtn() {
    const on = isSoundEnabled();
    soundBtn.textContent = on ? '🔊' : '🔇';
    soundBtn.title = on ? 'Sound on — click to mute' : 'Sound off — click to enable';
    soundBtn.setAttribute('aria-pressed', String(on));
    soundBtn.classList.toggle('is-off', !on);
  }

  function syncFocusBtn() {
    const on = isFocusModules();
    focusBtn.title = on ? 'Showing modules only — click to show page content' : 'Focus modules — hide page content';
    focusBtn.setAttribute('aria-pressed', String(on));
    focusBtn.classList.toggle('is-active', on);
  }

  soundBtn.addEventListener('click', () => {
    setSoundEnabled(!isSoundEnabled());
  });

  focusBtn.addEventListener('click', () => {
    setFocusModules(!isFocusModules());
    syncFocusBtn();
  });

  subscribeSound(syncSoundBtn);
  syncSoundBtn();
  syncFocusBtn();

  el.querySelector('.selection-reset')?.addEventListener('click', () => hub.reset());

  rootEl.addEventListener('click', () => playNote(hub.getRoot()));

  function render() {
    rootEl.textContent = `Root: ${hub.getRoot()}`;
    const layers = hub.getLayers();
    listEl.replaceChildren();

    if (!layers.length) {
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    for (const layer of layers) {
      const { slot, label, notes } = layer;
      const li = document.createElement('li');
      li.className = `selection-layer selection-layer--${slot} selection-layer-playable`;
      li.title = 'Click to play';
      const noteList = [...notes].join(', ');
      li.innerHTML = `
        <span class="selection-layer-badge">${slot}</span>
        <span class="selection-layer-body">
          <span class="selection-layer-label">${escapeHtml(label)}</span>
          <span class="selection-layer-notes">${escapeHtml(noteList)}</span>
        </span>
      `;
      li.addEventListener('click', () => playLayerSelection(layer, hub, context));
      listEl.appendChild(li);
    }
  }

  hub.subscribe(render);
  render();

  document.body.appendChild(el);
  document.body.classList.add('has-selection-panel');

  return el;
}

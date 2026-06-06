import { escapeHtml } from '../utils.js';
import { formatRootsDisplay } from '../displayRoot.js';
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

export function renderSelectionFooter(hub, context = {}, footerEl) {
  initPlayback();

  const bar = document.createElement('div');
  bar.className = 'footer-selection';
  bar.setAttribute('aria-label', 'Current selection');

  bar.innerHTML = `
    <span class="footer-selection-label">Selection</span>
    <button type="button" class="footer-root" title="Play root note"></button>
    <div class="footer-layers"></div>
    <span class="footer-empty">No layers</span>
    <div class="footer-selection-actions">
      <button type="button" class="dock-nav-btn footer-sound" title="Sound on" aria-label="Toggle sound" aria-pressed="true">🔊</button>
      <button type="button" class="dock-nav-btn footer-focus" title="Focus modules" aria-label="Focus modules" aria-pressed="false">◧</button>
      <button type="button" class="dock-nav-btn footer-reset" title="Clear selections" aria-label="Clear selections">↺</button>
    </div>
  `;

  const rootEl = bar.querySelector('.footer-root');
  const layersEl = bar.querySelector('.footer-layers');
  const emptyEl = bar.querySelector('.footer-empty');
  const soundBtn = bar.querySelector('.footer-sound');
  const focusBtn = bar.querySelector('.footer-focus');

  function syncSoundBtn() {
    const on = isSoundEnabled();
    soundBtn.textContent = on ? '🔊' : '🔇';
    soundBtn.classList.toggle('is-off', !on);
    soundBtn.setAttribute('aria-pressed', String(on));
  }

  function syncFocusBtn() {
    const on = isFocusModules();
    focusBtn.classList.toggle('is-active', on);
    focusBtn.setAttribute('aria-pressed', String(on));
  }

  soundBtn.addEventListener('click', () => setSoundEnabled(!isSoundEnabled()));
  focusBtn.addEventListener('click', () => {
    setFocusModules(!isFocusModules());
    syncFocusBtn();
  });
  subscribeSound(syncSoundBtn);
  syncSoundBtn();
  syncFocusBtn();

  bar.querySelector('.footer-reset')?.addEventListener('click', () => hub.reset());
  rootEl.addEventListener('click', () => {
    const root = hub.getRoot();
    if (root) playNote(root);
  });

  function render() {
    rootEl.textContent = `Root: ${formatRootsDisplay(hub)}`;
    layersEl.replaceChildren();
    const layers = hub.getLayers();

    if (!layers.length) {
      emptyEl.hidden = false;
      return;
    }

    emptyEl.hidden = true;
    for (const layer of layers) {
      const { slot, label, notes, chordRef, via } = layer;
      const displayLabel = via ? `${chordRef || label} (${via})` : (chordRef || label);
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `footer-layer footer-layer--${slot}`;
      chip.title = [...notes].join(', ');
      chip.innerHTML = `
        <span class="footer-layer-badge">${slot}</span>
        <span class="footer-layer-label">${escapeHtml(displayLabel)}</span>
      `;
      chip.addEventListener('click', () => playLayerSelection(layer, hub, context));
      layersEl.appendChild(chip);
    }
  }

  hub.subscribe(render);
  render();

  footerEl.prepend(bar);
  document.body.classList.add('has-selection-footer');

  return bar;
}

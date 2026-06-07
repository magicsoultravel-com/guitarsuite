import { escapeHtml } from '../utils.js';
import { formatRootsDisplay } from '../displayRoot.js';
import { resetBlockPositions, persistModuleSession, autoArrangeModules } from '../dockModule.js';
import { zoomIn, zoomOut } from '../workspaceLayout.js';
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
    <div class="footer-toolbar" aria-label="Footer controls">
      <div class="footer-layout-actions" aria-label="Layout controls">
        <button type="button" class="dock-nav-btn footer-zoom-out" title="Zoom out" aria-label="Zoom out">−</button>
        <button type="button" class="dock-nav-btn footer-zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
        <button type="button" class="dock-nav-btn footer-auto-arrange" title="Auto-arrange open modules" aria-label="Auto-arrange open modules">▦</button>
        <button type="button" class="dock-nav-btn footer-layout-reset" title="Reset module positions" aria-label="Reset module positions">⌂</button>
      </div>
      <div class="footer-selection-actions">
        <button type="button" class="dock-nav-btn footer-sound" title="Sound on" aria-label="Toggle sound" aria-pressed="true">◉</button>
        <button type="button" class="dock-nav-btn footer-focus" title="Focus modules" aria-label="Focus modules" aria-pressed="false">◧</button>
        <button type="button" class="dock-nav-btn footer-reset" title="Clear selections" aria-label="Clear selections">↺</button>
      </div>
    </div>
    <span class="footer-selection-label">selection</span>
    <button type="button" class="footer-root" title="Play root note"></button>
    <div class="footer-layers"></div>
    <span class="footer-empty">no layers</span>
  `;

  const rootEl = bar.querySelector('.footer-root');
  const layersEl = bar.querySelector('.footer-layers');
  const emptyEl = bar.querySelector('.footer-empty');
  const soundBtn = bar.querySelector('.footer-sound');
  const focusBtn = bar.querySelector('.footer-focus');

  function syncSoundBtn() {
    const on = isSoundEnabled();
    soundBtn.textContent = on ? '◉' : '○';
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

  bar.querySelector('.footer-zoom-out')?.addEventListener('click', () => {
    zoomOut();
    persistModuleSession();
  });
  bar.querySelector('.footer-zoom-in')?.addEventListener('click', () => {
    zoomIn();
    persistModuleSession();
  });
  bar.querySelector('.footer-auto-arrange')?.addEventListener('click', () => autoArrangeModules());
  bar.querySelector('.footer-layout-reset')?.addEventListener('click', () => resetBlockPositions());
  bar.querySelector('.footer-reset')?.addEventListener('click', () => hub.reset());
  rootEl.addEventListener('click', () => {
    const root = hub.getRoot();
    if (root) playNote(root);
  });

  function render() {
    rootEl.textContent = `root: ${formatRootsDisplay(hub)}`;
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

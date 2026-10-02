import { escapeHtml } from '../utils.js';
import { THEMES, getTheme, setTheme } from '../theme.js';

let overlayEl = null;
let onKeyDown = null;

function themeButtonsHtml(activeId) {
  return THEMES.map((theme) => {
    const selected = theme.id === activeId;
    const swatches = theme.swatches
      .map((c) => `<span class="block-settings-swatch" style="background:${escapeHtml(c)}"></span>`)
      .join('');
    return `
      <button type="button"
        class="block-settings-theme${selected ? ' is-selected' : ''}"
        data-theme-id="${escapeHtml(theme.id)}"
        aria-pressed="${selected}"
        title="${escapeHtml(theme.label)}">
        <span class="block-settings-theme-swatches" aria-hidden="true">${swatches}</span>
        <span class="block-settings-theme-label">${escapeHtml(theme.label)}</span>
      </button>
    `;
  }).join('');
}

function syncThemeSelection() {
  if (!overlayEl) return;
  const active = getTheme();
  overlayEl.querySelectorAll('.block-settings-theme').forEach((btn) => {
    const selected = btn.dataset.themeId === active;
    btn.classList.toggle('is-selected', selected);
    btn.setAttribute('aria-pressed', String(selected));
  });
}

function ensureOverlay() {
  if (overlayEl) return overlayEl;

  overlayEl = document.createElement('div');
  overlayEl.className = 'block-settings-overlay';
  overlayEl.hidden = true;
  overlayEl.setAttribute('role', 'presentation');
  overlayEl.innerHTML = `
    <div class="block-settings-modal" role="dialog" aria-modal="true" aria-labelledby="block-settings-title">
      <header class="block-settings-header">
        <h2 id="block-settings-title" class="block-settings-title">Block settings</h2>
        <button type="button" class="dock-nav-btn block-settings-close" title="Close" aria-label="Close settings">×</button>
      </header>
      <section class="block-settings-section" aria-labelledby="block-settings-themes-heading">
        <h3 id="block-settings-themes-heading" class="block-settings-section-title">Themes</h3>
        <div class="block-settings-theme-grid" role="group" aria-label="Theme presets">
          ${themeButtonsHtml(getTheme())}
        </div>
      </section>
    </div>
  `;

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) closeBlockSettings();
  });

  overlayEl.querySelector('.block-settings-close')?.addEventListener('click', () => {
    closeBlockSettings();
  });

  overlayEl.querySelector('.block-settings-theme-grid')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.block-settings-theme');
    if (!btn) return;
    setTheme(btn.dataset.themeId);
    syncThemeSelection();
  });

  document.body.appendChild(overlayEl);
  return overlayEl;
}

export function openBlockSettings() {
  const el = ensureOverlay();
  syncThemeSelection();
  el.hidden = false;
  document.body.classList.add('has-block-settings');
  el.querySelector('.block-settings-close')?.focus();

  onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeBlockSettings();
    }
  };
  document.addEventListener('keydown', onKeyDown);
}

export function closeBlockSettings() {
  if (!overlayEl || overlayEl.hidden) return;
  overlayEl.hidden = true;
  document.body.classList.remove('has-block-settings');
  if (onKeyDown) {
    document.removeEventListener('keydown', onKeyDown);
    onKeyDown = null;
  }
}

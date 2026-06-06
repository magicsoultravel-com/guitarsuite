import { escapeHtml, createSection } from '../utils.js';

export function renderScaleProgressions(scales) {
  const cards = Object.keys(scales)
    .map(
      (name) =>
        `<article class="scale-prog-card" data-scale="${escapeHtml(name)}">
          <h3 class="scale-prog-card-title">${escapeHtml(name)}</h3>
          <div class="scale-prog-card-body"></div>
        </article>`,
    )
    .join('');

  return createSection(
    'scale progressions',
    `<p class="fb-hint scale-prog-hint">Diatonic chords and common progressions for each scale at root <strong class="scale-prog-root">C</strong>. Click a chord to highlight and hear it.</p>
    <div class="scale-progressions-grid">${cards}</div>`,
    'scale-progressions-section',
  );
}

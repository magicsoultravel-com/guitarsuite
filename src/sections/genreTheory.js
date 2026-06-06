import { escapeHtml, createSection } from '../utils.js';

function renderScaleChips(scales) {
  if (!scales?.length) return '';
  const chips = scales
    .map(
      (name) =>
        `<button type="button" class="genre-scale-chip fb-selectable" data-scale="${escapeHtml(name)}" data-label="${escapeHtml(name)}" title="Highlight on fretboard">${escapeHtml(name)}</button>`,
    )
    .join('');
  return `<div class="genre-scales">${chips}</div>`;
}

function renderTropes(tropes) {
  if (!tropes?.length) return '';
  const items = tropes.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  return `<ul class="genre-tropes">${items}</ul>`;
}

function renderProgressions(genreName, progressions) {
  if (!progressions?.length) return '';
  const rows = progressions
    .map(
      (p, i) => `<tr class="genre-prog-row" data-genre="${escapeHtml(genreName)}" data-prog-index="${i}">
        <td>${escapeHtml(p.name)}</td>
        <td><code class="genre-prog-numerals">${escapeHtml(p.numerals)}</code></td>
        <td class="genre-prog-chords-cell"></td>
        <td class="genre-prog-notes">${escapeHtml(p.notes)}</td>
      </tr>`,
    )
    .join('');
  return `<table class="genre-progressions-table">
    <thead><tr><th>Name</th><th>Numerals</th><th>At root</th><th>Notes</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderGenreCard(name, data) {
  const meta = [data.rhythm, data.instruments].filter(Boolean);
  const metaHtml = meta.length
    ? `<p class="genre-meta">${meta.map((m) => escapeHtml(m)).join(' · ')}</p>`
    : '';

  return `<details class="genre-card" data-genre="${escapeHtml(name)}">
    <summary class="genre-card-title">${escapeHtml(name)}</summary>
    <div class="genre-card-body">
      <p class="genre-summary">${escapeHtml(data.summary)}</p>
      ${metaHtml}
      <h3 class="genre-subhead">Key tropes</h3>
      ${renderTropes(data.tropes)}
      <h3 class="genre-subhead">Scales &amp; modes</h3>
      ${renderScaleChips(data.scales)}
      <h3 class="genre-subhead">Typical progressions</h3>
      ${renderProgressions(name, data.progressions)}
    </div>
  </details>`;
}

export function renderGenreTheory(genres) {
  const cards = Object.entries(genres)
    .map(([name, data]) => renderGenreCard(name, data))
    .join('');

  return createSection(
    'genre theory',
    `<p class="fb-hint">Broad strokes for each style. Scale chips highlight across <strong>Scales & modes</strong> and <strong>Scale progressions</strong>. Progression chords transpose to root <strong class="genre-prog-root">E</strong> (latest in your root span).</p>
    <div class="genre-theory-grid">${cards}</div>`,
    'genre-theory-section',
  );
}

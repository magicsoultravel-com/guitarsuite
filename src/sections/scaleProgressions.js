import { escapeHtml, createSection } from '../utils.js';
import { getScaleSemitones } from '../music.js';

export function renderScaleProgressions(scales) {
  const rows = Object.entries(scales)
    .map(([name, data]) => {
      const semitones = getScaleSemitones(data.steps).join(' ');
      const use = data.use ? escapeHtml(data.use) : '';
      return `<tr class="fb-scale-prog-row" data-scale="${escapeHtml(name)}">
        <td>${escapeHtml(name)}</td>
        <td><code>${escapeHtml(data.steps.join(' '))}</code></td>
        <td><code>${semitones}</code></td>
        <td class="scale-use">${use}</td>
        <td class="scale-prog-diatonic-cell"></td>
        <td class="scale-prog-progressions-cell"></td>
      </tr>`;
    })
    .join('');

  return createSection(
    'scale progressions',
    `<p class="fb-hint scale-prog-hint">Diatonic chords and common progressions for each scale at root <strong class="scale-prog-root">C</strong>. Click a chord to highlight and hear it.</p>
    <table id="scale-progressions-table">
      <thead>
        <tr><th>Name</th><th>Steps</th><th>Intervals (semitones)</th><th>Typical use</th><th>Diatonic triads</th><th>Progressions</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`,
    'scale-progressions-section',
  );
}

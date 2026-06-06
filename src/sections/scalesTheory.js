import { escapeHtml, createSection } from '../utils.js';
import { getScaleSemitones } from '../music.js';

export function renderScalesTheory(scales) {
  const rows = Object.entries(scales)
    .map(([name, data]) => {
      const use = data.use ? escapeHtml(data.use) : '';
      const semitones = getScaleSemitones(data.steps).join(' ');
      return `<tr class="fb-selectable fb-scale-row" data-scale="${escapeHtml(name)}" data-label="${escapeHtml(name)}" data-steps='${JSON.stringify(data.steps)}'>
        <td>${escapeHtml(name)}</td>
        <td><code>${escapeHtml(data.steps.join(' '))}</code></td>
        <td><code>${semitones}</code></td>
        <td class="scale-use">${use}</td>
      </tr>`;
    })
    .join('');

  return createSection('scales / modes', `
    <p class="fb-hint">Set root in the dock (1–3 consecutive notes). Click a row to highlight on fretboard — syncs with genre theory and scale progressions.</p>
    <table id="scales-theory-table">
      <thead>
        <tr><th>Name</th><th>Steps</th><th>Intervals (semitones)</th><th>Typical use</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `, 'scales-theory-section');
}

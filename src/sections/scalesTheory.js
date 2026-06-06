import { escapeHtml, createSection } from '../utils.js';

export function renderScalesTheory(scales) {
  const rows = Object.entries(scales)
    .map(([name, data]) => `<tr class="fb-selectable fb-scale-row" data-scale="${escapeHtml(name)}" data-steps='${JSON.stringify(data.steps)}'>
      <td>${escapeHtml(name)}</td>
      <td><code>${escapeHtml(data.steps.join(' '))}</code></td>
    </tr>`)
    .join('');

  return createSection('scales / modes', `
    <p class="fb-hint">Uses the global root note. Click a row to highlight the scale on fretboard.</p>
    <table id="scales-theory-table">
      <thead><tr><th>name</th><th>steps</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

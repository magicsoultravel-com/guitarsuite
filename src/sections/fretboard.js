import { escapeHtml } from '../utils.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];
const NUM_DISPLAY_FRETS = 16;

function fretHeader(fret) {
  if ([5, 7, 9].includes(fret)) return '⬤';
  if (fret === 12) return '⬤⬤';
  return String(fret);
}

export function renderFretboard(fretboardData) {
  const panel = document.createElement('div');
  panel.className = 'sidebar-panel fretboard-panel';
  panel.innerHTML = `
    <p class="fb-hint">Click frets to toggle. Columns/rows elsewhere update this board.</p>
    <div class="fretboard-table-wrap">
      <table id="fretboard-table">
        <thead>
          <tr>
            <th>str</th>
            ${Array.from({ length: NUM_DISPLAY_FRETS }, (_, i) => i + 1)
              .map((f) => `<th>${fretHeader(f)}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${STRING_ORDER.map((string) => {
            const stringData = fretboardData[string];
            if (!stringData) {
              return `<tr><td colspan="${1 + NUM_DISPLAY_FRETS}">N/A</td></tr>`;
            }
            const cells = Array.from({ length: NUM_DISPLAY_FRETS }, (_, i) => {
              const fret = i + 1;
              const noteIndex = ((fret - 1) % 12) + 1;
              const note = escapeHtml(stringData[noteIndex] ?? '');
              return `<td>${note}</td>`;
            }).join('');
            return `<tr><td><strong>${escapeHtml(string)}</strong></td>${cells}</tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div id="fret-notation-display"></div>
    <div id="related-chords-display"></div>
  `;

  return panel;
}

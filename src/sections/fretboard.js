import { escapeHtml } from '../utils.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];
const NUM_DISPLAY_FRETS = 16;

function fretHeader(fret) {
  if ([5, 7, 9].includes(fret)) return '⬤';
  if (fret === 12) return '⬤⬤';
  return String(fret);
}

export function renderFretboard(fretboardData) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `
    <h2>fretboard interactive</h2>
    <div class="table-responsive">
      <table id="fretboard-table">
        <thead>
          <tr>
            <th>string</th>
            ${Array.from({ length: NUM_DISPLAY_FRETS }, (_, i) => i + 1)
              .map((f) => `<th>${fretHeader(f)}</th>`)
              .join('')}
          </tr>
        </thead>
        <tbody>
          ${STRING_ORDER.map((string) => {
            const stringData = fretboardData[string];
            if (!stringData) {
              return `<tr><td colspan="${1 + NUM_DISPLAY_FRETS}">Data not available for this string.</td></tr>`;
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
    <div id="fret-notation-display" style="margin-top:1em;white-space:pre-wrap;"></div>
    <div id="related-chords-display" style="margin-top:1em;white-space:pre-wrap;"></div>
  `;
  return section;
}

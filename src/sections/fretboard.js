import { escapeHtml } from '../utils.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];
const NUM_DISPLAY_FRETS = 16;

function fretLabel(fret) {
  if (fret === 0) return '0';
  if (fret === 12) return '12·';
  if ([3, 5, 7, 9].includes(fret)) return `${fret}·`;
  return String(fret);
}

/** Notes in JSON are keyed 0–12; repeat pattern for frets above 12. */
function noteAtFret(stringData, fret) {
  if (!stringData) return '';
  if (fret === 0) return stringData['0'] ?? '';
  const noteIndex = ((fret - 1) % 12) + 1;
  return stringData[String(noteIndex)] ?? '';
}

export function renderFretboard(fretboardData) {
  const panel = document.createElement('div');
  panel.className = 'fretboard-panel';

  const headerCells = STRING_ORDER.map(
    (s) => `<th class="string-head">${escapeHtml(s)}</th>`
  ).join('');

  const rows = [];
  for (let fret = 0; fret <= NUM_DISPLAY_FRETS; fret++) {
    const cells = STRING_ORDER.map((string) => {
      const stringData = fretboardData[string];
      if (!stringData) {
        return `<td class="fb-cell" data-string="${string}" data-fret="${fret}" data-pitch="">—</td>`;
      }
      const note = noteAtFret(stringData, fret);
      const pitch = note || string;
      const display = note || (fret === 0 ? string : '·');
      return `<td class="fb-cell" data-string="${escapeHtml(string)}" data-fret="${fret}" data-pitch="${escapeHtml(pitch)}">${escapeHtml(display)}</td>`;
    }).join('');
    rows.push(`<tr data-fret="${fret}"><th class="fret-head">${fretLabel(fret)}</th>${cells}</tr>`);
  }

  panel.innerHTML = `
    <div class="fretboard-table-wrap fretboard-vertical-wrap">
      <table id="fretboard-table" class="fretboard-vertical">
        <thead>
          <tr><th class="fret-head"></th>${headerCells}</tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <div id="fret-notation-display"></div>
    <div id="related-chords-display"></div>
  `;

  return panel;
}

import { escapeHtml } from '../utils.js';
import { noteAtFret } from '../music.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];
/** High string on top — conventional horizontal neck diagram. */
const HORIZONTAL_STRING_ORDER = [...STRING_ORDER].reverse();
const NUM_DISPLAY_FRETS = 16;

function fretLabel(fret) {
  if (fret === 0) return '0';
  if (fret === 12) return '12·';
  if ([3, 5, 7, 9].includes(fret)) return `${fret}·`;
  return String(fret);
}

function cellHtml(fretboardData, string, fret) {
  const stringData = fretboardData[string];
  if (!stringData) {
    return `<td class="fb-cell" data-string="${string}" data-fret="${fret}" data-pitch="">—</td>`;
  }
  const note = noteAtFret(stringData, fret);
  const pitch = note || string;
  const display = note || (fret === 0 ? string : '·');
  return `<td class="fb-cell" data-string="${escapeHtml(string)}" data-fret="${fret}" data-pitch="${escapeHtml(pitch)}">${escapeHtml(display)}</td>`;
}

function verticalTableHtml(fretboardData) {
  const headerCells = STRING_ORDER.map(
    (s) => `<th class="string-head">${escapeHtml(s)}</th>`
  ).join('');

  const rows = [];
  for (let fret = 0; fret <= NUM_DISPLAY_FRETS; fret++) {
    const cells = STRING_ORDER.map((string) => cellHtml(fretboardData, string, fret)).join('');
    rows.push(`<tr data-fret="${fret}"><th class="fret-head">${fretLabel(fret)}</th>${cells}</tr>`);
  }

  return {
    wrapClass: 'fretboard-table-wrap fretboard-vertical-wrap',
    tableClass: 'fretboard-vertical',
    thead: `<tr><th class="fret-head"></th>${headerCells}</tr>`,
    tbody: rows.join(''),
  };
}

function horizontalTableHtml(fretboardData) {
  const fretHeads = [];
  for (let fret = 0; fret <= NUM_DISPLAY_FRETS; fret++) {
    fretHeads.push(`<th class="fret-head">${fretLabel(fret)}</th>`);
  }

  const rows = HORIZONTAL_STRING_ORDER.map((string) => {
    const cells = [];
    for (let fret = 0; fret <= NUM_DISPLAY_FRETS; fret++) {
      cells.push(cellHtml(fretboardData, string, fret));
    }
    return `<tr data-string="${escapeHtml(string)}"><th class="string-head">${escapeHtml(string)}</th>${cells.join('')}</tr>`;
  });

  return {
    wrapClass: 'fretboard-table-wrap fretboard-horizontal-wrap',
    tableClass: 'fretboard-horizontal',
    thead: `<tr><th class="string-head"></th>${fretHeads.join('')}</tr>`,
    tbody: rows.join(''),
  };
}

function tableParts(fretboardData, orientation) {
  return orientation === 'horizontal'
    ? horizontalTableHtml(fretboardData)
    : verticalTableHtml(fretboardData);
}

/** Rebuild `#fretboard-table` in place for the given orientation. */
export function applyFretboardOrientation(panel, fretboardData, orientation) {
  const wrap = panel.querySelector('.fretboard-table-wrap');
  const table = panel.querySelector('#fretboard-table');
  if (!wrap || !table) return;

  const parts = tableParts(fretboardData, orientation);
  wrap.className = parts.wrapClass;
  table.className = parts.tableClass;
  table.dataset.orientation = orientation;

  let thead = table.querySelector('thead');
  let tbody = table.querySelector('tbody');
  if (!thead) {
    thead = document.createElement('thead');
    table.prepend(thead);
  }
  if (!tbody) {
    tbody = document.createElement('tbody');
    table.append(tbody);
  }
  thead.innerHTML = parts.thead;
  tbody.innerHTML = parts.tbody;

  table.dispatchEvent(new Event('fretboard:repaint'));
}

export function renderFretboard(fretboardData, { orientation = 'vertical' } = {}) {
  const panel = document.createElement('div');
  panel.className = 'fretboard-panel';
  panel.dataset.orientation = orientation;

  const parts = tableParts(fretboardData, orientation);

  panel.innerHTML = `
    <div class="${parts.wrapClass}">
      <table id="fretboard-table" class="${parts.tableClass}" data-orientation="${orientation}">
        <thead>
          ${parts.thead}
        </thead>
        <tbody>${parts.tbody}</tbody>
      </table>
    </div>
    <div id="fret-notation-display"></div>
    <div id="related-chords-display"></div>
  `;

  return panel;
}

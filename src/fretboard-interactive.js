import { normalizePitch, getChordNotes, getScaleNotes, getTheoryNotes } from './music.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];

export function initFretboardInteractive(hub, notesJson, chordsJson) {
  const fretboardTable = document.getElementById('fretboard-table');
  const fretNotationDisplay = document.getElementById('fret-notation-display');
  const relatedChordsDisplay = document.getElementById('related-chords-display');

  if (!fretboardTable) return;

  const notesData = notesJson;
  const chordsData = chordsJson;

  function cellPitch(cell, stringNameCell, cellIndex) {
    if (cellIndex === 0) return normalizePitch(stringNameCell.textContent.trim());
    const strong = cell.querySelector('strong');
    return normalizePitch((strong ?? cell).textContent.trim());
  }

  function updateFretboardDisplay() {
    const active = hub.getActiveNotes();
    const root = normalizePitch(hub.getRoot());

    fretboardTable.querySelectorAll('.selected, .fb-root').forEach((cell) => {
      cell.classList.remove('selected', 'fb-root');
    });

    const stringFretsMap = Object.fromEntries(STRING_ORDER.map((s) => [s, []]));

    fretboardTable.querySelectorAll('tbody tr').forEach((row) => {
      const stringNameCell = row.querySelector('td:first-child strong');
      if (!stringNameCell) return;
      const stringName = stringNameCell.textContent.trim();

      row.querySelectorAll('td').forEach((cell, cellIndex) => {
        const pitch = cellPitch(cell, stringNameCell, cellIndex);
        if (!pitch) return;

        if (active.has(pitch)) {
          cell.classList.add('selected');
          if (pitch === root) cell.classList.add('fb-root');
          stringFretsMap[stringName].push(cellIndex === 0 ? 0 : cellIndex);
        }
      });
    });

    if (fretNotationDisplay) {
      const lines = STRING_ORDER
        .filter((s) => stringFretsMap[s].length)
        .map((s) => `${s} - ${stringFretsMap[s].sort((a, b) => a - b).join(', ')}`);
      fretNotationDisplay.textContent = lines.length
        ? `Selected frets:\n${lines.join('\n')}`
        : 'Click notes, chords, scales, or theory rows to highlight the fretboard.';
    }

    updateRelatedChords(active);
    updateActiveMarkers();
  }

  function updateRelatedChords(active) {
    if (!relatedChordsDisplay || !chordsData || !notesData) return;

    const selected = [...active];
    if (!selected.length) {
      relatedChordsDisplay.textContent = 'Select notes to find related chords.';
      return;
    }

    const matched = [];
    for (const [chordName, details] of Object.entries(chordsData)) {
      const pitches = new Set(getChordNotes(details.variant1 || {}, notesData));
      if (selected.every((p) => pitches.has(normalizePitch(p)))) matched.push(chordName);
    }

    relatedChordsDisplay.textContent = matched.length
      ? `Related chords:\n${matched.sort().join(', ')}`
      : 'No chords found containing all selected notes.';
  }

  function updateActiveMarkers() {
    document.querySelectorAll('.fb-selectable.fb-active').forEach((el) => el.classList.remove('fb-active'));
    const label = hub.getSourceLabel();
    if (!label || label === 'root' || label === 'manual') return;
    document.querySelectorAll(`[data-label="${CSS.escape(label)}"]`).forEach((el) => {
      el.classList.add('fb-active');
    });
  }

  hub.subscribe(updateFretboardDisplay);

  fretboardTable.addEventListener('click', (event) => {
    const cell = event.target.closest('td');
    if (!cell || !fretboardTable.contains(cell)) return;

    const row = cell.closest('tr');
    const stringNameCell = row?.querySelector('td:first-child strong');
    if (!stringNameCell) return;

    const cellIndex = [...row.children].indexOf(cell);
    const pitch = cellPitch(cell, stringNameCell, cellIndex);
    if (!pitch) return;

    hub.toggleNote(pitch);
  });

  updateFretboardDisplay();
}

export function wireChordNoteTables(hub, chordsJson, notesJson) {
  document.querySelectorAll('.fb-chord-col').forEach((th) => {
    th.title = 'Click to highlight on fretboard';
    th.addEventListener('click', () => {
      const chordName = th.dataset.chord;
      const variant = chordsJson[chordName]?.variant1;
      if (!variant) return;
      const notes = getChordNotes(variant, notesJson);
      hub.selectNotes(notes, chordName);
    });
  });
}

export function wireChordsTheory(hub, chordsTheory, intervals, sectionEl) {
  const tbody = sectionEl.querySelector('#chords-theory-body');
  if (!tbody) return;

  let lastRoot = hub.getRoot();

  function renderRows() {
    const root = hub.getRoot();
    tbody.innerHTML = '';

    for (const [type, data] of Object.entries(chordsTheory)) {
      const intervalList = data.intervals.split(' ').map(Number);
      const verbal = intervalList.map((i) => intervals[i]?.names?.[0] ?? i);
      const notes = getTheoryNotes(root, data.intervals);
      const short = root + data.short.slice(1);
      const intervalsStr = data.intervals;

      const tr = document.createElement('tr');
      tr.className = 'fb-selectable fb-theory-row';
      tr.dataset.label = type;
      tr.title = 'Click to highlight on fretboard';
      tr.innerHTML = `
        <td>${type}</td>
        <td>${short}</td>
        <td>${verbal.join(', ')}</td>
        <td>${intervalList.slice(1).join(' ')}</td>
        <td>${notes.join(', ')}</td>
      `;
      tr.addEventListener('click', () => {
        hub.selectDerived(type, (r) => getTheoryNotes(r, intervalsStr));
      });
      tbody.appendChild(tr);
    }

    updateActiveMarkersTheory(sectionEl, hub.getSourceLabel());
  }

  hub.subscribe(() => {
    const currentRoot = hub.getRoot();
    if (currentRoot !== lastRoot) {
      lastRoot = currentRoot;
      renderRows();
    } else {
      updateActiveMarkersTheory(sectionEl, hub.getSourceLabel());
    }
  });
  renderRows();
}

function updateActiveMarkersTheory(sectionEl, label) {
  sectionEl.querySelectorAll('.fb-theory-row.fb-active').forEach((r) => r.classList.remove('fb-active'));
  if (!label || label === 'root' || label === 'manual') return;
  sectionEl.querySelectorAll(`.fb-theory-row[data-label="${CSS.escape(label)}"]`).forEach((r) => {
    r.classList.add('fb-active');
  });
}

export function wireScalesTheory(hub, scales, sectionEl) {
  sectionEl.querySelectorAll('.fb-scale-row').forEach((row) => {
    row.title = 'Click to highlight on fretboard';
    row.addEventListener('click', () => {
      const name = row.dataset.scale;
      const steps = JSON.parse(row.dataset.steps || '[]');
      hub.selectDerived(name, (r) => getScaleNotes(r, steps));
    });
  });

  hub.subscribe(() => {
    sectionEl.querySelectorAll('.fb-scale-row.fb-active').forEach((r) => r.classList.remove('fb-active'));
    const label = hub.getSourceLabel();
    if (label && label !== 'root' && label !== 'manual') {
      sectionEl.querySelectorAll(`.fb-scale-row[data-scale="${CSS.escape(label)}"]`).forEach((r) => {
        r.classList.add('fb-active');
      });
    }
  });
}

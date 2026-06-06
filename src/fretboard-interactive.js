import { normalizePitch, getChordNotes, getScaleNotes, getTheoryNotes } from './music.js';
import {
  playChordByName,
  playFretNote,
  playScaleByName,
  playTheoryType,
  playNote,
} from './playback.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];

export function initFretboardInteractive(hub, notesJson, chordsJson) {
  const fretboardTable = document.getElementById('fretboard-table');
  const fretNotationDisplay = document.getElementById('fret-notation-display');
  const relatedChordsDisplay = document.getElementById('related-chords-display');

  if (!fretboardTable) return;

  const chordsData = chordsJson;

  function cellPitch(cell) {
    return normalizePitch(cell.dataset.pitch || cell.textContent.trim());
  }

  function updateFretboardDisplay() {
    const root = normalizePitch(hub.getRoot());
    const layerData = hub.getLayers();

    fretboardTable.querySelectorAll('.fb-layer-1, .fb-layer-2, .fb-layer-3, .fb-root').forEach((cell) => {
      cell.classList.remove('fb-layer-1', 'fb-layer-2', 'fb-layer-3', 'fb-root');
    });

    const stringFretsMap = Object.fromEntries(STRING_ORDER.map((s) => [s, []]));

    fretboardTable.querySelectorAll('td.fb-cell').forEach((cell) => {
      const pitch = cellPitch(cell);
      if (!pitch) return;
      const stringName = cell.dataset.string;
      const fret = parseInt(cell.dataset.fret, 10);

      for (const { slot, notes } of layerData) {
        if (notes.has(pitch)) cell.classList.add(`fb-layer-${slot}`);
      }

      if (pitch === root) cell.classList.add('fb-root');

      if (layerData.some(({ notes }) => notes.has(pitch)) && stringName && !Number.isNaN(fret)) {
        stringFretsMap[stringName].push(fret);
      }
    });

    if (fretNotationDisplay) {
      const lines = STRING_ORDER
        .filter((s) => stringFretsMap[s].length)
        .map((s) => `${s} - ${[...new Set(stringFretsMap[s])].sort((a, b) => a - b).join(', ')}`);
      fretNotationDisplay.textContent = lines.length
        ? `Selected frets:\n${lines.join('\n')}`
        : '';
    }

    updateRelatedChords(layerData);
    updateActiveMarkers(hub);
  }

  function updateRelatedChords(layerData) {
    if (!relatedChordsDisplay || !chordsData || !notesJson) return;

    const parts = layerData.map(({ slot, label, notes }) => {
      const selected = [...notes];
      if (!selected.length) return '';
      const matched = [];
      for (const [chordName, details] of Object.entries(chordsData)) {
        const pitches = new Set(getChordNotes(details.variant1 || {}, notesJson));
        if (selected.every((p) => pitches.has(normalizePitch(p)))) matched.push(chordName);
      }
      if (!matched.length) return '';
      return `[${slot}] ${label}: ${matched.sort().join(', ')}`;
    }).filter(Boolean);

    relatedChordsDisplay.textContent = parts.length ? parts.join('\n') : '';
  }

  hub.subscribe(updateFretboardDisplay);

  fretboardTable.addEventListener('click', (event) => {
    const cell = event.target.closest('td.fb-cell');
    if (!cell) return;
    const pitch = cellPitch(cell);
    if (!pitch) return;
    hub.toggleNote(pitch);
    playFretNote(cell.dataset.string, cell.dataset.fret, pitch);
  });

  updateFretboardDisplay();
}

export function updateActiveMarkers(hub) {
  document.querySelectorAll('.fb-selectable').forEach((el) => {
    el.classList.remove('fb-active', 'fb-active-1', 'fb-active-2', 'fb-active-3');
  });

  for (const { slot, label } of hub.getLayers()) {
    if (label === 'manual') continue;
    document.querySelectorAll(`[data-label="${CSS.escape(label)}"]`).forEach((el) => {
      el.classList.add('fb-active', `fb-active-${slot}`);
    });
  }
}

export function wireChordNoteTables(hub, chordsJson, notesJson) {
  document.querySelectorAll('.fb-chord-col').forEach((th) => {
    th.title = 'Click to highlight on fretboard (up to 3 layers)';
    th.addEventListener('click', () => {
      const chordName = th.dataset.chord;
      const variant = chordsJson[chordName]?.variant1;
      if (!variant) return;
      hub.toggleSelection({ label: chordName, notes: getChordNotes(variant, notesJson) });
      playChordByName(chordName, chordsJson, notesJson);
    });
  });

  document.querySelectorAll('.notes-table td').forEach((td) => {
    const pitch = normalizePitch(td.textContent.trim());
    if (!pitch) return;
    td.classList.add('fb-note-cell');
    td.title = `Play ${pitch}`;
    td.addEventListener('click', () => playNote(pitch));
  });

  hub.subscribe(() => updateActiveMarkers(hub));
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
      tr.title = 'Click to highlight on fretboard (up to 3 layers)';
      tr.innerHTML = `
        <td>${type}</td>
        <td>${short}</td>
        <td>${verbal.join(', ')}</td>
        <td>${intervalList.slice(1).join(' ')}</td>
        <td>${notes.join(', ')}</td>
      `;
      tr.addEventListener('click', () => {
        hub.toggleSelection({ label: type, resolve: (r) => getTheoryNotes(r, intervalsStr) });
        playTheoryType(type, hub.getRoot(), chordsTheory);
      });
      tbody.appendChild(tr);
    }

    updateActiveMarkers(hub);
  }

  hub.subscribe(() => {
    const currentRoot = hub.getRoot();
    if (currentRoot !== lastRoot) {
      lastRoot = currentRoot;
      renderRows();
    } else {
      updateActiveMarkers(hub);
    }
  });
  renderRows();
}

export function wireScalesTheory(hub, scales, sectionEl) {
  sectionEl.querySelectorAll('.fb-scale-row').forEach((row) => {
    row.title = 'Click to highlight on fretboard (up to 3 layers)';
    row.addEventListener('click', () => {
      const name = row.dataset.scale;
      const steps = JSON.parse(row.dataset.steps || '[]');
      hub.toggleSelection({ label: name, resolve: (r) => getScaleNotes(r, steps) });
      playScaleByName(name, hub.getRoot(), scales);
    });
  });

  hub.subscribe(() => updateActiveMarkers(hub));
}

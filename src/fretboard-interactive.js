import { formatRootsDisplay, getDisplayRoot } from './displayRoot.js';
import { normalizePitch, getChordNotes, getScaleNotes, getTheoryNotes, getDiatonicTriads, resolveProgressionChords, numeralsToPattern } from './music.js';
import { getShapeFrets, pickChord } from './chordResolve.js';
import { appendChordChips, createChordChip, getChordContext, makePlayFns } from './chordChip.js';
import { syncChipLayers } from './dockModule.js';
import {
  playFretNote,
  playScaleByName,
  playNote,
} from './playback.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];

function chordCtxFromHub(hub, chordsJson, notesJson, chordsTheory) {
  return getChordContext(hub, chordsJson, notesJson, chordsTheory);
}

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
    const activeRoots = new Set(hub.getRoots().map(normalizePitch).filter(Boolean));
    const layerData = hub.getLayers();

    fretboardTable.querySelectorAll('.fb-layer-1, .fb-layer-2, .fb-layer-3, .fb-root, .fb-shape').forEach((cell) => {
      cell.classList.remove('fb-layer-1', 'fb-layer-2', 'fb-layer-3', 'fb-root', 'fb-shape');
    });

    const stringFretsMap = Object.fromEntries(STRING_ORDER.map((s) => [s, []]));

    for (const layer of layerData) {
      const { slot, notes, shape } = layer;

      if (shape) {
        for (const { string, fret } of getShapeFrets(shape)) {
          const cell = fretboardTable.querySelector(
            `td.fb-cell[data-string="${string}"][data-fret="${fret}"]`,
          );
          if (cell) {
            cell.classList.add(`fb-layer-${slot}`, 'fb-shape');
            stringFretsMap[string].push(fret);
          }
        }
      } else {
        fretboardTable.querySelectorAll('td.fb-cell').forEach((cell) => {
          const pitch = cellPitch(cell);
          if (!pitch || !notes.has(pitch)) return;
          cell.classList.add(`fb-layer-${slot}`);
          const stringName = cell.dataset.string;
          const fret = parseInt(cell.dataset.fret, 10);
          if (stringName && !Number.isNaN(fret)) stringFretsMap[stringName].push(fret);
        });
      }
    }

    fretboardTable.querySelectorAll('td.fb-cell').forEach((cell) => {
      const pitch = cellPitch(cell);
      if (pitch && activeRoots.has(pitch)) cell.classList.add('fb-root');
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

    const parts = layerData.map(({ slot, label, chordRef, notes }) => {
      const name = chordRef || label;
      if (chordRef) return `[${slot}] ${chordRef}`;
      const selected = [...notes];
      if (!selected.length) return '';
      const matched = [];
      for (const [chordName, details] of Object.entries(chordsData)) {
        const pitches = new Set(getChordNotes(details.variant1 || {}, notesJson));
        if (selected.every((p) => pitches.has(normalizePitch(p)))) matched.push(chordName);
      }
      if (!matched.length) return `[${slot}] ${label}`;
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
    if (!hub.getRoots().length) hub.toggleRoot(pitch);
    playFretNote(cell.dataset.string, cell.dataset.fret, pitch);
  });

  updateFretboardDisplay();
}

export function updateActiveMarkers(hub) {
  document.querySelectorAll('.fb-selectable').forEach((el) => {
    el.classList.remove('fb-active', 'fb-active-1', 'fb-active-2', 'fb-active-3');
  });

  for (const layer of hub.getLayers()) {
    if (layer.label === 'manual') continue;
    const slot = layer.slot;
    if (layer.meta?.theoryType) {
      document.querySelectorAll(`[data-theory-type="${CSS.escape(layer.meta.theoryType)}"]`).forEach((el) => {
        el.classList.add('fb-active', `fb-active-${slot}`);
      });
    }
    const chipKey = layer.chordRef || layer.label;
    document.querySelectorAll(`[data-chord="${CSS.escape(chipKey)}"], [data-label="${CSS.escape(chipKey)}"]`).forEach((el) => {
      el.classList.add('fb-active', `fb-active-${slot}`);
    });
    if (layer.family === 'scale') {
      document.querySelectorAll(`[data-scale="${CSS.escape(layer.label)}"]`).forEach((el) => {
        el.classList.add('fb-active', `fb-active-${slot}`);
      });
    }
    if (layer.label !== chipKey) {
      document.querySelectorAll(`[data-label="${CSS.escape(layer.label)}"]`).forEach((el) => {
        el.classList.add('fb-active', `fb-active-${slot}`);
      });
    }
  }

  syncChipLayers(hub);
}

export function wireChordNoteTables(hub, chordsJson, notesJson, chordsTheory = {}) {
  const ctx = chordCtxFromHub(hub, chordsJson, notesJson, chordsTheory);

  function fillSongChords() {
    const grid = document.querySelector('#chords-notes-section .song-chords-grid');
    if (!grid) return;
    const names = (grid.dataset.chords || '').split(',').filter(Boolean);
    appendChordChips(grid, names, hub, ctx);
  }

  fillSongChords();

  document.querySelectorAll('.notes-table td').forEach((td) => {
    const pitch = normalizePitch(td.textContent.trim());
    if (!pitch) return;
    td.classList.add('fb-note-cell');
    td.title = `Play ${pitch}`;
    td.addEventListener('click', () => playNote(pitch));
  });

  hub.subscribe(() => {
    updateActiveMarkers(hub);
    fillSongChords();
  });
}

export function wireChordsTheory(hub, chordsTheory, intervals, sectionEl) {
  const tbody = sectionEl.querySelector('#chords-theory-body');
  if (!tbody) return;

  let lastDisplayRoot = getDisplayRoot(hub);

  function renderRows() {
    const root = getDisplayRoot(hub);
    tbody.innerHTML = '';

    for (const [type, data] of Object.entries(chordsTheory)) {
      const intervalList = data.intervals.split(' ').map(Number);
      const verbal = intervalList.map((i) => intervals[i]?.names?.[0] ?? i);
      const notes = getTheoryNotes(root, data.intervals);
      const short = root + data.short.slice(1);
      const intervalsStr = data.intervals;

      const tr = document.createElement('tr');
      tr.className = 'fb-selectable fb-theory-row';
      tr.dataset.theoryType = type;
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
        const c = hub.getChordContext();
        if (!c) return;
        pickChord(hub, c, makePlayFns(c.notesJson), { theoryType: type });
      });
      tbody.appendChild(tr);
    }

    updateActiveMarkers(hub);
  }

  hub.subscribe(() => {
    const currentRoot = getDisplayRoot(hub);
    if (currentRoot !== lastDisplayRoot) {
      lastDisplayRoot = currentRoot;
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
      hub.toggleSelection({ label: name, resolve: (r) => getScaleNotes(r, steps), family: 'scale' });
      playScaleByName(name, hub.getRoot(), scales);
    });
  });

  hub.subscribe(() => updateActiveMarkers(hub));
}

function pickScaleTriad(hub, triad) {
  const ctx = hub.getChordContext();
  if (!ctx) return;
  pickChord(hub, ctx, makePlayFns(ctx.notesJson), { symbol: triad.symbol, fallbackNotes: triad.notes });
}

function fillScaleProgRow(row, data, root, hub) {
  const diatonicCell = row.querySelector('.scale-prog-diatonic-cell');
  const progCell = row.querySelector('.scale-prog-progressions-cell');
  if (!diatonicCell || !progCell || !data?.steps) return;

  const wasOpen = progCell.querySelector('.scale-prog-details')?.open;
  const triads = getDiatonicTriads(root, data.steps);

  diatonicCell.replaceChildren();
  const diatonicChips = document.createElement('div');
  diatonicChips.className = 'scale-diatonic-chords';
  for (const triad of triads) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scale-prog-chip fb-selectable';
    btn.dataset.label = triad.symbol;
    btn.title = `${triad.roman}: ${triad.notes.join(', ')}`;
    btn.innerHTML = `<span class="scale-prog-roman">${triad.roman}</span> ${triad.symbol}`;
    btn.addEventListener('click', () => pickScaleTriad(hub, triad));
    diatonicChips.appendChild(btn);
  }
  diatonicCell.appendChild(diatonicChips);

  progCell.replaceChildren();
  const progressions = data.progressions || [];

  if (!progressions.length) {
    const empty = document.createElement('span');
    empty.className = 'scale-prog-empty';
    empty.textContent = '—';
    progCell.appendChild(empty);
    return;
  }

  const details = document.createElement('details');
  details.className = 'scale-prog-details';

  const summary = document.createElement('summary');
  summary.className = 'scale-prog-details-summary';
  summary.textContent = `${progressions.length} progression${progressions.length === 1 ? '' : 's'}`;
  details.appendChild(summary);

  const progList = document.createElement('div');
  progList.className = 'scale-progressions-list';

  for (const prog of progressions) {
    const progRow = document.createElement('div');
    progRow.className = 'scale-prog-row';

    const title = document.createElement('span');
    title.className = 'scale-prog-name';
    title.textContent = prog.name;
    progRow.appendChild(title);

    const chips = document.createElement('div');
    chips.className = 'scale-prog-chips';
    for (const triad of resolveProgressionChords(root, data.steps, prog.pattern)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scale-prog-chip fb-selectable is-prog';
      btn.dataset.label = triad.symbol;
      btn.title = `${triad.roman}: ${triad.notes.join(', ')}`;
      btn.textContent = triad.symbol;
      btn.addEventListener('click', () => pickScaleTriad(hub, triad));
      chips.appendChild(btn);
    }
    progRow.appendChild(chips);

    const pattern = document.createElement('code');
    pattern.className = 'scale-prog-pattern';
    pattern.textContent = prog.pattern;
    progRow.appendChild(pattern);

    progList.appendChild(progRow);
  }

  details.appendChild(progList);
  if (wasOpen) details.open = true;
  progCell.appendChild(details);
}

export function wireScaleProgressions(hub, scales, sectionEl) {
  const rootEl = sectionEl.querySelector('.scale-prog-root');
  const rows = sectionEl.querySelectorAll('.fb-scale-prog-row');
  if (!rows.length) return;

  function render() {
    const root = getDisplayRoot(hub);
    if (rootEl) rootEl.textContent = formatRootsDisplay(hub);

    for (const row of rows) {
      const scaleName = row.dataset.scale;
      fillScaleProgRow(row, scales[scaleName], root, hub);
    }

    updateActiveMarkers(hub);
  }

  hub.subscribe(render);
  render();
}

export function wireGenreTheory(hub, scales, genres, sectionEl) {
  const rootEl = sectionEl.querySelector('.genre-prog-root');

  sectionEl.querySelectorAll('.genre-scale-chip').forEach((chip) => {
    const name = chip.dataset.scale;
    const data = scales[name];
    if (!data?.steps) return;

    chip.addEventListener('click', () => {
      hub.toggleSelection({
        label: name,
        resolve: (r) => getScaleNotes(r, data.steps),
        family: 'scale',
      });
      playScaleByName(name, hub.getRoot() || getDisplayRoot(hub), scales);
    });
  });

  function inferGenreScale(prog, genreData) {
    if (prog.scale && scales[prog.scale]) return prog.scale;
    const pattern = prog.pattern || numeralsToPattern(prog.numerals);
    const candidates = genreData?.scales || [];
    if (/\bi\b/i.test(pattern) || pattern.includes(' i')) {
      return candidates.find((s) => /aeolian|dorian|minor/i.test(s)) || 'Aeolian';
    }
    if (/\bVII\b/.test(pattern) || /bVII/i.test(prog.numerals || '')) {
      return candidates.find((s) => s === 'Mixolydian') || 'Mixolydian';
    }
    return candidates.find((s) => scales[s]) || 'Ionian';
  }

  function fillGenreProgressionRow(row, prog, root) {
    const cell = row.querySelector('.genre-prog-chords-cell');
    if (!cell) return;

    cell.replaceChildren();
    const pattern = prog.pattern || numeralsToPattern(prog.numerals);
    if (!pattern) {
      cell.textContent = '—';
      return;
    }

    const ctx = hub.getChordContext();
    if (!ctx) {
      cell.textContent = prog.example || '—';
      return;
    }

    const genreData = genres[row.dataset.genre];
    const scaleKey = inferGenreScale(prog, genreData);
    const steps = scales[scaleKey]?.steps;
    if (!steps) {
      cell.textContent = prog.example || '—';
      return;
    }

    const quality = prog.quality || (row.dataset.genre === 'Blues' ? 'dom7' : '');
    const triads = resolveProgressionChords(root, steps, pattern, { quality });
    if (!triads.length) {
      cell.textContent = prog.example || '—';
      return;
    }

    const chips = document.createElement('div');
    chips.className = 'dock-chip-grid genre-prog-chips';
    for (const triad of triads) {
      chips.appendChild(createChordChip(hub, ctx, triad.symbol, {
        title: `${triad.roman}: ${triad.notes.join(', ')}`,
      }));
    }
    cell.appendChild(chips);
  }

  function render() {
    const root = getDisplayRoot(hub);
    if (rootEl) rootEl.textContent = formatRootsDisplay(hub);

    sectionEl.querySelectorAll('.genre-prog-row').forEach((row) => {
      const genreData = genres[row.dataset.genre];
      const prog = genreData?.progressions?.[Number(row.dataset.progIndex)];
      if (prog) fillGenreProgressionRow(row, prog, root);
    });

    updateActiveMarkers(hub);
  }

  hub.subscribe(render);
  render();
}

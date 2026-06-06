import { getDisplayRoot, commitRoot } from './displayRoot.js';
import { normalizePitch, getChordNotes, getScaleNotes, getTheoryNotes, getDiatonicTriads, resolveProgressionChords } from './music.js';
import { getShapeFrets, makeChordContext, pickChord } from './chordResolve.js';
import {
  playVoicedChord,
  playFretNote,
  playScaleByName,
  playNote,
  playChord,
} from './playback.js';

const STRING_ORDER = ['E', 'A', 'D', 'G', 'B', 'e'];

function playFns(notesJson) {
  return {
    playVoiced: (variant) => playVoicedChord(variant, notesJson),
    playNotes: (notes) => playChord(notes),
  };
}

function chordCtxFromHub(hub, chordsJson, notesJson, chordsTheory) {
  return hub.getChordContext() || makeChordContext(chordsJson, notesJson, chordsTheory);
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
    const root = normalizePitch(hub.getRoot());
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
      if (root && cellPitch(cell) === root) cell.classList.add('fb-root');
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
    if (!hub.getRoot()) commitRoot(hub, pitch);
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
    if (layer.label !== chipKey) {
      document.querySelectorAll(`[data-label="${CSS.escape(layer.label)}"]`).forEach((el) => {
        el.classList.add('fb-active', `fb-active-${slot}`);
      });
    }
  }
}

export function wireChordNoteTables(hub, chordsJson, notesJson, chordsTheory = {}) {
  const ctx = () => chordCtxFromHub(hub, chordsJson, notesJson, chordsTheory);

  document.querySelectorAll('.fb-chord-col').forEach((th) => {
    th.title = 'Click to highlight on fretboard (up to 3 layers)';
    th.addEventListener('click', () => {
      pickChord(hub, ctx(), playFns(notesJson), { chordName: th.dataset.chord });
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
        const ctx = hub.getChordContext();
        if (!ctx) return;
        pickChord(hub, ctx, playFns(ctx.notesJson), { theoryType: type });
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
      commitRoot(hub, getDisplayRoot(hub));
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
  pickChord(hub, ctx, playFns(ctx.notesJson), { symbol: triad.symbol, fallbackNotes: triad.notes });
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
    if (rootEl) rootEl.textContent = root;

    for (const row of rows) {
      const scaleName = row.dataset.scale;
      fillScaleProgRow(row, scales[scaleName], root, hub);
    }

    updateActiveMarkers(hub);
  }

  hub.subscribe(render);
  render();
}

export function wireGenreTheory(hub, scales, sectionEl) {
  sectionEl.querySelectorAll('.genre-scale-chip').forEach((chip) => {
    const name = chip.dataset.scale;
    const data = scales[name];
    if (!data?.steps) return;

    chip.addEventListener('click', () => {
      commitRoot(hub, getDisplayRoot(hub));
      hub.toggleSelection({
        label: name,
        resolve: (r) => getScaleNotes(r, data.steps),
        family: 'scale',
      });
      playScaleByName(name, hub.getRoot(), scales);
    });
  });

  hub.subscribe(() => updateActiveMarkers(hub));
}

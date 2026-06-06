import { THEORY_SUFFIX } from '../chordVoicings.js';
import { getDisplayRoot } from '../displayRoot.js';
import {
  CHROMATIC,
  getChordNotes,
  getRoot,
  getTheoryNotes,
  musicalSort,
  normalizePitch,
  sortNotesByMusicalOrder,
} from '../music.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers } from '../dockModule.js';
import { pickChord as applyChordPick } from '../chordResolve.js';
import { playVoicedChord, playChord } from '../playback.js';

const playFns = (notesJson) => ({
  playVoiced: (variant) => playVoicedChord(variant, notesJson),
  playNotes: (notes) => playChord(notes),
});

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const STRING_KEYS = ['E1', 'A', 'D', 'G', 'B', 'E2'];

function resolveChordRoot(name, data) {
  const fromData = normalizePitch(data?.root);
  if (fromData && CHROMATIC.includes(fromData)) return fromData;
  return normalizePitch(getRoot(name));
}

function theoryChordsAtRoot(root, chordsJson) {
  const names = Object.values(THEORY_SUFFIX).map((suffix) => root + suffix);
  return names.filter((name) => chordsJson[name]);
}

function formatFret(value) {
  const v = String(value ?? 'x');
  return v === 'x' ? '×' : v;
}

function renderShapePreview(variant, notesJson) {
  const frets = STRING_KEYS.map((k) => formatFret(variant?.[k]));
  const notes = variant
    ? sortNotesByMusicalOrder(getChordNotes(variant, notesJson)).join(' · ')
    : '';
  return { frets, notes };
}

function pickChord(hub, chordsJson, notesJson, chordsTheory, name) {
  const ctx = { chordsJson, notesJson, chordsTheory };
  applyChordPick(hub, ctx, playFns(notesJson), { chordName: name });
}

function resolveDisplayChord(hub, chordsJson, chordsTheory, byRoot, songChords) {
  const last = hub.getLastChordLabel();
  if (last && (chordsJson[last] || chordsTheory?.[last])) return last;

  const layers = hub.getLayers().filter((l) => l.label !== 'manual' && l.family === 'chord');
  const chordLayer = [...layers].reverse().find((l) => l.chordRef || chordsJson[l.label] || chordsTheory?.[l.label] || l.via);
  if (chordLayer) return chordLayer.chordRef || chordLayer.label;

  const preview = getDisplayRoot(hub);
  const songAtRoot = songChords.find((c) => resolveChordRoot(c, chordsJson[c]) === preview);
  if (songAtRoot) return songAtRoot;

  const atRoot = byRoot[preview] || [];
  return atRoot[0] || null;
}

function formatCollapsedSummary(name, chordsJson, chordsTheory, notesJson, hub) {
  if (!name) return '—';
  if (chordsJson[name]) {
    const data = chordsJson[name];
    const { frets, notes } = renderShapePreview(data.variant1, notesJson);
    const type = data.type ? `${data.type} · ` : '';
    return `${name} · ${type}${notes || frets.join(' ')}`;
  }
  const layer = hub.getLayers().find((l) => l.chordRef === name || l.label === name);
  if (layer?.via && layer.chordRef && chordsJson[layer.chordRef]) {
    const data = chordsJson[layer.chordRef];
    const { frets, notes } = renderShapePreview(data.variant1, notesJson);
    return `${layer.chordRef} · ${layer.via} · ${notes || frets.join(' ')}`;
  }
  if (chordsTheory?.[name]) {
    const root = getDisplayRoot(hub);
    const data = chordsTheory[name];
    const short = data.short ? root + data.short.slice(1) : name;
    const notes = getTheoryNotes(root, data.intervals).join(' · ');
    return `${short} · ${name} · ${notes}`;
  }
  if (layer?.notes.size) {
    return `${name} · ${[...layer.notes].join(' · ')}`;
  }
  return '—';
}

export function renderChordPicker(hub, chordsJson, notesJson, currentSong, chordsTheory = {}) {
  const byRoot = Object.fromEntries(CHROMATIC.map((r) => [r, theoryChordsAtRoot(r, chordsJson)]));
  let songChords = [...new Set((currentSong?.chords || '').split(/\s+/).filter(Boolean))].sort(musicalSort);
  let songSet = new Set(songChords);

  const el = document.createElement('div');
  el.id = 'chord-picker';
  el.className = 'chord-picker';

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub chord-picker-summary"></span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="dock-section chord-picker-song" ${songChords.length ? '' : 'hidden'}>
        <span class="dock-section-label">In song</span>
        <div class="dock-chip-grid chord-picker-song-grid"></div>
      </div>
      <div class="dock-section">
        <span class="dock-section-label chord-picker-root-label">At root</span>
        <div class="dock-chip-grid chord-picker-root-grid"></div>
      </div>
      <div class="dock-detail chord-picker-diagram">
        <div class="dock-detail-head">
          <span class="dock-detail-title chord-picker-diagram-name">—</span>
          <span class="dock-detail-sub chord-picker-diagram-type"></span>
        </div>
        <div class="dock-mono-block">
          <span class="dock-mono-muted">${STRING_LABELS.join(' ')}</span>
          <span class="dock-mono-accent chord-picker-frets">—</span>
        </div>
        <div class="dock-detail-sub chord-picker-notes"></div>
      </div>
    </div>
  `;

  ensureDockChrome(el, 'chords', 'Chord');

  const summaryEl = el.querySelector('.chord-picker-summary');
  const rootLabel = el.querySelector('.chord-picker-root-label');
  const songGrid = el.querySelector('.chord-picker-song-grid');
  const rootGrid = el.querySelector('.chord-picker-root-grid');
  const diagramName = el.querySelector('.chord-picker-diagram-name');
  const diagramType = el.querySelector('.chord-picker-diagram-type');
  const diagramFrets = el.querySelector('.chord-picker-frets');
  const diagramNotes = el.querySelector('.chord-picker-notes');

  function makeChip(name) {
    const inSong = songSet.has(name);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = ['dock-chip', 'fb-selectable', inSong ? 'is-song' : ''].filter(Boolean).join(' ');
    btn.dataset.chord = name;
    btn.dataset.label = name;
    btn.title = inSong ? `${name} (in current song)` : `Show ${name} on fretboard`;
    btn.textContent = name;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickChord(hub, chordsJson, notesJson, chordsTheory, name);
    });
    return btn;
  }

  function renderChips(container, names) {
    container.replaceChildren();
    for (const name of names) {
      container.appendChild(makeChip(name));
    }
  }

  function updateDiagram(name) {
    if (!name) {
      diagramName.textContent = '—';
      diagramType.textContent = '';
      diagramFrets.textContent = '—';
      diagramNotes.textContent = '';
      return;
    }
    const layer = hub.getLayers().find((l) => l.chordRef === name || l.label === name);
    const dbName = chordsJson[name] ? name : layer?.chordRef;
    if (dbName && chordsJson[dbName]) {
      const data = chordsJson[dbName];
      const { frets, notes } = renderShapePreview(data.variant1, notesJson);
      diagramName.textContent = dbName;
      diagramType.textContent = layer?.via || (data.type ? data.type : '');
      diagramFrets.textContent = frets.join(' ');
      diagramNotes.textContent = notes;
      return;
    }
    if (chordsTheory[name]) {
      const root = getDisplayRoot(hub);
      const data = chordsTheory[name];
      const notes = getTheoryNotes(root, data.intervals).join(' · ');
      diagramName.textContent = data.short ? root + data.short.slice(1) : name;
      diagramType.textContent = name;
      diagramFrets.textContent = data.intervals;
      diagramNotes.textContent = notes;
      return;
    }
    if (layer) {
      diagramName.textContent = layer.chordRef || name;
      diagramType.textContent = layer.via || 'Triad';
      diagramFrets.textContent = '—';
      diagramNotes.textContent = [...layer.notes].join(' · ');
      return;
    }
    diagramName.textContent = '—';
    diagramType.textContent = '';
    diagramFrets.textContent = '—';
    diagramNotes.textContent = '';
  }

  function refreshUI() {
    const root = getDisplayRoot(hub);
    const names = byRoot[root] || [];
    rootLabel.textContent = `At ${root}`;
    renderChips(rootGrid, names);
    renderChips(songGrid, songChords);
    syncChipLayers(hub, el);

    const displayName = resolveDisplayChord(hub, chordsJson, chordsTheory, byRoot, songChords);
    summaryEl.textContent = formatCollapsedSummary(displayName, chordsJson, chordsTheory, notesJson, hub);
    updateDiagram(displayName);
  }

  function updateSong(song) {
    songChords = [...new Set((song?.chords || '').split(/\s+/).filter(Boolean))].sort(musicalSort);
    songSet = new Set(songChords);
    el.querySelector('.chord-picker-song')?.toggleAttribute('hidden', !songChords.length);
    refreshUI();
  }

  const { setExpanded } = wireDockExpand(el, { bodyClass: 'chord-picker-expanded', moduleId: 'chords' });
  wireDockBarToggle(el, setExpanded, '.dock-chip');

  hub.subscribe(refreshUI);
  refreshUI();

  return { el, updateSong };
}

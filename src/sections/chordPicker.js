import {
  CHROMATIC,
  getChordNotes,
  getRoot,
  musicalSort,
  normalizePitch,
  sortNotesByMusicalOrder,
} from '../music.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers } from '../dockModule.js';

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const STRING_KEYS = ['E1', 'A', 'D', 'G', 'B', 'E2'];

function resolveChordRoot(name, data) {
  const fromData = normalizePitch(data?.root);
  if (fromData && CHROMATIC.includes(fromData)) return fromData;
  return normalizePitch(getRoot(name));
}

function groupChordsByRoot(chordsJson) {
  const byRoot = Object.fromEntries(CHROMATIC.map((r) => [r, []]));
  for (const [name, data] of Object.entries(chordsJson)) {
    const root = resolveChordRoot(name, data);
    if (byRoot[root]) byRoot[root].push(name);
  }
  for (const root of CHROMATIC) {
    byRoot[root].sort(musicalSort);
  }
  return byRoot;
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

function pickChord(hub, chordsJson, notesJson, name) {
  const variant = chordsJson[name]?.variant1;
  if (!variant) return;
  hub.toggleSelection({ label: name, notes: getChordNotes(variant, notesJson) });
}

function resolveDisplayChord(hub, chordsJson, byRoot, songChords) {
  const layers = hub.getLayers().filter((l) => l.label !== 'manual');
  const chordLayer = [...layers].reverse().find((l) => chordsJson[l.label]);
  if (chordLayer) return chordLayer.label;

  const root = hub.getRoot();
  const songAtRoot = songChords.find((c) => resolveChordRoot(c, chordsJson[c]) === root);
  if (songAtRoot) return songAtRoot;

  const atRoot = byRoot[root] || [];
  return atRoot[0] || '—';
}

export function renderChordPicker(hub, chordsJson, notesJson, currentSong) {
  const byRoot = groupChordsByRoot(chordsJson);
  const songChords = [...new Set((currentSong?.chords || '').split(/\s+/).filter(Boolean))].sort(musicalSort);
  const songSet = new Set(songChords);

  const el = document.createElement('div');
  el.id = 'chord-picker';
  el.className = 'chord-picker';

  el.innerHTML = `
    <div class="dock-module-bar dock-module-bar--chord">
      <div class="chord-picker-collapsed">
        <span class="chord-picker-name dock-module-title">—</span>
        <span class="chord-picker-meta dock-module-sub"></span>
      </div>
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

  const nameEl = el.querySelector('.chord-picker-name');
  const metaEl = el.querySelector('.chord-picker-meta');
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
      pickChord(hub, chordsJson, notesJson, name);
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
    if (!name || name === '—' || !chordsJson[name]) {
      diagramName.textContent = '—';
      diagramType.textContent = '';
      diagramFrets.textContent = '—';
      diagramNotes.textContent = '';
      metaEl.textContent = '';
      return;
    }
    const data = chordsJson[name];
    const { frets, notes } = renderShapePreview(data.variant1, notesJson);
    diagramName.textContent = name;
    diagramType.textContent = data.type ? data.type : '';
    diagramFrets.textContent = frets.join(' ');
    diagramNotes.textContent = notes;
    const typeBit = data.type ? `${data.type} · ` : '';
    metaEl.textContent = `${typeBit}${frets.join(' ')}`;
  }

  function refreshUI() {
    const root = hub.getRoot();
    const names = byRoot[root] || [];
    rootLabel.textContent = `At ${root}`;
    renderChips(rootGrid, names);
    renderChips(songGrid, songChords);
    syncChipLayers(hub, el);

    const displayName = resolveDisplayChord(hub, chordsJson, byRoot, songChords);
    nameEl.textContent = displayName;
    updateDiagram(displayName);
  }

  const { setExpanded } = wireDockExpand(el, { bodyClass: 'chord-picker-expanded', moduleId: 'chords' });
  wireDockBarToggle(el, setExpanded, '.dock-chip, .chord-picker-collapsed');

  hub.subscribe(refreshUI);
  refreshUI();

  return el;
}

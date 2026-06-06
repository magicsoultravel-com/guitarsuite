import { escapeHtml } from '../utils.js';
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

export function renderChordPicker(hub, chordsJson, notesJson, currentSong) {
  const byRoot = groupChordsByRoot(chordsJson);
  const songChords = [...new Set((currentSong?.chords || '').split(/\s+/).filter(Boolean))].sort(musicalSort);
  const songSet = new Set(songChords);

  const firstSongRoot = songChords.length
    ? resolveChordRoot(songChords[0], chordsJson[songChords[0]])
    : hub.getRoot();

  const el = document.createElement('div');
  el.id = 'chord-picker';
  el.className = 'chord-picker';

  const rootOptions = CHROMATIC.map(
    (n) => `<option value="${n}"${n === firstSongRoot ? ' selected' : ''}>${n}</option>`
  ).join('');

  el.innerHTML = `
    <div class="dock-module-bar">
      <div class="dock-module-controls">
        <select class="dock-select chord-picker-root" title="Root note">${rootOptions}</select>
      </div>
      <div class="dock-module-strip chord-picker-strip" role="listbox" aria-label="Chords for selected root"></div>
      <span class="dock-module-sub chord-picker-preview" aria-live="polite"></span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="dock-section chord-picker-song" ${songChords.length ? '' : 'hidden'}>
        <span class="dock-section-label">In song</span>
        <div class="dock-chip-grid chord-picker-song-grid"></div>
      </div>
      <div class="dock-section">
        <span class="dock-section-label">All at root</span>
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

  const rootSelect = el.querySelector('.chord-picker-root');
  const strip = el.querySelector('.chord-picker-strip');
  const preview = el.querySelector('.chord-picker-preview');
  const songGrid = el.querySelector('.chord-picker-song-grid');
  const rootGrid = el.querySelector('.chord-picker-root-grid');
  const diagramName = el.querySelector('.chord-picker-diagram-name');
  const diagramType = el.querySelector('.chord-picker-diagram-type');
  const diagramFrets = el.querySelector('.chord-picker-frets');
  const diagramNotes = el.querySelector('.chord-picker-notes');

  function makeChip(name, { compact = false } = {}) {
    const inSong = songSet.has(name);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = [
      'dock-chip',
      'fb-selectable',
      compact ? 'is-compact' : '',
      inSong ? 'is-song' : '',
    ].filter(Boolean).join(' ');
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

  function renderChips(container, names, { compact = false } = {}) {
    container.replaceChildren();
    for (const name of names) {
      container.appendChild(makeChip(name, { compact }));
    }
  }

  function updateDiagram(name) {
    if (!name || !chordsJson[name]) {
      diagramName.textContent = '—';
      diagramType.textContent = '';
      diagramFrets.textContent = '—';
      diagramNotes.textContent = '';
      preview.textContent = '';
      return;
    }
    const data = chordsJson[name];
    const { frets, notes } = renderShapePreview(data.variant1, notesJson);
    diagramName.textContent = name;
    diagramType.textContent = data.type ? data.type : '';
    diagramFrets.textContent = frets.join(' ');
    diagramNotes.textContent = notes;
    preview.textContent = frets.join('·');
  }

  function refreshRootUI() {
    const root = rootSelect.value;
    const names = byRoot[root] || [];
    renderChips(strip, names, { compact: true });
    renderChips(rootGrid, names);
    renderChips(songGrid, songChords);
    syncActive();
  }

  function syncActive() {
    syncChipLayers(hub, el);
    const layers = hub.getLayers().filter((l) => l.label !== 'manual');
    const top = layers[layers.length - 1];
    updateDiagram(top && chordsJson[top.label] ? top.label : null);
  }

  const { setExpanded } = wireDockExpand(el, { bodyClass: 'chord-picker-expanded', moduleId: 'chords' });
  wireDockBarToggle(el, setExpanded, '.dock-module-controls, .dock-module-strip, .dock-chip, .dock-select');

  rootSelect.addEventListener('change', refreshRootUI);
  rootSelect.addEventListener('click', (e) => e.stopPropagation());

  hub.subscribe(() => {
    syncActive();
    const layers = hub.getLayers().filter((l) => l.label !== 'manual');
    const chordLayer = [...layers].reverse().find((l) => chordsJson[l.label]);
    if (chordLayer) {
      const root = resolveChordRoot(chordLayer.label, chordsJson[chordLayer.label]);
      if (rootSelect.value !== root) {
        rootSelect.value = root;
        refreshRootUI();
      }
    }
  });

  refreshRootUI();
  return el;
}

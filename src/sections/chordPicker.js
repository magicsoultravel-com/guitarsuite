import { escapeHtml } from '../utils.js';
import {
  CHROMATIC,
  getChordNotes,
  getRoot,
  musicalSort,
  normalizePitch,
  sortNotesByMusicalOrder,
} from '../music.js';

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
  if (hub.getSourceLabel() === name) {
    hub.reset();
    return;
  }
  hub.selectNotes(getChordNotes(variant, notesJson), name);
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
    <div class="chord-picker-bar">
      <span class="chord-picker-label">Chord</span>
      <select class="chord-picker-root" title="Root note">${rootOptions}</select>
      <div class="chord-picker-strip" role="listbox" aria-label="Chords for selected root"></div>
      <span class="chord-picker-preview" aria-live="polite"></span>
      <span class="chord-picker-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="chord-picker-panel" hidden>
      <div class="chord-picker-section chord-picker-song" ${songChords.length ? '' : 'hidden'}>
        <span class="chord-picker-section-label">In song</span>
        <div class="chord-picker-grid chord-picker-song-grid"></div>
      </div>
      <div class="chord-picker-section">
        <span class="chord-picker-section-label">All at root</span>
        <div class="chord-picker-grid chord-picker-root-grid"></div>
      </div>
      <div class="chord-picker-diagram">
        <div class="chord-picker-diagram-head">
          <span class="chord-picker-diagram-name">—</span>
          <span class="chord-picker-diagram-type"></span>
        </div>
        <div class="chord-picker-fretboard">
          <span class="chord-picker-strings">${STRING_LABELS.join(' ')}</span>
          <span class="chord-picker-frets">—</span>
        </div>
        <div class="chord-picker-notes"></div>
      </div>
    </div>
  `;

  const rootSelect = el.querySelector('.chord-picker-root');
  const strip = el.querySelector('.chord-picker-strip');
  const preview = el.querySelector('.chord-picker-preview');
  const panel = el.querySelector('.chord-picker-panel');
  const chevron = el.querySelector('.chord-picker-chevron');
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
      'chord-picker-chip',
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
    diagramType.textContent = data.type ? `(${data.type})` : '';
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
    syncActive(hub.getSourceLabel());
  }

  function syncActive(label) {
    const isChord = Boolean(label && chordsJson[label]);
    el.querySelectorAll('.chord-picker-chip').forEach((chip) => {
      const active = chip.dataset.chord === label;
      chip.classList.toggle('fb-active', active);
      chip.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    updateDiagram(isChord ? label : null);
  }

  function setExpanded(open) {
    panel.hidden = !open;
    el.classList.toggle('is-expanded', open);
    document.body.classList.toggle('chord-picker-expanded', open);
    chevron.textContent = open ? '▼' : '▲';
  }

  rootSelect.addEventListener('change', refreshRootUI);
  rootSelect.addEventListener('click', (e) => e.stopPropagation());

  el.querySelector('.chord-picker-bar').addEventListener('click', (e) => {
    if (e.target.closest('.chord-picker-root, .chord-picker-chip, .chord-picker-strip')) return;
    setExpanded(panel.hidden);
  });

  hub.subscribe(() => {
    const label = hub.getSourceLabel();
    syncActive(label);
    if (label && chordsJson[label]) {
      const root = resolveChordRoot(label, chordsJson[label]);
      if (rootSelect.value !== root) {
        rootSelect.value = root;
        refreshRootUI();
      }
    }
  });

  refreshRootUI();
  return el;
}

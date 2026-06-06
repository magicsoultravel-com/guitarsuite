import { getDisplayRoot, formatRootsDisplay } from '../displayRoot.js';
import {
  getChordNotes,
  getTheoryNotes,
  sortNotesByMusicalOrder,
} from '../music.js';
import { appendChordChips, getChordContext } from '../chordChip.js';
import { listPickerChordsAtRoot } from '../chordPickerList.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers } from '../dockModule.js';

const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];
const STRING_KEYS = ['E1', 'A', 'D', 'G', 'B', 'E2'];

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

function resolveDisplayChord(hub, chordsJson, chordsTheory, atRoot) {
  const last = hub.getLastChordLabel();
  if (last && (chordsJson[last] || chordsTheory?.[last])) return last;

  const layers = hub.getLayers().filter((l) => l.label !== 'manual' && l.family === 'chord');
  const chordLayer = [...layers].reverse().find((l) => l.chordRef || chordsJson[l.label] || chordsTheory?.[l.label] || l.via);
  if (chordLayer) return chordLayer.chordRef || chordLayer.label;

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

export function renderChordPicker(hub, chordsJson, notesJson, chordsTheory = {}, curatedKeys = null) {
  const curated = curatedKeys ?? new Set(Object.keys(chordsJson));
  const ctx = getChordContext(hub, chordsJson, notesJson, chordsTheory);

  const el = document.createElement('div');
  el.id = 'chord-picker';
  el.className = 'chord-picker';

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub chord-picker-summary"></span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
      <div class="dock-section">
        <span class="dock-section-label chord-picker-root-label">At root</span>
        <div class="dock-chip-grid chord-picker-root-grid"></div>
      </div>
      <div class="dock-section chord-picker-extra-section" hidden>
        <span class="dock-section-label">Also in database</span>
        <div class="dock-chip-grid chord-picker-extra-grid"></div>
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

  ensureDockChrome(el, 'chords', 'chords');

  const summaryEl = el.querySelector('.chord-picker-summary');
  const rootLabel = el.querySelector('.chord-picker-root-label');
  const rootGrid = el.querySelector('.chord-picker-root-grid');
  const extraSection = el.querySelector('.chord-picker-extra-section');
  const extraGrid = el.querySelector('.chord-picker-extra-grid');
  const diagramName = el.querySelector('.chord-picker-diagram-name');
  const diagramType = el.querySelector('.chord-picker-diagram-type');
  const diagramFrets = el.querySelector('.chord-picker-frets');
  const diagramNotes = el.querySelector('.chord-picker-notes');

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
    const { theory, extras } = listPickerChordsAtRoot(root, chordsJson, curated);
    const atRoot = [...theory, ...extras];

    rootLabel.textContent = hub.getRoots().length > 1
      ? `At ${formatRootsDisplay(hub)} (primary ${hub.getRoot()})`
      : `At ${root}`;
    appendChordChips(rootGrid, theory, hub, ctx);
    extraSection.hidden = !extras.length;
    appendChordChips(extraGrid, extras, hub, ctx);
    syncChipLayers(hub, el);

    const displayName = resolveDisplayChord(hub, chordsJson, chordsTheory, atRoot);
    summaryEl.textContent = formatCollapsedSummary(displayName, chordsJson, chordsTheory, notesJson, hub);
    updateDiagram(displayName);
  }

  const { setExpanded } = wireDockExpand(el, { bodyClass: 'chord-picker-expanded', moduleId: 'chords' });
  wireDockBarToggle(el, setExpanded);

  hub.subscribe(refreshUI);
  refreshUI();

  return { el };
}

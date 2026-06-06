import { CHROMATIC, normalizePitch } from './music.js';

export function createFretboardHub(initialRoot = 'C') {
  let root = normalizePitch(initialRoot) || 'C';
  let activeNotes = new Set([root]);
  let sourceLabel = 'root';
  let selection = { kind: 'root', label: 'root', resolve: null };
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function normalizedSet(notes) {
    return new Set(notes.map(normalizePitch).filter(Boolean));
  }

  function applySelection() {
    if (selection.kind === 'manual') return;
    if (selection.resolve) {
      activeNotes = normalizedSet(selection.resolve(root));
      sourceLabel = selection.label;
    } else {
      activeNotes = new Set([root]);
      sourceLabel = 'root';
    }
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    getRoot() {
      return root;
    },

    getActiveNotes() {
      return new Set(activeNotes);
    },

    getSourceLabel() {
      return sourceLabel;
    },

    setRoot(newRoot) {
      root = normalizePitch(newRoot) || 'C';
      applySelection();
      notify();
    },

    selectNotes(notes, label) {
      selection = { kind: 'fixed', label: label || '', resolve: () => notes };
      applySelection();
      notify();
    },

    selectDerived(label, resolveFn) {
      selection = { kind: 'derived', label, resolve: resolveFn };
      applySelection();
      notify();
    },

    toggleNote(note) {
      const pitch = normalizePitch(note);
      if (!pitch) return;
      selection = { kind: 'manual', label: 'manual', resolve: null };
      if (activeNotes.has(pitch)) activeNotes.delete(pitch);
      else activeNotes.add(pitch);
      sourceLabel = 'manual';
      notify();
    },

    reset() {
      selection = { kind: 'root', label: 'root', resolve: null };
      applySelection();
      notify();
    },
  };
}

export function renderRootToolbar(hub, { controlsEl = null, summaryEl = null } = {}) {
  const options = CHROMATIC.map(
    (n) => `<option value="${n}"${n === hub.getRoot() ? ' selected' : ''}>${n}</option>`
  ).join('');

  const rootRow = document.createElement('div');
  rootRow.className = 'root-row';
  rootRow.innerHTML = `
    <select id="global-root-select" class="root-select" title="Root note">${options}</select>
    <button type="button" id="fretboard-reset" class="icon-btn reset-btn" title="Reset fretboard" aria-label="Reset fretboard">↺</button>
  `;

  const summary = summaryEl || document.createElement('span');
  summary.id = 'fretboard-source';
  summary.classList.add('fretboard-source');

  let bar;
  if (controlsEl) {
    controlsEl.appendChild(rootRow);
    bar = controlsEl;
  } else {
    bar = document.createElement('div');
    bar.className = 'root-toolbar-panel';
    bar.id = 'root-toolbar';
    bar.appendChild(rootRow);
    bar.appendChild(summary);
  }

  rootRow.querySelector('#global-root-select').addEventListener('change', (e) => {
    hub.setRoot(e.target.value);
    const url = new URL(location.href);
    url.searchParams.set('root', e.target.value);
    history.replaceState(null, '', url);
  });

  rootRow.querySelector('#fretboard-reset').addEventListener('click', () => hub.reset());

  hub.subscribe(() => {
    const select = rootRow.querySelector('#global-root-select');
    if (select.value !== hub.getRoot()) select.value = hub.getRoot();
    const label = hub.getSourceLabel();
    const notes = [...hub.getActiveNotes()].join(', ');
    summary.textContent = label && label !== 'root' ? `${label}: ${notes}` : notes;
  });

  return bar;
}

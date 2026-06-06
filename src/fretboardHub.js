import { CHROMATIC, normalizePitch } from './music.js';

const MAX_LAYERS = 3;

function normalizedSet(notes) {
  return new Set(notes.map(normalizePitch).filter(Boolean));
}

export function createFretboardHub(initialRoot = 'C') {
  let root = normalizePitch(initialRoot) || 'C';
  /** @type {Array<{ label: string, kind: 'fixed'|'derived'|'manual', notes?: string[], resolve?: (root: string) => string[] }|null>} */
  let layers = [null, null, null];
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function resolveLayer(layer) {
    if (!layer) return new Set();
    if (layer.kind === 'derived' && layer.resolve) return normalizedSet(layer.resolve(root));
    if (layer.kind === 'manual' && layer.notes) return normalizedSet(layer.notes);
    if (layer.notes) return normalizedSet(layer.notes);
    return new Set();
  }

  function getManualLayerIndex() {
    return layers.findIndex((l) => l?.kind === 'manual');
  }

  function ensureManualLayer() {
    let idx = getManualLayerIndex();
    if (idx >= 0) return idx;
    idx = layers.findIndex((l) => !l);
    if (idx < 0) {
      layers.shift();
      layers.push(null);
      idx = 2;
    }
    layers[idx] = { label: 'manual', kind: 'manual', notes: [] };
    return idx;
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    getRoot() {
      return root;
    },

    getLayers() {
      return layers
        .map((layer, i) => (layer ? { slot: i + 1, label: layer.label, notes: resolveLayer(layer) } : null))
        .filter(Boolean);
    },

    getLayerSlot(label) {
      const idx = layers.findIndex((l) => l?.label === label);
      return idx >= 0 ? idx + 1 : 0;
    },

    /** @deprecated use getLayers */
    getActiveNotes() {
      const merged = new Set();
      for (const layer of layers) {
        for (const n of resolveLayer(layer)) merged.add(n);
      }
      return merged;
    },

    /** @deprecated use getLayers */
    getSourceLabel() {
      const active = layers.filter(Boolean);
      if (!active.length) return '';
      if (active.length === 1) return active[0].label;
      return active.map((l) => l.label).join(' · ');
    },

    setRoot(newRoot) {
      root = normalizePitch(newRoot) || 'C';
      notify();
    },

    toggleSelection({ label, notes, resolve }) {
      const existingIdx = layers.findIndex((l) => l?.label === label);
      if (existingIdx >= 0) {
        layers[existingIdx] = null;
      } else {
      let idx = layers.findIndex((l) => !l);
      if (idx < 0) {
        layers.shift();
        layers.push(null);
        idx = 2;
      }
        layers[idx] = {
          label,
          kind: resolve ? 'derived' : 'fixed',
          notes: notes || [],
          resolve,
        };
      }
      notify();
    },

    selectNotes(notes, label) {
      const existingIdx = layers.findIndex((l) => l?.label === label);
      if (existingIdx >= 0) {
        layers[existingIdx] = null;
        notify();
        return;
      }
      let idx = layers.findIndex((l) => !l);
      if (idx < 0) {
        layers.shift();
        layers.push(null);
        idx = 2;
      }
      layers[idx] = { label: label || '', kind: 'fixed', notes: [...notes] };
      notify();
    },

    selectDerived(label, resolveFn) {
      this.toggleSelection({ label, resolve: resolveFn });
    },

    toggleNote(note) {
      const pitch = normalizePitch(note);
      if (!pitch) return;
      const idx = ensureManualLayer();
      const manual = layers[idx];
      const notes = new Set(manual.notes.map(normalizePitch).filter(Boolean));
      if (notes.has(pitch)) notes.delete(pitch);
      else notes.add(pitch);
      if (!notes.size) layers[idx] = null;
      else manual.notes = [...notes];
      notify();
    },

    reset() {
      layers = [null, null, null];
      notify();
    },
  };
}

export function formatLayerSummary(hub) {
  const labels = hub.getLayers().map((l) => l.label).filter((l) => l !== 'manual');
  if (labels.length) return labels.join(' · ');
  const manual = hub.getLayers().find((l) => l.label === 'manual');
  if (manual) return [...manual.notes].join(', ');
  return `Root ${hub.getRoot()}`;
}

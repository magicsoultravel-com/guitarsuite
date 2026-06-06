import { CHROMATIC, normalizePitch } from './music.js';

const MAX_LAYERS = 3;

function normalizedSet(notes) {
  return new Set(notes.map(normalizePitch).filter(Boolean));
}

export function createFretboardHub(initialRoot = 'C') {
  let root = normalizePitch(initialRoot) || 'C';
  /** @type {Array<object|null>} */
  let layers = [null, null, null];
  /** @type {string|null} */
  let lastChordLabel = null;
  /** @type {object|null} */
  let chordContext = null;
  const listeners = new Set();

  function findLastActiveChordLabel() {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      const layer = layers[i];
      if (layer?.family === 'chord') return layer.chordRef || layer.label;
    }
    return null;
  }

  function notify() {
    listeners.forEach((fn) => fn());
  }

  function resolveLayerEntry(layer) {
    if (!layer) return null;
    if (layer.resolveSelection) {
      const resolved = layer.resolveSelection(root);
      if (!resolved) return null;
      return {
        label: resolved.label,
        notes: normalizedSet(resolved.notes),
        chordRef: resolved.chordRef,
        shape: resolved.variant,
        via: resolved.via,
        meta: layer.meta,
        family: layer.family,
      };
    }
    if (layer.kind === 'derived' && layer.resolve) {
      return {
        label: layer.label,
        notes: normalizedSet(layer.resolve(root)),
        chordRef: layer.chordRef,
        shape: layer.shape,
        via: layer.via,
        meta: layer.meta,
        family: layer.family,
      };
    }
    return {
      label: layer.label,
      notes: normalizedSet(layer.notes || []),
      chordRef: layer.chordRef,
      shape: layer.shape,
      via: layer.via,
      meta: layer.meta,
      family: layer.family,
    };
  }

  function allocateSlot() {
    let idx = layers.findIndex((l) => !l);
    if (idx < 0) {
      layers.shift();
      layers.push(null);
      idx = 2;
    }
    return idx;
  }

  function ensureManualLayer() {
    let idx = layers.findIndex((l) => l?.kind === 'manual');
    if (idx >= 0) return idx;
    idx = allocateSlot();
    layers[idx] = { label: 'manual', kind: 'manual', family: 'manual', notes: [] };
    return idx;
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    setChordContext(ctx) {
      chordContext = ctx;
    },

    getChordContext() {
      return chordContext;
    },

    getRoot() {
      return root;
    },

    getLayers() {
      return layers
        .map((layer, i) => {
          const entry = resolveLayerEntry(layer);
          if (!entry) return null;
          return { slot: i + 1, ...entry };
        })
        .filter(Boolean);
    },

    getLayerSlot(label) {
      const resolved = this.getLayers();
      const match = resolved.find((l) => l.chordRef === label || l.label === label);
      return match?.slot || 0;
    },

    getLastChordLabel() {
      return lastChordLabel;
    },

    findLayerIndex(matcher) {
      return layers.findIndex(matcher);
    },

    removeLayerAt(idx) {
      if (idx < 0 || !layers[idx]) return;
      const removed = layers[idx];
      layers[idx] = null;
      const removedKey = removed.chordRef || removed.label;
      if (lastChordLabel === removedKey || lastChordLabel === removed.label) {
        lastChordLabel = findLastActiveChordLabel();
      }
      notify();
    },

    addFixedChordLayer({ label, notes, chordRef, shape, via }) {
      const idx = allocateSlot();
      layers[idx] = {
        label,
        kind: 'fixed',
        family: 'chord',
        notes: [...notes],
        chordRef: chordRef || null,
        shape: shape || null,
        via: via || null,
      };
      lastChordLabel = chordRef || label;
      notify();
    },

    addDerivedChordLayer({ meta, resolveSelection }) {
      const idx = allocateSlot();
      const resolved = resolveSelection(root);
      layers[idx] = {
        label: resolved?.label || meta?.theoryType || '',
        kind: 'derived',
        family: 'chord',
        meta,
        resolveSelection,
      };
      if (resolved?.chordRef) lastChordLabel = resolved.chordRef;
      else if (resolved?.label) lastChordLabel = resolved.label;
      notify();
    },

    setRoot(newRoot) {
      root = normalizePitch(newRoot) || 'C';
      notify();
    },

    toggleSelection({ label, notes, resolve, family, chordRef, shape, via, meta, resolveSelection }) {
      const existingIdx = layers.findIndex(
        (l) => l?.label === label || l?.chordRef === label || (meta?.theoryType && l?.meta?.theoryType === meta.theoryType),
      );
      if (existingIdx >= 0) {
        this.removeLayerAt(existingIdx);
        return;
      }

      const idx = allocateSlot();
      layers[idx] = {
        label,
        kind: resolveSelection || resolve ? 'derived' : 'fixed',
        family,
        notes: notes || [],
        resolve,
        resolveSelection,
        chordRef: chordRef || null,
        shape: shape || null,
        via: via || null,
        meta: meta || null,
      };
      if (family === 'chord') lastChordLabel = chordRef || label;
      notify();
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
      lastChordLabel = null;
      notify();
    },
  };
}

export function formatLayerSummary(hub) {
  const labels = hub.getLayers().map((l) => l.chordRef || l.label).filter((l) => l !== 'manual');
  if (labels.length) return labels.join(' · ');
  const manual = hub.getLayers().find((l) => l.label === 'manual');
  if (manual) return [...manual.notes].join(', ');
  return `Root ${hub.getRoot()}`;
}

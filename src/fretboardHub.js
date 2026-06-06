import { CHROMATIC, normalizePitch } from './music.js';

const MAX_LAYERS = 3;
const MAX_ROOTS = 3;

function normalizedSet(notes) {
  return new Set(notes.map(normalizePitch).filter(Boolean));
}

function rootIndex(note) {
  return CHROMATIC.indexOf(normalizePitch(note));
}

function isConsecutiveSpan(indices) {
  if (indices.length <= 1) return true;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] - sorted[i - 1] !== 1) return false;
  }
  return true;
}

function indicesToRoots(indices) {
  return [...indices].sort((a, b) => a - b).map((i) => CHROMATIC[i]);
}

export function createFretboardHub(initialRoot = '') {
  const initial = normalizePitch(initialRoot);
  /** @type {string[]} */
  let roots = initial ? [initial] : [];
  /** @type {Array<object|null>} */
  let layers = [null, null, null];
  /** @type {string|null} */
  let lastChordLabel = null;
  /** @type {object|null} */
  let chordContext = null;
  const listeners = new Set();

  function primaryRoot() {
    return roots[roots.length - 1] || '';
  }

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
    const root = primaryRoot();
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

    /** Primary (latest) root — used for transposition. */
    getRoot() {
      return primaryRoot();
    },

    getRoots() {
      return [...roots];
    },

    /** Replace with a single root (URL load, legacy API). */
    setRoot(newRoot) {
      const r = normalizePitch(newRoot);
      roots = r ? [r] : [];
      notify();
    },

    /** Toggle/extend consecutive root span (max 3). */
    toggleRoot(note) {
      const r = normalizePitch(note);
      const idx = rootIndex(r);
      if (idx < 0) return;

      if (!roots.length) {
        roots = [r];
        notify();
        return;
      }

      const currentIdx = roots.map(rootIndex);
      const pos = currentIdx.indexOf(idx);

      if (pos >= 0) {
        if (roots.length === 1) {
          roots = [];
        } else if (pos === 0 || pos === roots.length - 1) {
          roots.splice(pos, 1);
        }
        notify();
        return;
      }

      const next = [...new Set([...currentIdx, idx])];
      if (next.length > MAX_ROOTS || !isConsecutiveSpan(next)) {
        roots = [r];
      } else {
        roots = indicesToRoots(next);
      }
      notify();
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
      const resolved = resolveSelection(primaryRoot());
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
  const roots = hub.getRoots();
  if (roots.length) return `Root ${roots.join(' · ')}`;
  return 'Root —';
}

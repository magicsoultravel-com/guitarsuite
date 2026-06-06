import {
  findChordAliases,
  parseChordSymbol,
  symbolFromParsed,
  theoryNotesForSymbol,
} from './chordSymbols.js';
import { buildVoicing } from './chordVoicings.js';
import { getChordNotes, getTheoryNotes, normalizePitch } from './music.js';
import { getDisplayRoot } from './displayRoot.js';

/** @typedef {{ label: string, chordRef: string|null, variant: object|null, notes: string[], source: 'database'|'theory'|'triad', via?: string }} ResolvedChord */

const STRING_KEYS = [
  ['E1', 'E'],
  ['A', 'A'],
  ['D', 'D'],
  ['G', 'G'],
  ['B', 'B'],
  ['E2', 'e'],
];

export function getShapeFrets(variant) {
  if (!variant) return [];
  return STRING_KEYS
    .filter(([key]) => {
      const v = variant[key];
      return v !== 'x' && v !== '' && v != null;
    })
    .map(([key, string]) => ({ string, fret: parseInt(variant[key], 10) || 0 }));
}

export function getVoicedChord(variant, notesJson) {
  if (!variant || !notesJson) return [];
  const voiced = [];
  for (const [key, string] of STRING_KEYS) {
    const fretVal = variant[key];
    if (fretVal === 'x' || fretVal === '' || fretVal == null) continue;
    const fret = parseInt(fretVal, 10) || 0;
    const pitch = normalizePitch(notesJson[string]?.[String(fret)] ?? '');
    if (!pitch) continue;
    voiced.push({ string, fret, pitch });
  }
  return voiced;
}

export function symbolFromTheory(theoryType, root, chordsTheory) {
  if (!root) return null;
  const data = chordsTheory?.[theoryType];
  if (!data?.short) return null;
  return root + data.short.slice(1);
}

export function resolveChord(opts) {
  const { root, chordsJson, notesJson, chordsTheory, chordName, theoryType, symbol, fallbackNotes } = opts;

  if (chordName) {
    for (const candidate of findChordAliases(chordName)) {
      if (chordsJson?.[candidate]?.variant1) {
        const variant = chordsJson[candidate].variant1;
        return {
          label: candidate,
          chordRef: candidate,
          variant,
          notes: getChordNotes(variant, notesJson),
          source: 'database',
        };
      }
    }
    const parsed = parseChordSymbol(chordName);
    if (parsed) {
      const generated = buildVoicing(parsed.root, parsed.suffix);
      if (generated) {
        return {
          label: chordName,
          chordRef: symbolFromParsed(parsed, chordsTheory) || null,
          variant: generated,
          notes: getChordNotes(generated, notesJson),
          source: 'database',
          via: parsed.theoryType || undefined,
        };
      }
      if (parsed.theoryType && chordsTheory?.[parsed.theoryType]) {
        const notes = theoryNotesForSymbol(chordName, chordsTheory)
          ?? getTheoryNotes(parsed.root, chordsTheory[parsed.theoryType].intervals);
        return {
          label: symbolFromParsed(parsed, chordsTheory) || chordName,
          chordRef: null,
          variant: null,
          notes,
          source: 'theory',
          via: parsed.theoryType,
        };
      }
    }
  }

  if (theoryType && chordsTheory?.[theoryType]) {
    if (!root) return null;
    const sym = symbolFromTheory(theoryType, root, chordsTheory);
    if (sym && chordsJson?.[sym]?.variant1) {
      const variant = chordsJson[sym].variant1;
      return {
        label: sym,
        chordRef: sym,
        variant,
        notes: getChordNotes(variant, notesJson),
        source: 'database',
        via: theoryType,
      };
    }
    const notes = getTheoryNotes(root, chordsTheory[theoryType].intervals);
    const suffix = chordsTheory[theoryType].short?.slice(1) ?? '';
    const generated = buildVoicing(root, suffix);
    if (generated) {
      return {
        label: sym || theoryType,
        chordRef: sym || null,
        variant: generated,
        notes: getChordNotes(generated, notesJson),
        source: 'database',
        via: theoryType,
      };
    }
    return {
      label: sym || theoryType,
      chordRef: null,
      variant: null,
      notes,
      source: 'theory',
      via: theoryType,
    };
  }

  if (symbol) {
    if (chordsJson?.[symbol]?.variant1) {
      const variant = chordsJson[symbol].variant1;
      return {
        label: symbol,
        chordRef: symbol,
        variant,
        notes: getChordNotes(variant, notesJson),
        source: 'database',
      };
    }
    if (fallbackNotes?.length) {
      return {
        label: symbol,
        chordRef: null,
        variant: null,
        notes: fallbackNotes.map(normalizePitch).filter(Boolean),
        source: 'triad',
      };
    }
  }

  return null;
}

function layerMatches(layer, resolved, theoryType) {
  if (!layer) return false;
  if (theoryType && layer.meta?.theoryType === theoryType) return true;
  return layer.label === resolved.label || layer.chordRef === resolved.chordRef;
}

export function toggleResolvedChord(hub, resolved, ctx, playFns) {
  if (!resolved) return;

  const { theoryType = null } = ctx;
  const existingIdx = hub.findLayerIndex((layer) => layerMatches(layer, resolved, theoryType));

  if (existingIdx >= 0) {
    hub.removeLayerAt(existingIdx);
    return;
  }

  if (theoryType) {
    hub.addDerivedChordLayer({
      meta: { theoryType },
      resolveSelection: (root) =>
        resolveChord({
          theoryType,
          root,
          chordsJson: ctx.chordsJson,
          notesJson: ctx.notesJson,
          chordsTheory: ctx.chordsTheory,
        }),
    });
  } else {
    hub.addFixedChordLayer({
      label: resolved.label,
      chordRef: resolved.chordRef,
      shape: resolved.variant,
      notes: resolved.notes,
      via: resolved.via,
    });
  }

  if (resolved.variant) playFns.playVoiced(resolved.variant, ctx.notesJson);
  else playFns.playNotes(resolved.notes);
}

export function makeChordContext(chordsJson, notesJson, chordsTheory) {
  return { chordsJson, notesJson, chordsTheory };
}

export function pickChord(hub, ctx, playFns, opts) {
  const root = hub.getRoot() || getDisplayRoot(hub);
  const resolved = resolveChord({ root, ...ctx, ...opts });
  toggleResolvedChord(hub, resolved, { ...ctx, theoryType: opts.theoryType ?? null }, playFns);
  return resolved;
}

import { getTheoryNotes, normalizePitch } from './music.js';

/** Map chord suffix → chords-theory.json key (longest suffixes first for parsing). */
const SUFFIX_TO_THEORY = [
  ['madd9', 'Minor Add 9th'],
  ['maj7', 'Major 7th'],
  ['m7b5', 'Half-Diminished 7th'],
  ['dim7', 'Diminished 7th'],
  ['sus2', 'Suspended 2nd'],
  ['sus4', 'Suspended 4th'],
  ['add9', 'Add 9th'],
  ['m7', 'Minor 7th'],
  ['m9', 'Minor 9th'],
  ['m6', 'Minor 6th'],
  ['dim', 'Diminished'],
  ['aug', 'Augmented'],
  ['m', 'Minor'],
  ['7', 'Dominant 7th'],
  ['6', '6th'],
  ['9', '9th'],
  ['', 'Major'],
];

export function parseChordSymbol(name) {
  if (!name) return null;
  const clean = name.split('/')[0];
  for (const [suffix, theoryType] of SUFFIX_TO_THEORY) {
    const re = suffix === ''
      ? /^([A-G][#b]?)$/
      : new RegExp(`^([A-G][#b]?)${suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const m = clean.match(re);
    if (m) return { root: normalizePitch(m[1]), suffix, theoryType };
  }
  return null;
}

export function theoryNotesForSymbol(name, chordsTheory) {
  const parsed = parseChordSymbol(name);
  if (!parsed?.theoryType || !chordsTheory?.[parsed.theoryType]) return null;
  return getTheoryNotes(parsed.root, chordsTheory[parsed.theoryType].intervals);
}

export function findChordAliases(name) {
  const parsed = parseChordSymbol(name);
  if (!parsed) return [name];
  const { root, suffix } = parsed;
  const aliases = new Set([name, root + suffix]);
  if (suffix === 'maj7') aliases.add(`${root}Maj7`);
  return [...aliases];
}

export function symbolFromParsed(parsed, chordsTheory) {
  if (!parsed?.theoryType || !chordsTheory?.[parsed.theoryType]?.short) return null;
  return parsed.root + chordsTheory[parsed.theoryType].short.slice(1);
}

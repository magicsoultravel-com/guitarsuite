import { CHROMATIC, pitchToIndex } from './music.js';

const KEYS = ['E1', 'A', 'D', 'G', 'B', 'E2'];
const A_KEYS = ['A', 'D', 'G', 'B'];

const THEORY_SUFFIX = {
  Major: '',
  Minor: 'm',
  Diminished: 'dim',
  Augmented: 'aug',
  'Major 7th': 'maj7',
  'Minor 7th': 'm7',
  'Dominant 7th': '7',
  'Diminished 7th': 'dim7',
  'Half-Diminished 7th': 'm7b5',
  'Suspended 2nd': 'sus2',
  'Suspended 4th': 'sus4',
  'Add 9th': 'add9',
  'Minor Add 9th': 'madd9',
  '6th': '6',
  'Minor 6th': 'm6',
  '9th': '9',
  'Minor 9th': 'm9',
};

const TYPE_LABEL = {
  '': 'major',
  m: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  maj7: 'major7',
  m7: 'minor7',
  '7': '7',
  dim7: 'diminished7',
  m7b5: 'half-diminished7',
  sus2: 'sus2',
  sus4: 'sus4',
  add9: 'add9',
  madd9: 'minor add9',
  '6': '6',
  m6: 'minor6',
  '9': '9',
  m9: 'minor9',
};

const E_SHAPE = {
  '': [0, 2, 2, 1, 0, 0],
  m: [0, 2, 2, 0, 0, 0],
  '7': [0, 2, 0, 2, 0, 0],
  maj7: [0, 2, 1, 1, 0, 0],
  m7: [0, 2, 0, 0, 0, 0],
  dim: [0, 1, 2, 0, 2, 0],
  dim7: [0, 1, 2, 1, 2, 1],
  m7b5: [0, 1, 2, 0, 2, 0],
  aug: [0, 3, 2, 1, 1, 0],
  sus2: [0, 2, 2, 2, 0, 0],
  sus4: [0, 2, 2, 2, 0, 0],
  '6': [0, 2, 2, 1, 2, 0],
  m6: [0, 2, 0, 1, 0, 0],
  add9: [0, 2, 2, 1, 0, 2],
  madd9: [0, 2, 0, 0, 0, 2],
  '9': [0, 2, 0, 2, 0, 2],
  m9: [0, 2, 0, 0, 0, 2],
};

const A_SHAPE = {
  '': [0, 2, 2, 2, 0],
  m: [0, 2, 2, 0, 0],
  '7': [0, 2, 0, 2, 0],
  maj7: [0, 2, 1, 1, 0],
  m7: [0, 2, 0, 0, 0],
  dim: [0, 1, 2, 0, null],
  m7b5: [0, 1, 2, 0, null],
};

function eShape(rootNote, suffix) {
  const offsets = E_SHAPE[suffix];
  if (!offsets) return null;
  const base = (pitchToIndex(rootNote) - 4 + 12) % 12;
  const shape = {};
  KEYS.forEach((k, i) => {
    const f = base + offsets[i];
    shape[k] = f > 14 ? 'x' : String(f);
  });
  return shape;
}

function aShape(rootNote, suffix) {
  const offsets = A_SHAPE[suffix];
  if (!offsets) return eShape(rootNote, suffix);
  const base = (pitchToIndex(rootNote) - 9 + 12) % 12;
  const shape = { E1: 'x', E2: 'x' };
  A_KEYS.forEach((k, i) => {
    const off = offsets[i];
    if (off == null) shape[k] = 'x';
    else {
      const f = base + off;
      shape[k] = f > 14 ? 'x' : String(f);
    }
  });
  return shape;
}

export function buildVoicing(rootNote, suffix) {
  let shape = eShape(rootNote, suffix);
  const sounding = (s) => Object.values(s).filter((v) => v !== 'x').length;
  if (!shape || sounding(shape) < 3) shape = aShape(rootNote, suffix);
  if (!shape || sounding(shape) < 3) return null;
  return shape;
}

/** Fill gaps for every theory type × chromatic root; keep hand-curated shapes. */
export function enrichChordsJson(chordsJson) {
  const merged = { ...chordsJson };

  if (merged.Cmaj7) merged.Cmaj7 = { ...merged.Cmaj7, root: 'C' };
  if (merged.A7) merged.A7 = { ...merged.A7, type: '7' };

  for (const rootNote of CHROMATIC) {
    for (const suffix of Object.values(THEORY_SUFFIX)) {
      const name = rootNote + suffix;
      if (merged[name]?.variant1) continue;
      const variant1 = buildVoicing(rootNote, suffix);
      if (!variant1) continue;
      merged[name] = {
        root: rootNote,
        type: TYPE_LABEL[suffix] || suffix || 'major',
        variant1,
      };
    }
  }

  return merged;
}

export { THEORY_SUFFIX, TYPE_LABEL };

/**
 * Merge standard barre/open voicings for every theory suffix × chromatic root.
 * Run: node scripts/generate-chords.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const pitch = (n) => CHROMATIC.indexOf(n);

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

/** E-shape barre offsets from root fret on E1 */
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

const KEYS = ['E1', 'A', 'D', 'G', 'B', 'E2'];

function eShape(rootNote, suffix) {
  const offsets = E_SHAPE[suffix];
  if (!offsets) return null;
  const rootIdx = pitch(rootNote);
  const base = (rootIdx - 4 + 12) % 12;
  if (base > 11) return null;
  const shape = {};
  KEYS.forEach((k, i) => {
    const f = base + offsets[i];
    shape[k] = f > 14 ? 'x' : String(f);
  });
  return shape;
}

/** A-shape barre when E-shape fret too high */
const A_SHAPE = {
  '': [0, 2, 2, 2, 0, 'x'],
  m: [0, 2, 2, 0, 0, 'x'],
  '7': [0, 2, 0, 2, 0, 'x'],
  maj7: [0, 2, 1, 1, 0, 'x'],
  m7: [0, 2, 0, 0, 0, 'x'],
  dim: [0, 1, 2, 0, 'x', 'x'],
  m7b5: [0, 1, 2, 0, 'x', 'x'],
};

function aShape(rootNote, suffix) {
  const offsets = A_SHAPE[suffix];
  if (!offsets) return eShape(rootNote, suffix);
  const rootIdx = pitch(rootNote);
  const base = (rootIdx - 9 + 12) % 12;
  const shape = { E1: 'x', E2: 'x' };
  const aKeys = ['A', 'D', 'G', 'B'];
  aKeys.forEach((k, i) => {
    const off = offsets[i];
    if (off === 'x') shape[k] = 'x';
    else {
      const f = base + off;
      shape[k] = f > 14 ? 'x' : String(f);
    }
  });
  return shape;
}

function buildShape(rootNote, suffix) {
  let s = eShape(rootNote, suffix);
  if (!s || Object.values(s).filter((v) => v !== 'x').length < 3) s = aShape(rootNote, suffix);
  return s;
}

function symbol(rootNote, suffix) {
  return rootNote + suffix;
}

const existing = JSON.parse(readFileSync(join(rootDir, 'assets/chords.json'), 'utf8'));
let added = 0;

for (const rootNote of CHROMATIC) {
  for (const [, suffix] of Object.entries(THEORY_SUFFIX)) {
    const name = symbol(rootNote, suffix);
    if (existing[name]?.variant1) continue;
    const variant1 = buildShape(rootNote, suffix);
    if (!variant1) continue;
    const sounding = Object.values(variant1).filter((v) => v !== 'x').length;
    if (sounding < 3) continue;
    existing[name] = {
      root: rootNote,
      type: TYPE_LABEL[suffix] || suffix || 'major',
      variant1,
    };
    added += 1;
  }
}

// Fix known bad entries
if (existing.Cmaj7) existing.Cmaj7.root = 'C';
if (existing.A7) existing.A7.type = '7';

writeFileSync(join(rootDir, 'assets/chords.json'), `${JSON.stringify(existing, null, 4)}\n`);
console.log(`Added ${added} chords. Total: ${Object.keys(existing).length}`);

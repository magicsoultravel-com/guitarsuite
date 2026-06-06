import { escapeHtml } from './utils.js';

export const MUSICAL_ORDER = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb',
  'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

export function normalizePitch(note) {
  if (!note || note === 'N/A') return '';
  const trimmed = String(note).trim();
  if (FLAT_TO_SHARP[trimmed]) return FLAT_TO_SHARP[trimmed];
  const letter = trimmed.charAt(0).toUpperCase();
  const acc = trimmed.slice(1);
  if (acc === 'b' && FLAT_TO_SHARP[letter + 'b']) return FLAT_TO_SHARP[letter + 'b'];
  return letter + acc;
}

export function pitchToIndex(pitch) {
  return CHROMATIC.indexOf(normalizePitch(pitch));
}

export function getRoot(chord) {
  const match = chord.match(/^[A-G](#|b)?/);
  return match ? match[0] : chord;
}

export function musicalSort(a, b) {
  const indexA = MUSICAL_ORDER.indexOf(getRoot(a));
  const indexB = MUSICAL_ORDER.indexOf(getRoot(b));
  return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
}

export function sortNotesByMusicalOrder(notes) {
  return [...notes].sort((a, b) => {
    const indexA = MUSICAL_ORDER.indexOf(a);
    const indexB = MUSICAL_ORDER.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });
}

export function getChordNotes(chordShape, notesJson) {
  const frets = {
    E1: chordShape.E1 ?? 'x',
    A: chordShape.A ?? 'x',
    D: chordShape.D ?? 'x',
    G: chordShape.G ?? 'x',
    B: chordShape.B ?? 'x',
    E2: chordShape.E2 ?? 'x',
  };

  const notes = [];
  for (const [stringKey, fretValue] of Object.entries(frets)) {
    const stringBase = stringKey.replace(/[12]/, '').toUpperCase();
    if (fretValue !== 'x' && fretValue !== '') {
      const note = notesJson[stringBase]?.[fretValue];
      if (note) notes.push(normalizePitch(note));
    }
  }
  return [...new Set(notes)];
}

export function getNoteName(rootNumber, interval) {
  return CHROMATIC[(rootNumber + interval) % 12];
}

export function getTheoryNotes(root, intervalsStr) {
  const rootIdx = pitchToIndex(root);
  if (rootIdx < 0) return [];
  return intervalsStr.split(/\s+/).map(Number).map((i) => CHROMATIC[(rootIdx + i) % 12]);
}

export function getScaleSemitones(steps) {
  if (!steps?.length) return [0];
  let cumulative = 0;
  const semitones = [0];
  for (const step of steps) {
    cumulative += step;
    semitones.push(cumulative);
  }
  return semitones;
}

export function getScaleNotes(root, steps) {
  const rootIdx = pitchToIndex(root);
  if (rootIdx < 0 || !steps?.length) return [];
  return getScaleSemitones(steps).map((s) => CHROMATIC[(rootIdx + s) % 12]);
}

/** Ascending scale degrees with octaves that rise when the pitch wraps (capped for guitar range). */
export function getScaleNotesWithOctaves(root, steps, startOctave = 3, maxOctave = 4) {
  const pitches = getScaleNotes(root, steps);
  if (!pitches.length) return [];
  let octave = startOctave;
  let lastIdx = pitchToIndex(pitches[0]);
  return pitches.map((pitch, i) => {
    const idx = pitchToIndex(pitch);
    if (i > 0 && idx <= lastIdx) octave += 1;
    octave = Math.min(octave, maxOctave);
    lastIdx = idx;
    return { pitch, octave };
  });
}

function triadQuality(thirdInterval, fifthInterval) {
  if (thirdInterval === 3 && fifthInterval === 6) return 'dim';
  if (thirdInterval === 3 && fifthInterval === 7) return 'min';
  if (thirdInterval === 4 && fifthInterval === 7) return 'maj';
  if (thirdInterval === 4 && fifthInterval === 8) return 'aug';
  return 'maj';
}

function chordSymbol(root, quality) {
  if (quality === 'min') return `${root}m`;
  if (quality === 'dim') return `${root}dim`;
  if (quality === 'aug') return `${root}aug`;
  return root;
}

function romanNumeral(degree, quality) {
  const numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  let roman = numerals[degree] || String(degree + 1);
  if (quality === 'min') roman = roman.toLowerCase();
  if (quality === 'dim') roman = `${roman.toLowerCase()}°`;
  return roman;
}

/** Diatonic triad on each scale degree. */
export function getDiatonicTriads(root, steps) {
  const notes = getScaleNotes(root, steps);
  if (!notes.length) return [];
  const len = notes.length;

  return notes.map((rootNote, degree) => {
    const thirdNote = notes[(degree + 2) % len];
    const fifthNote = notes[(degree + 4) % len];
    const ri = pitchToIndex(rootNote);
    let ti = pitchToIndex(thirdNote);
    let fi = pitchToIndex(fifthNote);
    if (ti <= ri) ti += 12;
    if (fi <= ti) fi += 12;
    const quality = triadQuality(ti - ri, fi - ri);
    return {
      degree,
      root: rootNote,
      notes: [rootNote, thirdNote, fifthNote],
      quality,
      symbol: chordSymbol(rootNote, quality),
      roman: romanNumeral(degree, quality),
    };
  });
}

export function findTriadByRoman(triads, numeral) {
  return triads.find((t) => t.roman === numeral) || null;
}

export function resolveProgressionChords(root, steps, pattern) {
  const triads = getDiatonicTriads(root, steps);
  return pattern
    .split(/\s+/)
    .filter(Boolean)
    .map((numeral) => findTriadByRoman(triads, numeral))
    .filter(Boolean);
}

export function buildChordTable(uniqueChords, chordsJson, getCellValue, options = {}) {
  const { tableClass = '', interactive = false } = options;
  const allData = {};
  let maxRows = 0;

  for (const chord of uniqueChords) {
    const variant = chordsJson[chord]?.variant1;
    if (variant && typeof variant === 'object') {
      allData[chord] = getCellValue(chord, variant, Array.isArray(variant) ? variant : Object.values(variant));
      maxRows = Math.max(maxRows, allData[chord].length);
    } else {
      allData[chord] = ['N/A'];
      maxRows = Math.max(maxRows, 1);
    }
  }

  const chordNames = Object.keys(allData);
  const classes = [tableClass, interactive ? 'fb-chord-table' : ''].filter(Boolean).join(' ');
  let html = classes ? `<table class="${classes}">` : '<table>';
  html += '<thead><tr>';
  for (const name of chordNames) {
    const safe = name.replace(/"/g, '&quot;');
    const notesAttr = interactive
      ? ` class="fb-selectable fb-chord-col" data-chord="${safe}" data-label="${safe}"`
      : '';
    html += `<th${notesAttr}>${escapeHtml(name)}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (let i = 0; i < maxRows; i++) {
    html += '<tr>';
    for (const name of chordNames) {
      const cell = allData[name][i] ?? '&nbsp;';
      html += `<td>${cell}</td>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

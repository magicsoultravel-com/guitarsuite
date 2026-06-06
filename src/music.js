export const MUSICAL_ORDER = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb',
  'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
];

export const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
      if (note) notes.push(note);
    }
  }
  return [...new Set(notes)];
}

export function getNoteName(rootNumber, interval) {
  return CHROMATIC[(rootNumber + interval) % 12];
}

export function buildChordTable(uniqueChords, chordsJson, getCellValue) {
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
  let html = '<table><thead><tr>';
  for (const name of chordNames) {
    html += `<th>${name}</th>`;
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

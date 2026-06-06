import { asset } from './paths.js';

export function initFretboardInteractive() {
  const fretboardTable = document.getElementById('fretboard-table');
  const fretNotationDisplay = document.getElementById('fret-notation-display');
  const relatedChordsDisplay = document.getElementById('related-chords-display');

  if (!fretboardTable) return;

  let notesData = null;
  let chordsData = null;
  const activeNotes = new Set();
  const stringOrder = ['E', 'A', 'D', 'G', 'B', 'e'];

  function getNoteFromFret(stringName, fretNumber) {
    if (!notesData?.[stringName]) return '';
    if (fretNumber === 0) return stringName;
    return notesData[stringName][fretNumber] || '';
  }

  function updateFretboardDisplay() {
    fretboardTable.querySelectorAll('.selected, .highlighted').forEach((cell) => {
      cell.classList.remove('selected', 'highlighted');
    });

    const stringFretsMap = Object.fromEntries(stringOrder.map((s) => [s, []]));

    fretboardTable.querySelectorAll('tbody tr').forEach((row) => {
      const stringNameCell = row.querySelector('td:first-child strong');
      if (!stringNameCell) return;
      const currentStringName = stringNameCell.textContent.trim();

      row.querySelectorAll('td').forEach((cell, cellIndex) => {
        let cellNotePitch = '';
        let isFretZeroCell = false;

        if (cellIndex === 0) {
          isFretZeroCell = true;
          cellNotePitch = stringNameCell.textContent.trim();
        } else {
          const strong = cell.querySelector('strong');
          cellNotePitch = (strong ?? cell).textContent.trim();
        }

        if (!cellNotePitch) return;
        cellNotePitch = cellNotePitch.toUpperCase();

        if (activeNotes.has(cellNotePitch)) {
          cell.classList.add('selected');
          stringFretsMap[currentStringName].push(isFretZeroCell ? 0 : cellIndex);
        }
      });
    });

    if (fretNotationDisplay) {
      const lines = stringOrder
        .filter((s) => stringFretsMap[s].length)
        .map((s) => `${s} - ${stringFretsMap[s].sort((a, b) => a - b).join(', ')}`);
      fretNotationDisplay.innerText = lines.length
        ? `Selected Frets:\n${lines.join('\n')}`
        : 'Click on notes to see their fret notation here.';
    }

    if (!relatedChordsDisplay) return;

    if (!chordsData || !notesData) {
      relatedChordsDisplay.innerText = 'Loading chord data...';
      return;
    }

    const selected = [...activeNotes];
    if (!selected.length) {
      relatedChordsDisplay.innerText = 'Select notes to find related chords.';
      return;
    }

    const matched = [];
    for (const [chordName, details] of Object.entries(chordsData)) {
      const chordFrets = details.variant1;
      if (!chordFrets) continue;

      const pitches = new Set();
      for (const [string, fret] of Object.entries(chordFrets)) {
        if (fret == null || fret === 'X' || fret === 'x') continue;
        let stringName = string;
        if (stringName === 'E1' || stringName === 'E2' || stringName === 'e') stringName = 'E';
        const note = getNoteFromFret(stringName, fret);
        if (note) pitches.add(note.toUpperCase());
      }

      if (selected.every((p) => pitches.has(p))) matched.push(chordName);
    }

    relatedChordsDisplay.innerText = matched.length
      ? `Related Chords:\n${matched.sort().join(', ')}`
      : 'No chords found containing ALL selected notes.';
  }

  Promise.all([
    fetch(asset('assets/notes.json')).then((r) => r.json()),
    fetch(asset('assets/chords.json')).then((r) => r.json()),
  ])
    .then(([notes, chords]) => {
      notesData = notes;
      chordsData = chords;
      updateFretboardDisplay();
    })
    .catch(() => {
      if (relatedChordsDisplay) relatedChordsDisplay.innerText = 'Error loading chord data.';
    });

  fretboardTable.addEventListener('click', (event) => {
    const cell = event.target.closest('td');
    if (!cell || !fretboardTable.contains(cell)) return;

    const strong = cell.querySelector('strong');
    let pitch = (strong ?? cell).textContent.trim();
    if (!pitch) return;

    pitch = pitch.toUpperCase();
    if (activeNotes.has(pitch)) activeNotes.delete(pitch);
    else activeNotes.add(pitch);
    updateFretboardDisplay();
  });

  updateFretboardDisplay();
}

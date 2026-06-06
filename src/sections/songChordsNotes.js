import { createSection } from '../utils.js';
import { buildChordTable, getChordNotes, sortNotesByMusicalOrder } from '../music.js';

export function renderChordsAndNotes(currentSong, chordsJson, notesJson) {
  if (!currentSong?.chords) {
    const msg = currentSong
      ? 'Current song has no chords defined.'
      : 'No song selected.';
    return createSection('chords & notes', `<p>${msg}</p>`, 'chords-notes-section');
  }

  if (!chordsJson || !notesJson) {
    return createSection('chords & notes', '<p>Cannot display chords and notes — data files missing.</p>', 'chords-notes-section');
  }

  const uniqueChords = [...new Set(currentSong.chords.split(' ').filter(Boolean))];

  const chordsTable = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    const values = Array.isArray(variant) ? variant : Object.values(variant);
    return values.map((v) => String(v));
  }, { tableClass: 'chords-table', chordHeaders: true });

  const notesTable = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    return sortNotesByMusicalOrder(getChordNotes(variant, notesJson));
  }, { tableClass: 'notes-table', chordHeaders: true });

  return createSection('chords & notes', `
    <div class="chords-notes-split">
      <div class="chords-notes-col">
        <h3 class="split-label">Chords</h3>
        ${chordsTable}
      </div>
      <div class="chords-notes-col">
        <h3 class="split-label">Notes</h3>
        ${notesTable}
      </div>
    </div>
  `, 'chords-notes-section');
}

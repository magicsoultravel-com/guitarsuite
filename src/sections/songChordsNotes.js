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

  const uniqueChords = [...new Set(currentSong.chords.split(' '))];

  const chordsTable = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    const values = Array.isArray(variant) ? variant : Object.values(variant);
    return values.map((v) => String(v));
  }, { interactive: true, tableClass: 'chords-table' });

  const notesTable = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    return sortNotesByMusicalOrder(getChordNotes(variant, notesJson));
  }, { interactive: true, tableClass: 'notes-table' });

  return createSection('chords & notes', `
    <p class="fb-hint">Click a column header to highlight on fretboard (up to 3 layers, click again to remove).</p>
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

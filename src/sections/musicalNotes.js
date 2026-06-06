import { createSection } from '../utils.js';
import { buildChordTable, getChordNotes, sortNotesByMusicalOrder } from '../music.js';

export function renderMusicalNotes(currentSong, chordsJson, notesJson) {
  if (!currentSong?.chords || !chordsJson || !notesJson) {
    return createSection('notes', '<p>Cannot display musical notes. Either no song is selected, or required data could not be loaded.</p>');
  }

  const uniqueChords = [...new Set(currentSong.chords.split(' '))];
  const tableHtml = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    const notes = sortNotesByMusicalOrder(getChordNotes(variant, notesJson));
    return notes;
  }, { interactive: true, tableClass: 'notes-table' });

  return createSection('notes', `<p class="fb-hint">Click a column header to highlight those notes on fretboard.</p><div>${tableHtml}</div>`);
}

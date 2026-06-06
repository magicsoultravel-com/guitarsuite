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
  });

  return createSection('notes', `<div>${tableHtml}</div>`);
}

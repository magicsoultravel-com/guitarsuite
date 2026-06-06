import { createSection } from '../utils.js';
import { buildChordTable } from '../music.js';

export function renderChordsSheet(currentSong, chordsJson) {
  if (!currentSong?.chords) {
    const msg = currentSong
      ? 'Current song has no chords defined.'
      : 'No song selected.';
    return createSection('chords', `<div><p>${msg}</p></div>`);
  }

  const uniqueChords = [...new Set(currentSong.chords.split(' '))];
  const tableHtml = buildChordTable(uniqueChords, chordsJson, (_chord, variant) => {
    const values = Array.isArray(variant) ? variant : Object.values(variant);
    return values.map((v) => String(v));
  }, { interactive: true, tableClass: 'chords-table' });

  const section = createSection('chords', `<p class="fb-hint">Click a column header to highlight on fretboard.</p><div>${tableHtml}</div>`);
  return section;
}

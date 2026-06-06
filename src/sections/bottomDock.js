import { renderChordPicker } from './chordPicker.js';
import { createNowPlayingDrawer } from './songBook.js';

export function renderBottomDock(hub, songs, chords, notes, songIndex) {
  const dock = document.createElement('div');
  dock.id = 'bottom-dock';
  dock.className = 'bottom-dock';

  const currentSong = songs[songIndex] ?? null;
  dock.appendChild(renderChordPicker(hub, chords, notes, currentSong));
  dock.appendChild(createNowPlayingDrawer(songs, chords, songIndex));

  document.body.appendChild(dock);
  document.body.classList.add('has-bottom-dock');

  return { dock, currentSong };
}

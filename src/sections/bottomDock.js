import { renderRootModule } from './rootModule.js';
import { renderChordPicker } from './chordPicker.js';
import { renderFretboardDrawer } from './fretboardDrawer.js';
import { createNowPlayingDrawer } from './songBook.js';
import { renderToolsDock } from './tools.js';
import { initDockModules } from '../dockModule.js';

export function renderBottomDock(hub, songs, chords, notes, songIndex) {
  const dock = document.createElement('div');
  dock.id = 'bottom-dock';
  dock.className = 'bottom-dock';

  const currentSong = songs[songIndex] ?? null;
  dock.appendChild(renderRootModule(hub));
  dock.appendChild(renderChordPicker(hub, chords, notes, currentSong));
  dock.appendChild(renderFretboardDrawer(hub, notes));
  dock.appendChild(createNowPlayingDrawer(hub, songs, chords, notes, songIndex));
  dock.appendChild(renderToolsDock());

  document.body.appendChild(dock);
  document.body.classList.add('has-bottom-dock');
  initDockModules(dock);

  return { dock, currentSong };
}

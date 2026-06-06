import { renderRootModule } from './rootModule.js';
import { renderChordPicker } from './chordPicker.js';
import { renderFretboardDrawer } from './fretboardDrawer.js';
import { createNowPlayingDrawer } from './songBook.js';
import { renderToolsDock } from './tools.js';
import { renderSelectionPanel } from './selectionPanel.js';
import { initDockModules } from '../dockModule.js';

export function renderBottomDock(hub, songs, chords, notes, songIndex) {
  const dock = document.createElement('div');
  dock.id = 'tool-dock';
  dock.className = 'tool-dock';

  const currentSong = songs[songIndex] ?? null;
  dock.appendChild(renderRootModule(hub));
  dock.appendChild(renderChordPicker(hub, chords, notes, currentSong));
  dock.appendChild(renderFretboardDrawer(hub, notes));
  dock.appendChild(createNowPlayingDrawer(hub, songs, chords, notes, songIndex));
  dock.appendChild(renderToolsDock());

  document.body.appendChild(dock);
  document.body.classList.add('has-tool-dock');
  initDockModules(dock);
  renderSelectionPanel(hub);

  return { dock, currentSong };
}

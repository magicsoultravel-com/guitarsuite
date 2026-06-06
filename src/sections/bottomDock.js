import { renderRootModule } from './rootModule.js';
import { renderChordPicker } from './chordPicker.js';
import { renderFretboardDrawer } from './fretboardDrawer.js';
import { createNowPlayingDrawer } from './songBook.js';
import { renderToolsDock } from './tools.js';
import { renderSelectionPanel } from './selectionPanel.js';
import { initDockModules } from '../dockModule.js';

export function renderBottomDock(hub, songs, chords, notes, songIndex, theoryContext = {}) {
  const dock = document.createElement('div');
  dock.id = 'tool-dock';
  dock.className = 'tool-dock';

  let currentIndex = songIndex;
  const currentSong = songs[currentIndex] ?? null;

  function setSongIndex(index, onContentUpdate) {
    currentIndex = index;
    const song = songs[currentIndex] ?? null;
    const url = new URL(location.href);
    url.searchParams.set('songIndex', index);
    history.replaceState(null, '', url);
    nowPlaying.updateSong(index);
    onContentUpdate?.(song);
    return song;
  }

  dock.appendChild(renderRootModule(hub));
  const chordPicker = renderChordPicker(
    hub,
    chords,
    notes,
    theoryContext.chordsTheory,
    theoryContext.curatedKeys,
  );
  dock.appendChild(chordPicker.el);
  dock.appendChild(renderFretboardDrawer(hub, notes));

  const nowPlaying = createNowPlayingDrawer(
    hub,
    songs,
    chords,
    notes,
    currentIndex,
    (index) => setSongIndex(index, theoryContext.onSongChange),
    theoryContext.chordsTheory,
  );
  dock.appendChild(nowPlaying.drawer);
  dock.appendChild(renderToolsDock());

  document.body.appendChild(dock);
  document.body.classList.add('has-tool-dock');
  initDockModules(dock);
  renderSelectionPanel(hub, {
    chordsJson: chords,
    scalesJson: theoryContext.scales,
    chordsTheory: theoryContext.chordsTheory,
    notesJson: notes,
  });

  return {
    dock,
    currentSong,
    setSongIndex: (index) => setSongIndex(index, theoryContext.onSongChange),
  };
}

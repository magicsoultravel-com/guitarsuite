import { renderRootModule } from './rootModule.js';
import { renderChordPicker } from './chordPicker.js';
import { renderFretboardDrawer } from './fretboardDrawer.js';
import { createNowPlayingDrawer } from './songBook.js';
import { renderToolsDock } from './tools.js';
import { wrapAsDockModule } from '../dockSection.js';
import { initDockModules } from '../dockModule.js';
import { MODULE_ORDER } from '../workspaceLayout.js';
import { renderChordsAndNotes } from './songChordsNotes.js';

const TOOL_IDS = new Set(['root', 'chords', 'fretboard', 'now-playing', 'tools']);

export function renderModuleDock(hub, songs, chords, notes, songIndex, contentModules = {}, theoryContext = {}) {
  const dock = document.createElement('div');
  dock.id = 'module-dock';
  dock.className = 'module-dock';

  let currentIndex = songIndex;
  const wrapped = {};

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
  dock.appendChild(renderChordPicker(
    hub,
    chords,
    notes,
    theoryContext.chordsTheory,
    theoryContext.curatedKeys,
  ).el);
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
  dock.appendChild(renderToolsDock({
    chordsJson: chords,
    notesJson: notes,
    curatedKeys: theoryContext.curatedKeys,
  }));

  for (const id of MODULE_ORDER) {
    if (TOOL_IDS.has(id)) continue;
    const section = contentModules[id];
    if (!section) continue;
    const mod = wrapAsDockModule(section, { id, label: moduleLabel(id) });
    if (id === 'chords-notes') mod.id = 'chords-notes-section';
    wrapped[id] = mod;
    dock.appendChild(mod);
  }

  document.body.appendChild(dock);
  document.body.classList.add('has-module-dock');
  initDockModules(dock);

  function updateChordsNotes(song, chordsJson, notesJson) {
    const mod = wrapped['chords-notes'] || dock.querySelector('[data-dock-id="chords-notes"]');
    if (!mod) return null;
    const panel = mod.querySelector('.dock-module-panel');
    if (!panel) return null;
    const section = renderChordsAndNotes(song, chordsJson, notesJson);
    section.querySelector('h2')?.remove();
    section.classList.remove('section');
    panel.replaceChildren(...section.childNodes);
    return section;
  }

  return {
    dock,
    wrapped,
    currentSong: songs[currentIndex] ?? null,
    updateChordsNotes,
    setSongIndex: (index) => setSongIndex(index, theoryContext.onSongChange),
  };
}

function moduleLabel(id) {
  const labels = {
    'chords-notes': 'chords & notes',
    'chords-theory': 'chords theory',
    'scales-modes': 'scales & modes',
    'scale-progressions': 'scale progressions',
    'genre-theory': 'genre theory',
    'useful-links': 'useful links',
    gallery: 'image carousel',
  };
  return labels[id] || id;
}

export function buildContentSections({
  songs, songIndex, chords, notes,
  theorySection, scalesSection, progressionsSection, genreSection,
  usefulLinksSection, gallerySection,
}) {
  return {
    'chords-notes': renderChordsAndNotes(songs[songIndex] ?? null, chords, notes),
    'chords-theory': theorySection,
    'scales-modes': scalesSection,
    'scale-progressions': progressionsSection,
    'genre-theory': genreSection,
    'useful-links': usefulLinksSection,
    gallery: gallerySection,
  };
}

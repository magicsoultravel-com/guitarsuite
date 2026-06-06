import { enrichChordsJson } from './chordVoicings.js';
import { fetchJson, renderFooter } from './utils.js';
import { asset } from './paths.js';
import { renderBottomDock } from './sections/bottomDock.js';
import { renderChordsAndNotes } from './sections/songChordsNotes.js';
import { renderChordsTheory } from './sections/chordsTheory.js';
import { renderScalesTheory } from './sections/scalesTheory.js';
import { renderScaleProgressions } from './sections/scaleProgressions.js';
import { renderGenreTheory } from './sections/genreTheory.js';
import { renderUsefulLinks } from './sections/usefulLinks.js';
import { renderAbout } from './sections/about.js';
import { renderGallery } from './sections/gallery.js';
import { renderContentDock } from './sections/contentDock.js';
import { renderSelectionFooter } from './sections/selectionFooter.js';
import { createFretboardHub } from './fretboardHub.js';
import { applyModulesState, collectDockOrders, collectModulesState } from './dockModule.js';
import { initSessionPersistence, restoreSession } from './sessionState.js';
import { getUserZoom, initWorkspace } from './workspaceLayout.js';
import {
  initFretboardInteractive,
  wireChordNoteTables,
  wireChordsTheory,
  wireScalesTheory,
  wireScaleProgressions,
  wireGenreTheory,
} from './fretboard-interactive.js';

const footerEl = document.getElementById('site-footer');
renderFooter(footerEl);

const params = new URLSearchParams(location.search);
let songIndex = parseInt(params.get('songIndex') || '0', 10);
const rootParam = params.has('root') ? (params.get('root') || '') : '';
const initialRoots = rootParam.split(',').map((r) => r.trim()).filter(Boolean);

try {
  const rawChords = await fetchJson(asset('assets/chords.json'));
  const chords = enrichChordsJson(rawChords);

  const [
    songs,
    notes,
    chordsTheory,
    intervals,
    scales,
    genres,
    usefulLinks,
    about,
    galleryManifest,
  ] = await Promise.all([
    fetchJson(asset('assets/songs.json')),
    fetchJson(asset('assets/notes.json')),
    fetchJson(asset('assets/chords-theory.json')),
    fetchJson(asset('assets/chords-theory-intervals.json')),
    fetchJson(asset('assets/scales-theory.json')),
    fetchJson(asset('assets/genre-theory.json')),
    fetchJson(asset('content/useful-links.json')),
    fetchJson(asset('content/about.json')),
    fetchJson(asset('uploads/gallery/manifest.json')).catch(() => []),
  ]);

  const hub = createFretboardHub(initialRoots[0] || '');
  for (let i = 1; i < initialRoots.length && i < 3; i += 1) {
    hub.toggleRoot(initialRoots[i]);
  }
  hub.setChordContext({ chordsJson: chords, notesJson: notes, chordsTheory });

  const app = document.getElementById('app');
  app.appendChild(renderAbout(about));

  const theorySection = renderChordsTheory();
  const scalesSection = renderScalesTheory(scales);
  const progressionsSection = renderScaleProgressions(scales);
  const genreSection = renderGenreTheory(genres);

  const contentDock = renderContentDock({
    'chords-notes': renderChordsAndNotes(songs[songIndex] ?? null, chords, notes),
    'chords-theory': theorySection,
    'scales-modes': scalesSection,
    'scale-progressions': progressionsSection,
    'genre-theory': genreSection,
    'useful-links': renderUsefulLinks(usefulLinks),
    gallery: renderGallery(galleryManifest),
  });

  function mountChordsAndNotes(song) {
    contentDock.updateChordsNotes(song, chords, notes);
    wireChordNoteTables(hub, chords, notes, chordsTheory);
  }

  const selectionContext = {
    chordsJson: chords,
    scalesJson: scales,
    chordsTheory,
    notesJson: notes,
  };

  const { currentSong } = renderBottomDock(hub, songs, chords, notes, songIndex, {
    scales,
    chordsTheory,
    curatedKeys: new Set(Object.keys(rawChords)),
    onSongChange: (index) => {
      songIndex = index;
      mountChordsAndNotes(songs[index] ?? null);
    },
  });

  renderSelectionFooter(hub, selectionContext, footerEl);

  initWorkspace();
  mountChordsAndNotes(currentSong);

  initFretboardInteractive(hub, notes, chords);

  wireChordsTheory(hub, chordsTheory, intervals, document.getElementById('chords-theory-section'));
  wireScalesTheory(hub, scales, document.getElementById('scales-theory-section'));
  wireScaleProgressions(hub, scales, document.getElementById('scale-progressions-section'));
  wireGenreTheory(hub, scales, genres, document.getElementById('genre-theory-section'));

  restoreSession(applyModulesState);
  initSessionPersistence(collectModulesState, getUserZoom, collectDockOrders);
} catch (err) {
  document.getElementById('app').innerHTML = `<div class="section"><h2>Error</h2><p>${err.message}</p></div>`;
  console.error(err);
}

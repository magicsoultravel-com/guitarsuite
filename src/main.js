import { fetchJson, renderFooter } from './utils.js';
import { asset } from './paths.js';
import { renderSongBook } from './sections/songBook.js';
import { renderChordsSheet } from './sections/chordsSheet.js';
import { renderMusicalNotes } from './sections/musicalNotes.js';
import { renderFretboard } from './sections/fretboard.js';
import { renderChordsTheory } from './sections/chordsTheory.js';
import { renderScalesTheory } from './sections/scalesTheory.js';
import { renderMetronome } from './sections/metronome.js';
import { renderUsefulLinks } from './sections/usefulLinks.js';
import { renderBlogger } from './sections/blogger.js';
import { renderAbout } from './sections/about.js';
import { renderGallery } from './sections/gallery.js';
import { createFretboardHub, renderRootToolbar } from './fretboardHub.js';
import { initFretboardSidebar } from './sidebar.js';
import {
  initFretboardInteractive,
  wireChordNoteTables,
  wireChordsTheory,
  wireScalesTheory,
} from './fretboard-interactive.js';

const app = document.getElementById('app');
renderFooter(document.getElementById('site-footer'));

const params = new URLSearchParams(location.search);
const songIndex = parseInt(params.get('songIndex') || '0', 10);
const initialRoot = params.get('root') || 'C';

try {
  const [
    songs,
    chords,
    notes,
    chordsTheory,
    intervals,
    scales,
    usefulLinks,
    bloggerPosts,
    about,
    galleryManifest,
  ] = await Promise.all([
    fetchJson(asset('assets/songs.json')),
    fetchJson(asset('assets/chords.json')),
    fetchJson(asset('assets/notes.json')),
    fetchJson(asset('assets/chords-theory.json')),
    fetchJson(asset('assets/chords-theory-intervals.json')),
    fetchJson(asset('assets/scales-theory.json')),
    fetchJson(asset('content/useful-links.json')),
    fetchJson(asset('data/developer-blogger.json')),
    fetchJson(asset('content/about.json')),
    fetchJson(asset('uploads/gallery/manifest.json')).catch(() => []),
  ]);

  const hub = createFretboardHub(initialRoot);
  const sidebarInner = document.getElementById('sidebar-inner');
  sidebarInner.appendChild(renderRootToolbar(hub));
  sidebarInner.appendChild(renderFretboard(notes));

  initFretboardSidebar();

  const { section: songSection, currentSong } = renderSongBook(songs, chords, songIndex);
  app.appendChild(songSection);
  app.appendChild(renderChordsSheet(currentSong, chords));
  app.appendChild(renderMusicalNotes(currentSong, chords, notes));

  initFretboardInteractive(hub, notes, chords);
  wireChordNoteTables(hub, chords, notes);

  const theorySection = renderChordsTheory();
  app.appendChild(theorySection);
  wireChordsTheory(hub, chordsTheory, intervals, theorySection);

  const scalesSection = renderScalesTheory(scales);
  app.appendChild(scalesSection);
  wireScalesTheory(hub, scales, scalesSection);

  hub.setRoot(initialRoot);

  app.appendChild(renderMetronome());
  app.appendChild(renderUsefulLinks(usefulLinks));
  app.appendChild(renderBlogger(bloggerPosts));
  app.appendChild(renderAbout(about));
  app.appendChild(renderGallery(galleryManifest));
} catch (err) {
  app.innerHTML = `<div class="section"><h2>Error</h2><p>${err.message}</p></div>`;
  console.error(err);
}

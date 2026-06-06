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
import { renderBlogger } from './sections/blogger.js';
import { renderAbout } from './sections/about.js';
import { renderGallery } from './sections/gallery.js';
import { createFretboardHub } from './fretboardHub.js';
import {
  initFretboardInteractive,
  wireChordNoteTables,
  wireChordsTheory,
  wireScalesTheory,
  wireScaleProgressions,
  wireGenreTheory,
} from './fretboard-interactive.js';

const app = document.getElementById('app');
renderFooter(document.getElementById('site-footer'));

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
    bloggerPosts,
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
    fetchJson(asset('data/developer-blogger.json')),
    fetchJson(asset('content/about.json')),
    fetchJson(asset('uploads/gallery/manifest.json')).catch(() => []),
  ]);

  const hub = createFretboardHub(initialRoots[0] || '');
  for (let i = 1; i < initialRoots.length && i < 3; i += 1) {
    hub.toggleRoot(initialRoots[i]);
  }
  hub.setChordContext({ chordsJson: chords, notesJson: notes, chordsTheory });

  function mountChordsAndNotes(song) {
    const existing = document.getElementById('chords-notes-section');
    const section = renderChordsAndNotes(song, chords, notes);
    if (existing) {
      existing.replaceWith(section);
    } else {
      app.prepend(section);
    }
    wireChordNoteTables(hub, chords, notes, chordsTheory);
  }

  const { currentSong } = renderBottomDock(hub, songs, chords, notes, songIndex, {
    scales,
    chordsTheory,
    curatedKeys: new Set(Object.keys(rawChords)),
    onSongChange: (index) => {
      songIndex = index;
      mountChordsAndNotes(songs[index] ?? null);
    },
  });

  mountChordsAndNotes(currentSong);

  initFretboardInteractive(hub, notes, chords);

  const theorySection = renderChordsTheory();
  app.appendChild(theorySection);
  wireChordsTheory(hub, chordsTheory, intervals, theorySection);

  const scalesSection = renderScalesTheory(scales);
  app.appendChild(scalesSection);
  wireScalesTheory(hub, scales, scalesSection);

  const progressionsSection = renderScaleProgressions(scales);
  app.appendChild(progressionsSection);
  wireScaleProgressions(hub, scales, progressionsSection);

  const genreSection = renderGenreTheory(genres);
  app.appendChild(genreSection);
  wireGenreTheory(hub, scales, genres, genreSection);

  app.appendChild(renderUsefulLinks(usefulLinks));
  app.appendChild(renderBlogger(bloggerPosts));
  app.appendChild(renderAbout(about));
  app.appendChild(renderGallery(galleryManifest));
} catch (err) {
  app.innerHTML = `<div class="section"><h2>Error</h2><p>${err.message}</p></div>`;
  console.error(err);
}

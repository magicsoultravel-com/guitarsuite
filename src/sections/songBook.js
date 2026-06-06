import { escapeHtml } from '../utils.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers, openFloatingModule } from '../dockModule.js';
import { appendChordChips, getChordContext } from '../chordChip.js';

function renderChords(chipGrid, chordsList, hub, chordsJson, notesJson, chordsTheory) {
  const ctx = getChordContext(hub, chordsJson, notesJson, chordsTheory);
  appendChordChips(chipGrid, chordsList, hub, ctx);
}

export function createNowPlayingDrawer(hub, songs, chords, notesJson, songIndex, onSongChange, chordsTheory = {}) {
  const drawer = document.createElement('div');
  drawer.id = 'now-playing-drawer';
  drawer.className = 'now-playing-drawer';

  let currentIndex = songIndex;

  function buildBar(song) {
    if (!song) {
      return `
        <div class="dock-module-bar">
          <span class="dock-module-sub">No song selected</span>
        </div>
      `;
    }
    const summary = `${song.title} · ${song.artist}`;
    return `
      <div class="dock-module-bar dock-module-bar--now-playing">
        <span class="dock-module-sub now-playing-summary">${escapeHtml(summary)}</span>
        <span class="dock-module-chevron" aria-hidden="true">▲</span>
      </div>
      <div class="dock-module-panel now-playing-panel" hidden>
        <div class="now-playing-controls">
          <button type="button" class="dock-nav-btn now-playing-prev" title="Previous song" aria-label="Previous song">‹</button>
          <div class="now-playing-meta">
            <span class="now-playing-title">${escapeHtml(song.title)}</span>
            <span class="now-playing-artist">${escapeHtml(song.artist)}</span>
          </div>
          <button type="button" class="dock-nav-btn now-playing-next" title="Next song" aria-label="Next song">›</button>
        </div>
        <div class="dock-section">
          <span class="dock-section-label">In song</span>
          <div class="dock-chip-grid now-playing-chords"></div>
        </div>
        <div class="dock-meta">
          <a href="./songs-db.html">${songs.length} songs</a>
          <span class="dock-meta-sep">·</span>
          <a href="./chords-db.html">${Object.keys(chords).length} chords</a>
        </div>
      </div>
    `;
  }

  function wireBar() {
    const prevBtn = drawer.querySelector('.now-playing-prev');
    const nextBtn = drawer.querySelector('.now-playing-next');
    const chipGrid = drawer.querySelector('.now-playing-chords');
    const song = songs[currentIndex];

    if (!song) return { setExpanded: () => {} };

    const chordsList = song.chords.split(' ').filter(Boolean);
    renderChords(chipGrid, chordsList, hub, chords, notesJson, chordsTheory);

    const { setExpanded } = wireDockExpand(drawer, {
      bodyClass: 'now-playing-expanded',
      moduleId: 'now-playing',
    });

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = (currentIndex - 1 + songs.length) % songs.length;
      onSongChange?.(next);
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = (currentIndex + 1) % songs.length;
      onSongChange?.(next);
    });

    wireDockBarToggle(drawer, setExpanded);

    return { setExpanded };
  }

  drawer.innerHTML = buildBar(songs[currentIndex]);
  ensureDockChrome(drawer, 'now-playing', 'now playing', { expandable: !!songs[currentIndex] });
  wireBar();
  hub?.subscribe(() => syncChipLayers(hub, drawer));

  function updateSong(index) {
    currentIndex = index;
    const wasExpanded = drawer.classList.contains('is-expanded');
    drawer.innerHTML = buildBar(songs[currentIndex]);
    ensureDockChrome(drawer, 'now-playing', 'now playing', { expandable: !!songs[currentIndex] });
    wireBar();
    if (wasExpanded && songs[currentIndex]) openFloatingModule(drawer);
  }

  return { drawer, updateSong, getSongIndex: () => currentIndex };
}

/** @deprecated use createNowPlayingDrawer via renderBottomDock */
export function renderNowPlaying(songs, chords, songIndex) {
  const { drawer, updateSong } = createNowPlayingDrawer(null, songs, chords, {}, songIndex);
  document.body.appendChild(drawer);
  document.body.classList.add('has-now-playing');
  return { drawer, currentSong: songs[songIndex] ?? null, updateSong };
}

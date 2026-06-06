import { escapeHtml } from '../utils.js';
import { getChordNotes } from '../music.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers } from '../dockModule.js';
import { playChordByName } from '../playback.js';

function pickChord(hub, chordsJson, notesJson, name) {
  const variant = chordsJson[name]?.variant1;
  if (!variant) return;
  hub.toggleSelection({ label: name, notes: getChordNotes(variant, notesJson), family: 'chord' });
  playChordByName(name, chordsJson, notesJson);
}

function renderChords(chipGrid, chordsList, hub, chords, notesJson) {
  chipGrid.replaceChildren();
  for (const name of chordsList) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dock-chip fb-selectable is-song';
    btn.dataset.chord = name;
    btn.dataset.label = name;
    btn.textContent = name;
    btn.title = `Show ${name} on fretboard`;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickChord(hub, chords, notesJson, name);
    });
    chipGrid.appendChild(btn);
  }
}

export function createNowPlayingDrawer(hub, songs, chords, notesJson, songIndex, onSongChange) {
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
    return `
      <div class="dock-module-bar dock-module-bar--now-playing">
        <button type="button" class="dock-nav-btn now-playing-prev" title="Previous" aria-label="Previous song">‹</button>
        <button type="button" class="dock-module-main now-playing-toggle" aria-expanded="false">
          <span class="dock-module-title">${escapeHtml(song.title)}</span>
          <span class="dock-module-sub">${escapeHtml(song.artist)}</span>
        </button>
        <button type="button" class="dock-nav-btn now-playing-next" title="Next" aria-label="Next song">›</button>
        <span class="dock-module-chevron" aria-hidden="true">▲</span>
      </div>
      <div class="dock-module-panel now-playing-panel" hidden>
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
    const toggle = drawer.querySelector('.now-playing-toggle');
    const prevBtn = drawer.querySelector('.now-playing-prev');
    const nextBtn = drawer.querySelector('.now-playing-next');
    const panel = drawer.querySelector('.dock-module-panel');
    const chipGrid = drawer.querySelector('.now-playing-chords');
    const song = songs[currentIndex];

    if (!song) return { setExpanded: () => {} };

    const chordsList = song.chords.split(' ').filter(Boolean);
    renderChords(chipGrid, chordsList, hub, chords, notesJson);

    const { setExpanded } = wireDockExpand(drawer, {
      bodyClass: 'now-playing-expanded',
      moduleId: 'now-playing',
    });

    toggle?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel) setExpanded(panel.hidden);
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

    wireDockBarToggle(drawer, setExpanded, '.dock-nav-btn, .now-playing-toggle');

    return { setExpanded };
  }

  drawer.innerHTML = buildBar(songs[currentIndex]);
  ensureDockChrome(drawer, 'now-playing', 'Now playing', { expandable: !!songs[currentIndex] });
  wireBar();
  hub?.subscribe(() => syncChipLayers(hub, drawer));

  function updateSong(index) {
    currentIndex = index;
    const wasExpanded = drawer.classList.contains('is-expanded');
    drawer.innerHTML = buildBar(songs[currentIndex]);
    ensureDockChrome(drawer, 'now-playing', 'Now playing', { expandable: !!songs[currentIndex] });
    const { setExpanded } = wireBar();
    if (wasExpanded && songs[currentIndex]) setExpanded(true);
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

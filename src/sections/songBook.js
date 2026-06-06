import { escapeHtml } from '../utils.js';
import { getChordNotes } from '../music.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand, syncChipLayers } from '../dockModule.js';

function songUrl(index) {
  const url = new URL(location.href);
  url.searchParams.set('songIndex', index);
  return `${url.pathname}${url.search}`;
}

function pickChord(hub, chordsJson, notesJson, name) {
  const variant = chordsJson[name]?.variant1;
  if (!variant) return;
  hub.toggleSelection({ label: name, notes: getChordNotes(variant, notesJson) });
}

export function createNowPlayingDrawer(hub, songs, chords, notesJson, songIndex) {
  const drawer = document.createElement('div');
  drawer.id = 'now-playing-drawer';
  drawer.className = 'now-playing-drawer';

  const currentSong = songs[songIndex];
  if (!currentSong) {
    drawer.innerHTML = `
      <div class="dock-module-bar dock-module-bar--stacked">
        <span class="dock-module-sub">No song selected</span>
      </div>
    `;
    ensureDockChrome(drawer, 'now-playing', 'Now playing', { expandable: false });
    return drawer;
  }

  const prevIndex = (songIndex - 1 + songs.length) % songs.length;
  const nextIndex = (songIndex + 1) % songs.length;
  const chordsList = currentSong.chords.split(' ').filter(Boolean);

  drawer.innerHTML = `
    <div class="dock-module-bar dock-module-bar--stacked">
      <div class="dock-module-controls dock-nav-group">
        <a href="${songUrl(prevIndex)}" class="dock-nav-btn" title="Previous" aria-label="Previous song">‹</a>
        <a href="${songUrl(nextIndex)}" class="dock-nav-btn" title="Next" aria-label="Next song">›</a>
      </div>
      <div class="now-playing-info">
        <span class="dock-module-title">${escapeHtml(currentSong.title)}</span>
        <span class="dock-module-sub">${escapeHtml(currentSong.artist)}</span>
      </div>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel" hidden>
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

  ensureDockChrome(drawer, 'now-playing', 'Now playing');

  const chipGrid = drawer.querySelector('.now-playing-chords');

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

  const { setExpanded } = wireDockExpand(drawer, {
    bodyClass: 'now-playing-expanded',
    moduleId: 'now-playing',
  });

  wireDockBarToggle(drawer, setExpanded, '.dock-nav-group, .dock-nav-btn, .now-playing-info, .dock-chip');

  hub?.subscribe(() => syncChipLayers(hub, drawer));

  return drawer;
}

/** @deprecated use createNowPlayingDrawer via renderBottomDock */
export function renderNowPlaying(songs, chords, songIndex) {
  const drawer = createNowPlayingDrawer(null, songs, chords, {}, songIndex);
  document.body.appendChild(drawer);
  document.body.classList.add('has-now-playing');
  return { drawer, currentSong: songs[songIndex] ?? null };
}

import { escapeHtml } from '../utils.js';

function songUrl(index) {
  const url = new URL(location.href);
  url.searchParams.set('songIndex', index);
  return `${url.pathname}${url.search}`;
}

export function createNowPlayingDrawer(songs, chords, songIndex) {
  const drawer = document.createElement('div');
  drawer.id = 'now-playing-drawer';
  drawer.className = 'now-playing-drawer';

  const currentSong = songs[songIndex];
  if (!currentSong) {
    drawer.innerHTML = `<div class="now-playing-bar"><span class="now-playing-empty">No song selected</span></div>`;
    return drawer;
  }

  const prevIndex = (songIndex - 1 + songs.length) % songs.length;
  const nextIndex = (songIndex + 1) % songs.length;
  const chordsList = currentSong.chords.split(' ').filter(Boolean);

  drawer.innerHTML = `
    <div class="now-playing-bar">
      <a href="${songUrl(prevIndex)}" class="now-playing-nav" title="Previous" aria-label="Previous song">‹</a>
      <button type="button" class="now-playing-toggle" aria-expanded="false">
        <span class="now-playing-title">${escapeHtml(currentSong.title)}</span>
        <span class="now-playing-artist">${escapeHtml(currentSong.artist)}</span>
      </button>
      <a href="${songUrl(nextIndex)}" class="now-playing-nav" title="Next" aria-label="Next song">›</a>
      <span class="now-playing-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="now-playing-panel" hidden>
      <div class="now-playing-chords">${escapeHtml(chordsList.join(' '))}</div>
      <div class="now-playing-meta">
        <a href="./songs-db.html">${songs.length} songs</a>
        <span class="meta-sep">·</span>
        <a href="./chords-db.html">${Object.keys(chords).length} chords</a>
      </div>
    </div>
  `;

  const toggle = drawer.querySelector('.now-playing-toggle');
  const panel = drawer.querySelector('.now-playing-panel');
  const chevron = drawer.querySelector('.now-playing-chevron');

  function setExpanded(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-expanded', open);
    document.body.classList.toggle('now-playing-expanded', open);
    chevron.textContent = open ? '▼' : '▲';
  }

  toggle.addEventListener('click', () => setExpanded(panel.hidden));
  drawer.querySelector('.now-playing-bar').addEventListener('click', (e) => {
    if (e.target.closest('.now-playing-nav')) return;
    if (e.target === toggle || toggle.contains(e.target)) return;
    setExpanded(panel.hidden);
  });

  return drawer;
}

/** @deprecated use createNowPlayingDrawer via renderBottomDock */
export function renderNowPlaying(songs, chords, songIndex) {
  const drawer = createNowPlayingDrawer(songs, chords, songIndex);
  document.body.appendChild(drawer);
  document.body.classList.add('has-now-playing');
  return { drawer, currentSong: songs[songIndex] ?? null };
}

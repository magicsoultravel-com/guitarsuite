import { escapeHtml } from '../utils.js';

export function renderSongBook(songs, chords, songIndex) {
  const section = document.createElement('div');
  section.className = 'section';
  section.style.position = 'relative';

  const currentSong = songs[songIndex];
  if (!currentSong) {
    section.innerHTML = `
      <h2 class="section-title-inline">now playing</h2>
      <p>No song found at index ${escapeHtml(String(songIndex))}</p>
    `;
    return { section, currentSong: null };
  }

  const prevIndex = (songIndex - 1 + songs.length) % songs.length;
  const nextIndex = (songIndex + 1) % songs.length;
  const chordsArray = currentSong.chords.split(' ');
  const chordLines = [];
  for (let i = 0; i < chordsArray.length; i += 4) {
    chordLines.push(chordsArray.slice(i, i + 4).join(' '));
  }

  section.innerHTML = `
    <h2 class="section-title-inline">now playing</h2>
    <div class="song-book-body">
      <div class="now-playing">
        <p>"${escapeHtml(currentSong.title)}" by ${escapeHtml(currentSong.artist)}</p>
      </div>
      <a href="?songIndex=${prevIndex}">Previous</a>
      <a href="?songIndex=${nextIndex}">Next</a>
      <p>Total Songs: <a href="./songs-db.html">${songs.length}</a></p>
      <p>Total Chords: <a href="./chords-db.html">${Object.keys(chords).length}</a></p>
      <button id="show-chords-button">show</button>
      <div id="chords-container" hidden>${escapeHtml(chordLines.join(' | '))}</div>
    </div>
  `;

  section.querySelector('#show-chords-button').addEventListener('click', function () {
    const container = section.querySelector('#chords-container');
    const hidden = container.hidden;
    container.hidden = !hidden;
    this.textContent = hidden ? 'hide' : 'show';
  });

  return { section, currentSong };
}

import { escapeHtml } from './utils.js';

export function renderSongBook(songs, chords, songIndex) {
  const section = document.createElement('div');
  section.className = 'section';
  section.style.position = 'relative';

  const currentSong = songs[songIndex];
  if (!currentSong) {
    section.innerHTML = `
      <h2 style="display:inline-block;margin:0;">now playing</h2>
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
    <h2 style="display:inline-block;margin:0;">now playing</h2>
    <div style="margin-top:10px;">
      <div class="now-playing" style="flex-grow:1;">
        <p>"${escapeHtml(currentSong.title)}" by ${escapeHtml(currentSong.artist)}</p>
      </div>
      <a href="?songIndex=${prevIndex}">Previous</a>
      <a href="?songIndex=${nextIndex}">Next</a>
      <p>Total Songs: <a href="./songs-db.html" style="text-decoration:none;">${songs.length}</a></p>
      <p>Total Chords: <a href="./chords-db.html" style="text-decoration:none;">${Object.keys(chords).length}</a><br><br></p>
      <button id="show-chords-button">show</button>
      <div id="chords-container" style="display:none;">${escapeHtml(chordLines.join(' | '))}</div>
      <br><br>
    </div>
  `;

  section.querySelector('#show-chords-button').addEventListener('click', function () {
    const container = section.querySelector('#chords-container');
    const hidden = container.style.display === 'none';
    container.style.display = hidden ? 'block' : 'none';
    this.textContent = hidden ? 'hide' : 'show';
  });

  return { section, currentSong };
}

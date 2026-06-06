import { escapeHtml, fetchJson, renderFooter } from './utils.js';
import { asset } from './paths.js';
import { musicalSort } from './music.js';

const app = document.getElementById('app');
renderFooter(document.getElementById('site-footer'));

const COLUMNS = {
  id: 'ID',
  title: 'Title',
  artist: 'Artist',
  genre: 'Genre',
  added_date: 'Added Date',
  chords_count: 'Chords #',
  chords: 'Chords',
};

let songs = [];
let sortColumn = 'id';
let sortOrder = 'asc';

function getSortValue(song, col) {
  if (col === 'chords_count') {
    const chords = (song.chords || '').trim().split(/\s+/).filter(Boolean);
    return new Set(chords).size;
  }
  return song[col] ?? '';
}

function sortSongs() {
  songs.sort((a, b) => {
    const valA = getSortValue(a, sortColumn);
    const valB = getSortValue(b, sortColumn);
    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortOrder === 'asc' ? cmp : -cmp;
  });
}

function renderTable() {
  const headerCells = Object.entries(COLUMNS).map(([key, label]) => {
    if (key === 'chords') return `<th>${label}</th>`;
    const cls = sortColumn === key ? ` sortable ${sortOrder}` : ' sortable';
    return `<th class="${cls.trim()}" data-sort-column="${key}">${label}</th>`;
  }).join('');

  const rows = songs
    .filter((s) => s.chords)
    .map((song) => {
      const unique = [...new Set(song.chords.trim().split(/\s+/))].sort(musicalSort);
      return `<tr>
        <td>${escapeHtml(String(song.id ?? ''))}</td>
        <td>${escapeHtml(song.title ?? '')}</td>
        <td>${escapeHtml(song.artist ?? '')}</td>
        <td>${escapeHtml(song.genre ?? '')}</td>
        <td>${escapeHtml(song.added_date ?? '')}</td>
        <td>${unique.length}</td>
        <td><pre>${escapeHtml(unique.join(' '))}</pre></td>
      </tr>`;
    })
    .join('');

  app.innerHTML = `
    <div class="section" id="songsDbSection">
      <h2>songs db</h2>
      <div class="table-scroll">
        <table id="songsTable">
          <thead><tr>${headerCells}</tr></thead>
          <tbody id="songsTableBody">${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  app.querySelectorAll('#songsTable th.sortable').forEach((th) => {
    th.addEventListener('click', () => {
      const col = th.dataset.sortColumn;
      if (sortColumn === col) sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      else {
        sortColumn = col;
        sortOrder = 'asc';
      }
      sortSongs();
      renderTable();
    });
  });
}

try {
  songs = await fetchJson(asset('assets/songs.json'));
  sortSongs();
  renderTable();
} catch (err) {
  app.innerHTML = `<div class="section"><p>Failed to load songs: ${escapeHtml(err.message)}</p></div>`;
}

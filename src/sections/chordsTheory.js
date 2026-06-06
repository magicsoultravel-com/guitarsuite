import { escapeHtml } from '../utils.js';
import { CHROMATIC, getNoteName } from '../music.js';

export function renderChordsTheory(chords, intervals) {
  const params = new URLSearchParams(location.search);
  let selectedRoot = params.get('root') || 'C';
  if (!CHROMATIC.includes(selectedRoot)) selectedRoot = 'C';
  const rootNumber = CHROMATIC.indexOf(selectedRoot);

  const section = document.createElement('div');
  section.className = 'section';

  const options = CHROMATIC.map(
    (note) => `<option value="${note}"${note === selectedRoot ? ' selected' : ''}>${note}</option>`
  ).join('');

  let rows = '';
  for (const [type, data] of Object.entries(chords)) {
    const intervalList = data.intervals.split(' ').map(Number);
    const verbal = intervalList.map((i) => intervals[i]?.names?.[0] ?? i);
    const semitones = intervalList.slice(1).join(' ');
    const notes = intervalList.map((i) => getNoteName(rootNumber, i)).join(', ');
    const short = selectedRoot + data.short.slice(1);
    rows += `<tr>
      <td>${escapeHtml(type)}</td>
      <td>${escapeHtml(short)}</td>
      <td>${escapeHtml(verbal.join(', '))}</td>
      <td>${escapeHtml(semitones)}</td>
      <td>${escapeHtml(notes)}</td>
    </tr>`;
  }

  section.innerHTML = `
    <label for="root-select">Select Root Note:</label>
    <select id="root-select">${options}</select>
    <h2>chords theory</h2>
    <table>
      <tr>
        <th>Chord Type</th><th>Short</th><th>Intervals (verbal)</th>
        <th>Intervals (semitones)</th><th>Notes</th>
      </tr>
      ${rows}
    </table>
  `;

  section.querySelector('#root-select').addEventListener('change', (e) => {
    const url = new URL(location.href);
    url.searchParams.set('root', e.target.value);
    location.href = url.toString();
  });

  return section;
}

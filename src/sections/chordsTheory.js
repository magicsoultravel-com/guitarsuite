import { escapeHtml } from '../utils.js';

export function renderChordsTheory() {
  const section = document.createElement('div');
  section.className = 'section';
  section.id = 'chords-theory-section';
  section.innerHTML = `
    <h2>chords theory</h2>
    <p class="fb-hint">Uses the global root note. Click a row to highlight on fretboard (up to 3 layers).</p>
    <table id="chords-theory-table">
      <thead>
        <tr>
          <th>Chord Type</th><th>Short</th><th>Intervals (verbal)</th>
          <th>Intervals (semitones)</th><th>Notes</th>
        </tr>
      </thead>
      <tbody id="chords-theory-body"></tbody>
    </table>
  `;
  return section;
}

import { escapeHtml, fetchJson, renderFooter } from './utils.js';

const app = document.getElementById('app');
renderFooter(document.getElementById('site-footer'));

try {
  const chords = await fetchJson('/assets/chords.json');

  const rows = Object.entries(chords).map(([name, chord]) => {
    let variantHtml = '<div class="no-shape">No variant1 data</div>';
    if (chord.variant1 && typeof chord.variant1 === 'object') {
      variantHtml = Object.entries(chord.variant1)
        .map(([s, f]) => `${escapeHtml(s)}: ${escapeHtml(String(f))}`)
        .join('<br>');
    }
    return `<tr>
      <td>${escapeHtml(name)}</td>
      <td>${escapeHtml(chord.root ?? '')}</td>
      <td>${escapeHtml(chord.type ?? '')}</td>
      <td>${variantHtml}</td>
    </tr>`;
  }).join('');

  app.innerHTML = `
    <div class="section">
      <h2>Chords Database</h2>
      <div style="max-height:1000px;overflow:visible;">
        <table>
          <tr><th>Chord</th><th>Root</th><th>Type</th><th>Variant 1</th></tr>
          ${rows}
        </table>
      </div>
    </div>
  `;
} catch (err) {
  app.innerHTML = `<div class="section"><p>Failed to load chords: ${escapeHtml(err.message)}</p></div>`;
}

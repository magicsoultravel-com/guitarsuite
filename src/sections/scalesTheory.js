import { escapeHtml, createSection } from '../utils.js';

export function renderScalesTheory(scales) {
  const rows = Object.entries(scales)
    .map(([name, data]) => `<tr>
      <td>${escapeHtml(name)}</td>
      <td><code>${escapeHtml(data.steps.join(' '))}</code></td>
    </tr>`)
    .join('');

  return createSection('scales / modes', `
    <table>
      <thead><tr><th>name</th><th>steps</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

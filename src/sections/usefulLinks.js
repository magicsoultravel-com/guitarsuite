import { escapeHtml, createSection } from '../utils.js';

export function renderUsefulLinks(links) {
  const rows = links
    .map((link) => `<tr>
      <td><a href="${escapeHtml(link.link)}">${escapeHtml(link.link)}</a></td>
      <td>${escapeHtml(link.description)}</td>
      <td>${escapeHtml(link.added_date)}</td>
    </tr>`)
    .join('');

  return createSection('useful links', `
    <table>
      <thead><tr><th>Link</th><th>Description</th><th>Added Date</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `);
}

import { escapeHtml } from '../utils.js';

export function renderAbout(content) {
  const section = document.createElement('section');
  section.className = 'section about-section';
  if (content?.title && content?.body) {
    section.innerHTML = `
      <h2>${escapeHtml(content.title)}</h2>
      <div class="left-align">${content.body}</div>
    `;
  } else {
    section.innerHTML = '<h2>Error loading about content.</h2>';
  }
  return section;
}

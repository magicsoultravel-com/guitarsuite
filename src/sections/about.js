import { escapeHtml } from '../utils.js';

export function renderAbout(content) {
  const section = document.createElement('section');
  section.className = 'about-hero';
  if (content?.title && content?.body) {
    section.innerHTML = `
      <h2 class="about-hero-title">${escapeHtml(content.title)}</h2>
      <div class="about-hero-body left-align">${content.body}</div>
    `;
  } else {
    section.innerHTML = '<p>Error loading about content.</p>';
  }
  return section;
}

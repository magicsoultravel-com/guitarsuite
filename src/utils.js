export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

export async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

export function createSection(title, innerHtml) {
  const section = document.createElement('div');
  section.className = 'section';
  section.innerHTML = `<h2>${escapeHtml(title)}</h2>${innerHtml}`;
  return section;
}

export function renderFooter(container) {
  const year = new Date().getFullYear();
  container.innerHTML = `
    &copy; ${year} minimal website design inc.<br><br>
    <div class="bottom-login-status">
      <div class="user-status">Status: Logged out</div>
    </div>
  `;
}

export function autolink(text) {
  const urlPattern = /\b(?:https?:\/\/|www\.)\S+\b/g;
  return escapeHtml(text).replace(urlPattern, (url) => {
    const href = url.startsWith('http') ? url : `https://${url}`;
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(url)}</a>`;
  });
}

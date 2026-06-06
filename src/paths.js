/** Resolve a project-root path (e.g. "assets/songs.json") relative to the current page. */
export function asset(path) {
  const clean = path.replace(/^\//, '');
  return new URL(clean, document.baseURI).href;
}

export function page(name) {
  return new URL(name, document.baseURI).href;
}

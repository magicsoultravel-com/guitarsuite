/** Bump letter suffix (b→c→…→z) when shipping a new footer-visible release. */
export function bumpVersionLetter(version) {
  const match = String(version).match(/^(.*?)([a-z])$/i);
  if (!match) return version;
  const [, prefix, letter] = match;
  if (letter.toLowerCase() === 'z') return version;
  const next = String.fromCharCode(letter.charCodeAt(0) + 1);
  return `${prefix}${letter === letter.toUpperCase() ? next.toUpperCase() : next}`;
}

export const APP_VERSION = '0.1d';

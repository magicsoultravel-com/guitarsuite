const THEME_KEY = 'guitarsuite-theme';
const DEFAULT_THEME = 'dark';

export const THEMES = [
  { id: 'dark', label: 'Dark', swatches: ['#141414', '#a1a1aa', '#4a6b55'] },
  { id: 'light', label: 'Light', swatches: ['#f4f4f5', '#3f3f46', '#4a6b55'] },
  { id: 'neon', label: 'Neon', swatches: ['#050505', '#39ff14', '#ff00ff'] },
  { id: 'miami-vice', label: 'Miami Vice', swatches: ['#1a0a2e', '#ff2d95', '#00e5ff'] },
  { id: 'matrix', label: 'Matrix', swatches: ['#000000', '#00ff41', '#003b00'] },
  { id: 'cyan', label: 'Black + Cyan', swatches: ['#05080a', '#00e5ff', '#0a2a30'] },
  { id: 'forest', label: 'Forest', swatches: ['#0f1a12', '#6b8f71', '#c4a35a'] },
  { id: 'tropical', label: 'Tropical Beach', swatches: ['#1a4a5c', '#f2d7a0', '#2ec4b6'] },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

function normalizeTheme(id) {
  return THEME_IDS.has(id) ? id : DEFAULT_THEME;
}

export function getTheme() {
  return normalizeTheme(document.documentElement.dataset.theme || DEFAULT_THEME);
}

export function setTheme(id) {
  const theme = normalizeTheme(id);
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch { /* ignore */ }
  return theme;
}

export function initTheme() {
  let stored = DEFAULT_THEME;
  try {
    stored = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch { /* ignore */ }
  return setTheme(stored);
}

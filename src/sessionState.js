const SESSION_KEY = 'guitarsuite-session';

let sessionActive = false;
let restoring = false;

function readRaw() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isSessionInitialized() {
  return readRaw()?.initialized === true;
}

function writeSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function isRestoring() {
  return restoring;
}

/** Call after the user changes layout (expand, drag, collapse all, etc.). */
export function touchSession(modules) {
  if (restoring) return;
  sessionActive = true;
  writeSession({
    initialized: true,
    modules,
    savedAt: Date.now(),
  });
}

export function restoreSession(applyModules) {
  const data = readRaw();
  if (!data?.initialized || !data.modules) return;

  sessionActive = true;
  restoring = true;
  try {
    applyModules(data.modules);
  } finally {
    restoring = false;
  }
}

export function initSessionPersistence(collectModules) {
  window.addEventListener('beforeunload', () => {
    if (!sessionActive && !isSessionInitialized()) return;
    touchSession(collectModules());
  });
}

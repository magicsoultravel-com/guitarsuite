const SESSION_KEY = 'guitarsuite-session';
/** Bump when session shape changes; v1 had no version / no musical block. */
export const SESSION_VERSION = 2;

let sessionActive = false;
let restoring = false;
/** @type {() => object} */
let musicalCollector = () => ({});

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

/** Register collector for musical session fields (roots, song, manual notes). */
export function setMusicalCollector(fn) {
  musicalCollector = typeof fn === 'function' ? fn : () => ({});
}

/** Call after the user changes layout (expand, drag, collapse all, etc.). */
export function touchSession(modules, zoom = null, dockOrders = null) {
  if (restoring) return;
  sessionActive = true;
  const payload = {
    version: SESSION_VERSION,
    initialized: true,
    modules,
    zoom,
    musical: musicalCollector(),
    savedAt: Date.now(),
  };
  if (dockOrders) payload.dockOrders = dockOrders;
  writeSession(payload);
}

/**
 * @param {(modules: object, zoom: number, dockOrders: object) => void} applyModules
 * @param {(musical: object) => void} [applyMusical]
 */
export function restoreSession(applyModules, applyMusical) {
  const data = readRaw();
  if (!data?.initialized || !data.modules) return;

  sessionActive = true;
  restoring = true;
  try {
    applyModules(data.modules, data.zoom ?? 1, data.dockOrders ?? {});
    if (typeof applyMusical === 'function' && data.musical && typeof data.musical === 'object') {
      applyMusical(data.musical);
    }
  } finally {
    restoring = false;
  }
}

export function initSessionPersistence(collectModules, getZoom = () => 1, collectDockOrders = () => ({})) {
  window.addEventListener('beforeunload', () => {
    if (!sessionActive && !isSessionInitialized()) return;
    touchSession(collectModules(), getZoom(), collectDockOrders());
  });
}

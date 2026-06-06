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
export function touchSession(modules, zoom = null, dockOrders = null) {
  if (restoring) return;
  sessionActive = true;
  const payload = {
    initialized: true,
    modules,
    zoom,
    savedAt: Date.now(),
  };
  if (dockOrders) payload.dockOrders = dockOrders;
  writeSession(payload);
}

export function restoreSession(applyModules) {
  const data = readRaw();
  if (!data?.initialized || !data.modules) return;

  sessionActive = true;
  restoring = true;
  try {
    applyModules(data.modules, data.zoom ?? 1, data.dockOrders ?? {});
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

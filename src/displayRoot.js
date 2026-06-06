import { getRoot, normalizePitch } from './music.js';

export const DEFAULT_DISPLAY_ROOT = 'E';

/** Root used for lists/theory when none is committed yet (preview). */
export function getDisplayRoot(hub) {
  return hub.getRoot() || DEFAULT_DISPLAY_ROOT;
}

export function hasCommittedRoot(hub) {
  return Boolean(hub.getRoot());
}

export function inferRootFromChord(name, chordsJson) {
  if (!name) return '';
  const fromData = normalizePitch(chordsJson?.[name]?.root);
  if (fromData) return fromData;
  return normalizePitch(getRoot(name));
}

/** Align committed root to the current selection. */
export function commitRoot(hub, root) {
  const r = normalizePitch(root);
  if (!r) return '';
  hub.setRoot(r);
  return r;
}

export function commitRootFromChord(hub, chordName, chordsJson) {
  return commitRoot(hub, inferRootFromChord(chordName, chordsJson));
}

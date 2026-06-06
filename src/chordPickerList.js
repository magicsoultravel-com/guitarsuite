import { CHROMATIC, getRoot, musicalSort, normalizePitch } from './music.js';
import { THEORY_SUFFIX } from './chordVoicings.js';

export function theoryChordNamesAtRoot(root, chordsJson) {
  return Object.values(THEORY_SUFFIX)
    .map((suffix) => root + suffix)
    .filter((name) => chordsJson[name]?.variant1);
}

export function resolveStoredChordRoot(name, data) {
  const fromData = normalizePitch(data?.root);
  if (fromData && CHROMATIC.includes(fromData)) return fromData;
  return normalizePitch(getRoot(name.split('/')[0]));
}

/** Theory types (17) plus hand-curated database shapes at this root (slash chords, etc.). */
export function listPickerChordsAtRoot(root, chordsJson, curatedKeys) {
  const theory = theoryChordNamesAtRoot(root, chordsJson);
  const theorySet = new Set(theory);
  const curated = curatedKeys instanceof Set ? curatedKeys : new Set(curatedKeys || []);

  const extras = [...curated]
    .filter((name) => {
      if (theorySet.has(name) || !chordsJson[name]?.variant1) return false;
      return resolveStoredChordRoot(name, chordsJson[name]) === root;
    })
    .sort(musicalSort);

  return { theory, extras };
}

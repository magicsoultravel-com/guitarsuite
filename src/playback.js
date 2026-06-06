import { playPitch } from './audio.js';
import {
  getChordNotes,
  getScaleNotes,
  getTheoryNotes,
  normalizePitch,
  sortNotesByMusicalOrder,
} from './music.js';

const SOUND_KEY = 'guitarsuite-sound-enabled';
const FOCUS_KEY = 'guitarsuite-focus-modules';

const STRING_OCTAVES = { E: 2, A: 2, D: 3, G: 3, B: 3, e: 4 };

let soundEnabled = loadBool(SOUND_KEY, true);
let focusModules = loadBool(FOCUS_KEY, false);
let sequenceId = 0;
const soundListeners = new Set();

function loadBool(key, defaultValue) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return defaultValue;
    return v === '1' || v === 'true';
  } catch {
    return defaultValue;
  }
}

function saveBool(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch { /* ignore */ }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function octaveFromFret(stringName, fret) {
  const f = Number(fret) || 0;
  const base = STRING_OCTAVES[stringName] ?? 4;
  if (f <= 0) return base;
  return base + Math.floor(f / 12);
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(on) {
  soundEnabled = !!on;
  saveBool(SOUND_KEY, soundEnabled);
  soundListeners.forEach((fn) => fn(soundEnabled));
}

export function subscribeSound(fn) {
  soundListeners.add(fn);
  return () => soundListeners.delete(fn);
}

export function isFocusModules() {
  return focusModules;
}

export function setFocusModules(on) {
  focusModules = !!on;
  document.body.classList.toggle('focus-modules', focusModules);
  saveBool(FOCUS_KEY, focusModules);
}

export function initPlayback() {
  document.body.classList.toggle('focus-modules', focusModules);
}

export function playNote(pitch, octave = 4) {
  if (!soundEnabled) return;
  sequenceId += 1;
  const p = normalizePitch(pitch);
  if (!p) return;
  playPitch(p, octave);
}

export function playFretNote(stringName, fret, pitch) {
  playNote(pitch, octaveFromFret(stringName, fret));
}

async function runSequence(pitches, gapMs, octave = 4) {
  if (!soundEnabled || !pitches.length) return;
  const id = ++sequenceId;
  for (const pitch of pitches) {
    if (id !== sequenceId) return;
    const p = normalizePitch(pitch);
    if (!p) continue;
    playPitch(p, octave);
    await sleep(gapMs);
  }
}

export function playChord(notes) {
  const unique = sortNotesByMusicalOrder([...new Set(notes.map(normalizePitch).filter(Boolean))]);
  runSequence(unique, 150);
}

export function playScale(notes) {
  const ordered = notes.map(normalizePitch).filter(Boolean);
  runSequence(ordered, 130);
}

export function playLayerSelection(layer, hub, { chordsJson, scalesJson, chordsTheory } = {}) {
  if (!layer) return;
  const { label, notes } = layer;
  const root = hub.getRoot();

  if (label === 'manual') {
    playChord([...notes]);
    return;
  }
  if (chordsJson?.[label]) {
    playChord([...notes]);
    return;
  }
  if (scalesJson?.[label]) {
    playScale(getScaleNotes(root, scalesJson[label].steps));
    return;
  }
  if (chordsTheory?.[label]) {
    playChord(getTheoryNotes(root, chordsTheory[label].intervals));
    return;
  }
  if (notes.size === 1) {
    playNote([...notes][0]);
    return;
  }
  playChord([...notes]);
}

export function playChordByName(name, chordsJson, notesJson) {
  const variant = chordsJson[name]?.variant1;
  if (!variant) return;
  playChord(getChordNotes(variant, notesJson));
}

export function playScaleByName(name, root, scalesJson) {
  const steps = scalesJson[name]?.steps;
  if (!steps) return;
  playScale(getScaleNotes(root, steps));
}

export function playTheoryType(type, root, chordsTheory) {
  const data = chordsTheory[type];
  if (!data) return;
  playChord(getTheoryNotes(root, data.intervals));
}

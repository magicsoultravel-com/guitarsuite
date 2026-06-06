import { playPitch } from './audio.js';
import { getVoicedChord } from './chordResolve.js';
import { DEFAULT_DISPLAY_ROOT } from './displayRoot.js';
import {
  getScaleNotesWithOctaves,
  getTheoryNotes,
  normalizePitch,
  pitchToIndex,
  sortNotesByMusicalOrder,
} from './music.js';

const SOUND_KEY = 'guitarsuite-sound-enabled';
const FOCUS_KEY = 'guitarsuite-focus-modules';

/** Comfortable chord playback register (E3–G5). */
export const GUITAR_OCTAVE = 4;
export const GUITAR_OCTAVE_HIGH = 5;
const PLAY_MIN_MIDI = 52;
const PLAY_MAX_MIDI = 79;

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

function clampGuitarOctave(octave) {
  return Math.min(GUITAR_OCTAVE_HIGH, Math.max(GUITAR_OCTAVE - 1, octave));
}

function octaveFromFret(stringName, fret) {
  const f = Number(fret) || 0;
  const base = STRING_OCTAVES[stringName] ?? GUITAR_OCTAVE;
  if (f <= 0) return base;
  return base + Math.floor(f / 12);
}

function pitchOctaveToMidi(pitch, octave) {
  const idx = pitchToIndex(pitch);
  if (idx < 0) return null;
  return (octave + 1) * 12 + idx;
}

function spreadNotesInRange(pitches, minMidi = PLAY_MIN_MIDI, maxMidi = PLAY_MAX_MIDI) {
  if (!pitches.length) return [];
  const entries = [];
  let lastMidi = minMidi - 1;
  for (const pitch of pitches) {
    let octave = GUITAR_OCTAVE;
    let midi = pitchOctaveToMidi(pitch, octave);
    while (midi != null && midi <= lastMidi && octave < 6) {
      octave += 1;
      midi = pitchOctaveToMidi(pitch, octave);
    }
    while (midi != null && midi < minMidi && octave < 6) {
      octave += 1;
      midi = pitchOctaveToMidi(pitch, octave);
    }
    while (midi != null && midi > maxMidi && octave > 2) {
      octave -= 1;
      midi = pitchOctaveToMidi(pitch, octave);
    }
    entries.push({ pitch, octave: octave ?? GUITAR_OCTAVE });
    if (midi != null) lastMidi = midi;
  }
  return entries;
}

function normalizeVoicedForPlayback(voiced) {
  if (!voiced.length) return [];
  const midis = voiced.map(({ string, fret, pitch }) => ({
    pitch,
    midi: pitchOctaveToMidi(pitch, octaveFromFret(string, fret)),
  })).filter((e) => e.midi != null);
  if (!midis.length) return [];
  let shift = 0;
  const minMidi = Math.min(...midis.map((e) => e.midi));
  if (minMidi < PLAY_MIN_MIDI) shift = PLAY_MIN_MIDI - minMidi;
  const maxMidi = Math.max(...midis.map((e) => e.midi + shift));
  if (maxMidi > PLAY_MAX_MIDI) shift -= maxMidi - PLAY_MAX_MIDI;
  return midis.map(({ pitch, midi }) => ({
    pitch,
    octave: Math.floor((midi + shift) / 12) - 1,
  }));
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

export function playNote(pitch, octave = GUITAR_OCTAVE) {
  if (!soundEnabled) return;
  sequenceId += 1;
  const p = normalizePitch(pitch);
  if (!p) return;
  playPitch(p, clampGuitarOctave(octave));
}

export function playFretNote(stringName, fret, pitch) {
  playNote(pitch, clampGuitarOctave(octaveFromFret(stringName, fret)));
}

async function runSequence(pitches, gapMs, octave = GUITAR_OCTAVE) {
  if (!soundEnabled || !pitches.length) return;
  const id = ++sequenceId;
  const oct = clampGuitarOctave(octave);
  for (const pitch of pitches) {
    if (id !== sequenceId) return;
    const p = normalizePitch(pitch);
    if (!p) continue;
    playPitch(p, oct);
    await sleep(gapMs);
  }
}

async function runPitchOctaveSequence(entries, gapMs) {
  if (!soundEnabled || !entries.length) return;
  const id = ++sequenceId;
  for (const { pitch, octave } of entries) {
    if (id !== sequenceId) return;
    const p = normalizePitch(pitch);
    if (!p) continue;
    playPitch(p, clampGuitarOctave(octave));
    await sleep(gapMs);
  }
}

export function playChord(notes) {
  const unique = sortNotesByMusicalOrder([...new Set(notes.map(normalizePitch).filter(Boolean))]);
  runPitchOctaveSequence(spreadNotesInRange(unique), 150);
}

/** Strum a database chord shape low → high in a consistent mid register. */
export function playVoicedChord(variant, notesJson) {
  if (!soundEnabled || !variant || !notesJson) return;
  const voiced = getVoicedChord(variant, notesJson);
  const entries = normalizeVoicedForPlayback(voiced);
  if (!entries.length) return;
  sequenceId += 1;
  const id = sequenceId;
  (async () => {
    for (const { pitch, octave } of entries) {
      if (id !== sequenceId) return;
      playPitch(normalizePitch(pitch), clampGuitarOctave(octave));
      await sleep(120);
    }
  })();
}

export function playScale(root, steps) {
  const entries = getScaleNotesWithOctaves(root || DEFAULT_DISPLAY_ROOT, steps, GUITAR_OCTAVE, GUITAR_OCTAVE_HIGH);
  runPitchOctaveSequence(entries, 130);
}

export function playLayerSelection(layer, hub, { chordsJson, scalesJson, chordsTheory, notesJson } = {}) {
  if (!layer) return;
  const { label, notes, shape, chordRef } = layer;
  const root = hub.getRoot();

  if (shape && notesJson) {
    playVoicedChord(shape, notesJson);
    return;
  }
  if (chordRef && chordsJson?.[chordRef]?.variant1 && notesJson) {
    playVoicedChord(chordsJson[chordRef].variant1, notesJson);
    return;
  }

  if (label === 'manual') {
    playChord([...notes]);
    return;
  }
  if (chordsJson?.[label]?.variant1 && notesJson) {
    playVoicedChord(chordsJson[label].variant1, notesJson);
    return;
  }
  if (scalesJson?.[label]) {
    playScale(root, scalesJson[label].steps);
    return;
  }
  if (chordsTheory?.[label]) {
    const resolved = resolveChordForPlayback(root, label, chordsTheory, chordsJson, notesJson);
    if (resolved?.variant) playVoicedChord(resolved.variant, notesJson);
    else playChord(getTheoryNotes(root, chordsTheory[label].intervals));
    return;
  }
  if (notes.size === 1) {
    playNote([...notes][0]);
    return;
  }
  playChord([...notes]);
}

function resolveChordForPlayback(root, theoryType, chordsTheory, chordsJson, notesJson) {
  const sym = chordsTheory[theoryType]?.short ? root + chordsTheory[theoryType].short.slice(1) : null;
  if (sym && chordsJson?.[sym]?.variant1) {
    return { variant: chordsJson[sym].variant1 };
  }
  return null;
}

export function playChordByName(name, chordsJson, notesJson) {
  const variant = chordsJson[name]?.variant1;
  if (!variant) return;
  playVoicedChord(variant, notesJson);
}

export function playScaleByName(name, root, scalesJson) {
  const steps = scalesJson[name]?.steps;
  if (!steps) return;
  playScale(root, steps);
}

export function playTheoryType(type, root, chordsTheory, chordsJson, notesJson) {
  const sym = chordsTheory[type]?.short ? root + chordsTheory[type].short.slice(1) : null;
  if (sym && chordsJson?.[sym]?.variant1 && notesJson) {
    playVoicedChord(chordsJson[sym].variant1, notesJson);
    return;
  }
  const data = chordsTheory[type];
  if (!data) return;
  playChord(getTheoryNotes(root, data.intervals));
}

export function playTriad(notes, symbol, chordsJson, notesJson) {
  if (symbol && chordsJson?.[symbol]?.variant1 && notesJson) {
    playVoicedChord(chordsJson[symbol].variant1, notesJson);
    return;
  }
  playChord(notes);
}

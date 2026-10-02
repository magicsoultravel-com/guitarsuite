import { CHROMATIC, getDiatonicTriads, musicalSort, normalizePitch } from '../../music.js';
import { isSoundEnabled, GUITAR_OCTAVE } from '../../playback.js';
import { getVoicedChord } from '../../chordResolve.js';
import { PERCUSSION_BANK, playPercussionVoice } from './percussion.js';
import { playPitchedInstrument, playPitchedChord } from '../voices.js';
import { INSTRUMENT_OPTIONS, clamp01 } from '../pattern.js';

export { PERCUSSION_BANK };

function spreadChordPitches(notes) {
  const unique = [...new Set(notes.map(normalizePitch).filter(Boolean))];
  return unique.map((pitch, i) => ({
    pitch,
    octave: 3 + Math.floor(i / 3),
  }));
}

function voicedEntries(chordName, chordsJson, notesJson) {
  const variant = chordsJson?.[chordName]?.variant1;
  if (!variant || !notesJson) return null;
  const voiced = getVoicedChord(variant, notesJson);
  if (!voiced?.length) return null;
  // getVoicedChord has pitch+string but not octave — spread register
  return spreadChordPitches(voiced.map((e) => e.pitch));
}

/**
 * Play channel hit with gain × velocity and instrument routing.
 */
export function playChannelHit(channel, when, velocity, ctx = {}) {
  if (!isSoundEnabled()) return;
  const gain = clamp01(channel.gain ?? 0.8);
  const vel = clamp01((velocity ?? 0.8) * gain);
  const type = channel.type || 'percussion';
  const instrumentId = channel.instrumentId || (type === 'percussion' ? '' : 'guitar');

  if (type === 'percussion') {
    playPercussionVoice(channel.voiceId || 'kick', when, vel);
    return;
  }

  if (type === 'note') {
    const pitch = channel.pitch || channel.voiceId || 'C';
    const octave = channel.octave ?? GUITAR_OCTAVE;
    playPitchedInstrument(instrumentId || 'guitar', pitch, octave, when, vel);
    return;
  }

  if (type === 'chord') {
    const { hub, chordsJson = {}, notesJson = {}, scalesJson = {} } = ctx;
    const inst = instrumentId || 'keys-pluck';

    if (channel.chordMode === 'degree') {
      const root = hub?.getRoot?.() || 'C';
      const scaleKey = channel.scaleKey || 'Ionian';
      const steps = scalesJson[scaleKey]?.steps;
      if (!steps) return;
      const triads = getDiatonicTriads(root, steps);
      const triad = triads[channel.degree ?? 0];
      if (!triad?.notes?.length) return;

      const voiced = voicedEntries(triad.symbol, chordsJson, notesJson);
      const entries = voiced || spreadChordPitches(triad.notes);
      playPitchedChord(inst, entries, when, vel);
      return;
    }

    const name = channel.chordName || channel.voiceId;
    if (!name) return;
    const voiced = voicedEntries(name, chordsJson, notesJson);
    if (voiced) {
      playPitchedChord(inst, voiced, when, vel);
    }
  }
}

export function noteVoiceOptions() {
  return CHROMATIC.map((p) => ({ id: p, label: p }));
}

export function chordNameOptions(chordsJson, curatedKeys = null) {
  const names = [...(curatedKeys ?? new Set(Object.keys(chordsJson || {})))]
    .filter((name) => chordsJson?.[name]?.variant1)
    .sort(musicalSort);
  return names.map((name) => ({ id: name, label: name }));
}

export function scaleOptions(scalesJson) {
  return Object.keys(scalesJson || {}).map((key) => ({ id: key, label: key }));
}

export function degreeOptions(root, scaleKey, scalesJson) {
  const steps = scalesJson?.[scaleKey]?.steps;
  if (!steps) return [];
  const triads = getDiatonicTriads(root || 'C', steps);
  return triads.map((t, i) => ({
    id: String(i),
    label: `${t.roman} (${t.symbol})`,
    degree: i,
  }));
}

export function percussionVoiceOptions() {
  return PERCUSSION_BANK.voices.map((v) => ({ id: v.id, label: v.label }));
}

export function pitchedInstrumentOptions(type) {
  const bank = type === 'chord' ? 'chord' : 'note';
  return INSTRUMENT_OPTIONS
    .filter((o) => o.banks.includes(bank))
    .map((o) => ({ id: o.id, label: o.label }));
}

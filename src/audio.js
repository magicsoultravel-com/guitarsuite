import { normalizePitch, pitchToIndex } from './music.js';

let audioCtx = null;
let masterGain = null;

/** Shared AudioContext; resumes on first use (call from a user gesture). */
export function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Master bus — all voices connect here before destination. */
export function getMasterBus() {
  const ctx = getAudioContext();
  if (!masterGain || masterGain.context !== ctx) {
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

function connectVoice(gainNode) {
  gainNode.connect(getMasterBus());
}

/**
 * Metronome click.
 * @param {boolean} accent
 * @param {number} [when] AudioContext time (default: now)
 */
export function playTick(accent = false, when) {
  const ctx = getAudioContext();
  const t = when ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 1000 : 700;
  gain.gain.setValueAtTime(accent ? 0.12 : 0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain);
  connectVoice(gain);
  osc.start(t);
  osc.stop(t + 0.04);
}

/**
 * Play a pitch class (e.g. "A", "C#") at the given octave.
 * @param {string} pitch
 * @param {number} [octave]
 * @param {number} [when] AudioContext time (default: now)
 * @param {number} [duration] seconds (default: 1.2)
 */
export function playPitch(pitch, octave = 4, when, duration = 1.2) {
  const idx = pitchToIndex(pitch);
  if (idx < 0) return;
  const midi = 60 + (octave - 4) * 12 + idx;
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const ctx = getAudioContext();
  const t = when ?? ctx.currentTime;
  const dur = Math.max(0.05, duration);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(gain);
  connectVoice(gain);
  osc.start(t);
  osc.stop(t + dur);
}

/** Standard guitar tuning low → high. */
export const STANDARD_TUNING = [
  { label: 'E', pitch: 'E', octave: 2 },
  { label: 'A', pitch: 'A', octave: 2 },
  { label: 'D', pitch: 'D', octave: 3 },
  { label: 'G', pitch: 'G', octave: 3 },
  { label: 'B', pitch: 'B', octave: 3 },
  { label: 'e', pitch: 'E', octave: 4 },
];

export function playStandardString(index, when) {
  const entry = STANDARD_TUNING[index];
  if (entry) playPitch(entry.pitch, entry.octave, when);
}

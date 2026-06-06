import { normalizePitch, pitchToIndex } from './music.js';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playTick(accent = false) {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.value = accent ? 1000 : 700;
  gain.gain.setValueAtTime(accent ? 0.12 : 0.07, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.04);
}

/** Play a pitch (e.g. "A", "C#") at octave 3–5. */
export function playPitch(pitch, octave = 4) {
  const idx = pitchToIndex(pitch);
  if (idx < 0) return;
  const midi = 60 + (octave - 4) * 12 + idx;
  const freq = 440 * 2 ** ((midi - 69) / 12);
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.2, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 1.2);
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

export function playStandardString(index) {
  const entry = STANDARD_TUNING[index];
  if (entry) playPitch(entry.pitch, entry.octave);
}

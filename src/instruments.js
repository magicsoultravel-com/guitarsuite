/**
 * Thin oscillator instruments behind a stable API for the sequencer.
 * All voices route through the master bus in audio.js.
 */
import { playTick, playPitch } from './audio.js';
import { normalizePitch } from './music.js';
export {
  playKick,
  playSnare,
  playClosedHat,
  playOpenHat,
  playClap,
  playTom,
  playHiTom,
  playMidTom,
  playRim,
  playCowbell,
  playShaker,
  playRide,
  playCrash,
  playBassSub,
  playKeysPluck,
} from './magicBeatz/voices.js';

export function playMetronomeClick(accent = false, when) {
  playTick(accent, when);
}

/**
 * @param {{ pitch: string, octave?: number, when?: number, duration?: number }} opts
 */
export function playTone({ pitch, octave = 4, when, duration = 1.2 }) {
  const p = normalizePitch(pitch);
  if (!p) return;
  playPitch(p, octave, when, duration);
}

/**
 * Schedule a short guitar-ish note (used by looper / step sequencer).
 * @param {string} pitch
 * @param {number} [octave]
 * @param {number} [when]
 */
export function playGuitarNote(pitch, octave = 4, when) {
  playTone({ pitch, octave, when, duration: 0.55 });
}

/**
 * Schedule a strum: notes at staggered audio times from `when`.
 * @param {Array<{ pitch: string, octave?: number }>} entries
 * @param {number} [when]
 * @param {number} [gapSec] seconds between string hits
 */
export function playScheduledStrum(entries, when, gapSec = 0.05) {
  if (!entries?.length) return;
  const base = when;
  entries.forEach((entry, i) => {
    const t = base == null ? undefined : base + i * gapSec;
    playTone({
      pitch: entry.pitch,
      octave: entry.octave ?? 4,
      when: t,
      duration: 0.7,
    });
  });
}

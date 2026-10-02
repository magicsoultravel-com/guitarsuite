import { getAudioContext } from './audio.js';

const LOOKAHEAD_SEC = 0.1;
const SCHEDULE_AHEAD_SEC = 0.25;

/**
 * AudioContext lookahead beat transport (replaces setInterval).
 * onBeat(beat, beatsPerMeasure, when) — `when` is AudioContext time for scheduling.
 *
 * @param {{ getBpm: () => number, getBeatsPerMeasure: () => number, onBeat: (beat: number, beats: number, when: number) => void }} opts
 */
export function createTransport({ getBpm, getBeatsPerMeasure, onBeat }) {
  let timerId = null;
  let nextNoteTime = 0;
  let currentBeat = 0;
  let running = false;

  function secondsPerBeat() {
    const bpm = getBpm();
    if (!bpm || bpm <= 0) return 0;
    return 60 / bpm;
  }

  function schedule() {
    if (!running) return;
    const ctx = getAudioContext();
    const spb = secondsPerBeat();
    if (!spb) {
      stop();
      return;
    }

    while (nextNoteTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      const beats = Math.max(1, getBeatsPerMeasure() || 4);
      currentBeat = currentBeat >= beats ? 1 : currentBeat + 1;
      const when = nextNoteTime;
      try {
        onBeat(currentBeat, beats, when);
      } catch (err) {
        console.error(err);
      }
      nextNoteTime += spb;
    }
  }

  function tick() {
    schedule();
    if (running) {
      timerId = window.setTimeout(tick, LOOKAHEAD_SEC * 1000);
    }
  }

  function stop() {
    running = false;
    if (timerId != null) {
      clearTimeout(timerId);
      timerId = null;
    }
    currentBeat = 0;
  }

  return {
    isRunning() {
      return running;
    },

    start() {
      stop();
      const spb = secondsPerBeat();
      if (!spb) return false;
      const ctx = getAudioContext();
      running = true;
      currentBeat = 0;
      nextNoteTime = ctx.currentTime + 0.05;
      tick();
      return true;
    },

    stop,
  };
}

/** @deprecated use createTransport — kept as alias for older call sites */
export function createBeatScheduler({ getIntervalMs, getBeatsPerMeasure, onBeat }) {
  return createTransport({
    getBpm: () => {
      const ms = getIntervalMs?.();
      if (!ms || ms <= 0) return 0;
      return 60000 / ms;
    },
    getBeatsPerMeasure,
    onBeat: (beat, beats, when) => onBeat(beat, beats, when),
  });
}

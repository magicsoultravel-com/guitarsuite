/** Simple beat interval driver shared by metronome and looper. */
export function createBeatScheduler({ getIntervalMs, getBeatsPerMeasure, onBeat }) {
  let intervalId = null;
  let currentBeat = 0;

  function tick() {
    const beats = getBeatsPerMeasure();
    currentBeat = currentBeat >= beats ? 1 : currentBeat + 1;
    onBeat(currentBeat, beats);
  }

  return {
    isRunning() {
      return intervalId !== null;
    },

    start() {
      this.stop();
      const interval = getIntervalMs();
      if (!interval) return false;
      currentBeat = 0;
      tick();
      intervalId = setInterval(tick, interval);
      return true;
    },

    stop() {
      if (intervalId !== null) clearInterval(intervalId);
      intervalId = null;
      currentBeat = 0;
    },
  };
}

import { createSection } from '../utils.js';
import { CHROMATIC } from '../music.js';
import { playTick, playPitch, playStandardString, STANDARD_TUNING } from '../audio.js';

export function renderTools() {
  const noteOptions = CHROMATIC.map((n) => `<option value="${n}">${n}</option>`).join('');
  const stringOptions = STANDARD_TUNING.map(
    (t, i) => `<option value="${i}">${t.label} (${t.octave})</option>`
  ).join('');

  const section = createSection('tools', `
    <div class="tools-block">
      <h3>metronome</h3>
      <div class="tools-row">
        <button type="button" class="tool-btn-sm bpm-step" data-delta="-5">−5</button>
        <button type="button" class="tool-btn-sm bpm-step" data-delta="-1">−</button>
        <input type="number" id="tempo" class="input-bpm" value="120" min="30" max="250">
        <button type="button" class="tool-btn-sm bpm-step" data-delta="1">+</button>
        <button type="button" class="tool-btn-sm bpm-step" data-delta="5">+5</button>
        <select id="time-signature" class="select-compact" title="Time signature">
          <option value="4/4">4/4</option>
          <option value="3/4">3/4</option>
          <option value="6/8">6/8</option>
        </select>
        <button type="button" class="tool-btn-sm" id="start-metronome" title="Start">▶</button>
        <button type="button" class="tool-btn-sm" id="stop-metronome" title="Stop" disabled>■</button>
      </div>
    </div>
    <div class="tools-block">
      <h3>tuner</h3>
      <div class="tools-row">
        <select id="tuner-note" class="select-compact">${noteOptions}</select>
        <select id="tuner-octave" class="select-compact">
          <option value="3">oct 3</option>
          <option value="4" selected>oct 4</option>
          <option value="5">oct 5</option>
        </select>
        <button type="button" class="tool-btn-sm" id="play-note" title="Play note">♪</button>
      </div>
      <div class="tools-row">
        <select id="tuner-string" class="select-compact">${stringOptions}</select>
        <button type="button" class="tool-btn-sm" id="play-string" title="Play string">♪</button>
      </div>
    </div>
  `);

  const tempoInput = section.querySelector('#tempo');
  const timeSignatureSelect = section.querySelector('#time-signature');
  const startButton = section.querySelector('#start-metronome');
  const stopButton = section.querySelector('#stop-metronome');

  let intervalId = null;
  let currentBeat = 0;
  let beatsPerMeasure = 4;

  function clampBpm(val) {
    return Math.min(250, Math.max(30, val));
  }

  section.querySelectorAll('.bpm-step').forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta, 10);
      tempoInput.value = clampBpm(parseInt(tempoInput.value, 10) + delta);
    });
  });

  function calculateInterval() {
    const tempo = parseInt(tempoInput.value, 10);
    if (isNaN(tempo) || tempo <= 0) return 0;
    return (60 / tempo) * 1000;
  }

  function updateTimeSignature() {
    beatsPerMeasure = parseInt(timeSignatureSelect.value.split('/')[0], 10);
  }

  function metronomeBeat() {
    currentBeat = currentBeat >= beatsPerMeasure ? 1 : currentBeat + 1;
    playTick(currentBeat === 1);
  }

  function startMetronome() {
    if (intervalId !== null) clearInterval(intervalId);
    updateTimeSignature();
    currentBeat = 0;
    const interval = calculateInterval();
    if (interval > 0) {
      metronomeBeat();
      intervalId = setInterval(metronomeBeat, interval);
      startButton.disabled = true;
      stopButton.disabled = false;
    }
  }

  function stopMetronome() {
    clearInterval(intervalId);
    intervalId = null;
    startButton.disabled = false;
    stopButton.disabled = true;
    currentBeat = 0;
  }

  startButton.addEventListener('click', startMetronome);
  stopButton.addEventListener('click', stopMetronome);
  timeSignatureSelect.addEventListener('change', updateTimeSignature);

  section.querySelector('#play-note').addEventListener('click', () => {
    playPitch(
      section.querySelector('#tuner-note').value,
      parseInt(section.querySelector('#tuner-octave').value, 10)
    );
  });

  section.querySelector('#play-string').addEventListener('click', () => {
    playStandardString(parseInt(section.querySelector('#tuner-string').value, 10));
  });

  return section;
}

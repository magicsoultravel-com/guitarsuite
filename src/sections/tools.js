import { createSection } from '../utils.js';
import { CHROMATIC } from '../music.js';
import { playTick, playPitch, playStandardString, STANDARD_TUNING } from '../audio.js';

export function renderTools() {
  const noteButtons = CHROMATIC.map(
    (n) => `<button type="button" class="tuner-note" data-note="${n}">${n}</button>`
  ).join('');

  const stringButtons = STANDARD_TUNING.map(
    (t, i) => `<button type="button" class="tuner-string" data-tuning-idx="${i}">${t.label}<sub>${t.octave}</sub></button>`
  ).join('');

  const section = createSection('tools', `
    <div class="tools-block">
      <h3>metronome</h3>
      <div class="tools-row">
        <label for="tempo">BPM</label>
        <input type="number" id="tempo" value="120" min="30" max="250">
        <select id="time-signature" title="Time signature">
          <option value="4/4">4/4</option>
          <option value="3/4">3/4</option>
          <option value="6/8">6/8</option>
        </select>
        <button type="button" id="start-metronome">▶</button>
        <button type="button" id="stop-metronome" disabled>■</button>
      </div>
    </div>
    <div class="tools-block">
      <h3>tuner</h3>
      <p class="fb-hint">Click a note or open string to play.</p>
      <div class="tuner-notes">${noteButtons}</div>
      <div class="tuner-strings">
        <span class="tuner-label">standard</span>
        ${stringButtons}
      </div>
      <div class="tools-row">
        <label for="tuner-octave">Octave</label>
        <select id="tuner-octave">
          <option value="3">3</option>
          <option value="4" selected>4</option>
          <option value="5">5</option>
        </select>
      </div>
    </div>
  `);

  const tempoInput = section.querySelector('#tempo');
  const timeSignatureSelect = section.querySelector('#time-signature');
  const startButton = section.querySelector('#start-metronome');
  const stopButton = section.querySelector('#stop-metronome');
  const octaveSelect = section.querySelector('#tuner-octave');

  let intervalId = null;
  let currentBeat = 0;
  let beatsPerMeasure = 4;

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

  section.querySelectorAll('.tuner-note').forEach((btn) => {
    btn.addEventListener('click', () => {
      playPitch(btn.dataset.note, parseInt(octaveSelect.value, 10));
    });
  });

  section.querySelectorAll('.tuner-string').forEach((btn) => {
    btn.addEventListener('click', () => playStandardString(parseInt(btn.dataset.tuningIdx, 10)));
  });

  return section;
}

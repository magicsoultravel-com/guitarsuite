import { createSection } from '../utils.js';

export function renderMetronome() {
  const section = createSection('metronome', `
    <div>
      <label for="tempo">Tempo (BPM):</label>
      <input type="number" id="tempo" value="120" min="30" max="250">
      <label for="time-signature">Time Signature:</label>
      <select id="time-signature">
        <option value="4/4">4/4</option>
        <option value="3/4">3/4</option>
        <option value="6/8">6/8</option>
      </select>
      <label for="note-value">Note Value:</label>
      <select id="note-value">
        <option value="quarter">Quarter Note</option>
        <option value="eighth">Eighth Note</option>
        <option value="sixteenth">Sixteenth Note</option>
      </select>
      <button id="start-metronome">Start</button>
      <button id="stop-metronome" disabled>Stop</button>
      <div id="metronome-display"></div>
    </div>
  `);

  const tempoInput = section.querySelector('#tempo');
  const timeSignatureSelect = section.querySelector('#time-signature');
  const noteValueSelect = section.querySelector('#note-value');
  const startButton = section.querySelector('#start-metronome');
  const stopButton = section.querySelector('#stop-metronome');
  const metronomeDisplay = section.querySelector('#metronome-display');

  let intervalId = null;
  let currentBeat = 0;
  let beatsPerMeasure = 4;

  function calculateInterval() {
    const tempo = parseInt(tempoInput.value, 10);
    if (isNaN(tempo) || tempo <= 0) return 0;
    let ms = (60 / tempo) * 1000;
    if (noteValueSelect.value === 'eighth') ms /= 2;
    else if (noteValueSelect.value === 'sixteenth') ms /= 4;
    return ms;
  }

  function updateTimeSignature() {
    beatsPerMeasure = parseInt(timeSignatureSelect.value.split('/')[0], 10);
  }

  function metronomeBeat() {
    currentBeat = currentBeat >= beatsPerMeasure ? 1 : currentBeat + 1;
    metronomeDisplay.textContent = 'TOCK';
    setTimeout(() => { metronomeDisplay.textContent = ''; }, 100);
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
    metronomeDisplay.textContent = '';
    currentBeat = 0;
  }

  startButton.addEventListener('click', startMetronome);
  stopButton.addEventListener('click', stopMetronome);
  timeSignatureSelect.addEventListener('change', updateTimeSignature);

  return section;
}

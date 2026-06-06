import { CHROMATIC } from '../music.js';
import { playTick, playPitch, playStandardString, STANDARD_TUNING } from '../audio.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

export function renderToolsDock() {
  const el = document.createElement('div');
  el.id = 'tools-dock';
  el.className = 'tools-dock';

  const noteOptions = CHROMATIC.map((n) => `<option value="${n}">${n}</option>`).join('');
  const stringOptions = STANDARD_TUNING.map(
    (t, i) => `<option value="${i}">${t.label} (${t.octave})</option>`
  ).join('');

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub tools-bar-summary">Metronome · Tuner</span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel tools-panel" hidden>
      <div class="tools-stack">
        <div class="dock-section tools-block">
          <span class="dock-section-label">Metronome</span>
          <div class="tools-controls-col">
            <div class="tools-inline">
              <button type="button" class="dock-nav-btn bpm-step" data-delta="-5">−5</button>
              <button type="button" class="dock-nav-btn bpm-step" data-delta="-1">−</button>
              <input type="number" id="tempo" class="input-bpm" value="120" min="30" max="250">
              <button type="button" class="dock-nav-btn bpm-step" data-delta="1">+</button>
              <button type="button" class="dock-nav-btn bpm-step" data-delta="5">+5</button>
            </div>
            <div class="tools-inline">
              <select id="time-signature" class="dock-select select-wide" title="Time signature">
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
              </select>
              <button type="button" class="dock-nav-btn" id="start-metronome" title="Start">▶</button>
              <button type="button" class="dock-nav-btn" id="stop-metronome" title="Stop" disabled>■</button>
            </div>
          </div>
        </div>
        <div class="dock-section tools-block">
          <span class="dock-section-label">Tuner</span>
          <div class="tools-controls-col">
            <div class="tools-inline">
              <select id="tuner-note" class="dock-select">${noteOptions}</select>
              <select id="tuner-octave" class="dock-select select-wide">
                <option value="3">oct 3</option>
                <option value="4" selected>oct 4</option>
                <option value="5">oct 5</option>
              </select>
              <button type="button" class="dock-nav-btn" id="play-note" title="Play note">♪</button>
            </div>
            <div class="tools-inline">
              <select id="tuner-string" class="dock-select select-wide">${stringOptions}</select>
              <button type="button" class="dock-nav-btn" id="play-string" title="Play string">♪</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  ensureDockChrome(el, 'tools', 'Tools');

  const summary = el.querySelector('.tools-bar-summary');
  const tempoInput = el.querySelector('#tempo');
  const timeSignatureSelect = el.querySelector('#time-signature');
  const startButton = el.querySelector('#start-metronome');
  const stopButton = el.querySelector('#stop-metronome');

  let intervalId = null;
  let currentBeat = 0;
  let beatsPerMeasure = 4;

  function clampBpm(val) {
    return Math.min(250, Math.max(30, val));
  }

  function updateSummary() {
    summary.textContent = `${tempoInput.value} BPM · ${timeSignatureSelect.value}`;
  }

  el.querySelectorAll('.bpm-step').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const delta = parseInt(btn.dataset.delta, 10);
      tempoInput.value = clampBpm(parseInt(tempoInput.value, 10) + delta);
      updateSummary();
    });
  });

  tempoInput.addEventListener('change', updateSummary);
  timeSignatureSelect.addEventListener('change', updateSummary);

  function calculateInterval() {
    const tempo = parseInt(tempoInput.value, 10);
    if (isNaN(tempo) || tempo <= 0) return 0;
    return (60 / tempo) * 1000;
  }

  function updateTimeSignature() {
    beatsPerMeasure = parseInt(timeSignatureSelect.value.split('/')[0], 10);
    updateSummary();
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

  startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMetronome();
  });
  stopButton.addEventListener('click', (e) => {
    e.stopPropagation();
    stopMetronome();
  });
  timeSignatureSelect.addEventListener('change', updateTimeSignature);

  el.querySelector('#play-note').addEventListener('click', (e) => {
    e.stopPropagation();
    playPitch(
      el.querySelector('#tuner-note').value,
      parseInt(el.querySelector('#tuner-octave').value, 10)
    );
  });

  el.querySelector('#play-string').addEventListener('click', (e) => {
    e.stopPropagation();
    playStandardString(parseInt(el.querySelector('#tuner-string').value, 10));
  });

  const { setExpanded } = wireDockExpand(el, {
    bodyClass: 'tools-expanded',
    moduleId: 'tools',
  });

  wireDockBarToggle(el, setExpanded, '.tools-stack, .dock-nav-btn, .dock-select, .input-bpm, .bpm-step');

  updateSummary();
  return el;
}

/** @deprecated use renderToolsDock via bottom dock */
export function renderTools() {
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.innerHTML = '<h2>tools</h2><p>Moved to the bottom dock.</p>';
  return wrap;
}

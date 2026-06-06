import { CHROMATIC, musicalSort } from '../music.js';
import { playTick, playPitch, playStandardString, STANDARD_TUNING } from '../audio.js';
import { playNote, playChordByName, GUITAR_OCTAVE } from '../playback.js';
import { createBeatScheduler } from '../beatScheduler.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

const MAX_TRACKS = 4;
const LOOPER_NOTE_OCTAVE = GUITAR_OCTAVE - 1;

export function renderToolsDock({ chordsJson = {}, notesJson = {}, curatedKeys = null } = {}) {
  const el = document.createElement('div');
  el.id = 'tools-dock';
  el.className = 'tools-dock';

  const chordNames = [...(curatedKeys ?? new Set(Object.keys(chordsJson)))]
    .filter((name) => chordsJson[name]?.variant1)
    .sort(musicalSort);

  function chordSelectOptions(selected = '') {
    const opts = ['<option value="">—</option>'];
    for (const name of chordNames) {
      opts.push(`<option value="${name}"${name === selected ? ' selected' : ''}>${name}</option>`);
    }
    return opts.join('');
  }

  function noteSelectOptions(selected = '') {
    const opts = ['<option value="">—</option>'];
    for (const n of CHROMATIC) {
      opts.push(`<option value="${n}"${n === selected ? ' selected' : ''}>${n}</option>`);
    }
    return opts.join('');
  }

  const noteOptions = CHROMATIC.map((n) => `<option value="${n}">${n}</option>`).join('');
  const stringOptions = STANDARD_TUNING.map(
    (t, i) => `<option value="${i}">${t.label} (${t.octave})</option>`
  ).join('');

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-sub tools-bar-summary">metronome · tuner</span>
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel tools-panel" hidden>
      <div class="tools-stack">
        <div class="dock-section tools-block">
          <span class="dock-section-label">metronome</span>
          <div class="tools-controls-col">
            <div class="tools-inline">
              <button type="button" class="tools-btn bpm-step" data-delta="-1" title="Slower">−</button>
              <input type="number" id="tempo" class="input-bpm" value="120" min="30" max="250">
              <button type="button" class="tools-btn bpm-step" data-delta="1" title="Faster">+</button>
            </div>
            <div class="tools-inline">
              <select id="time-signature" class="dock-select tools-select-sig" title="Time signature">
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
              </select>
              <button type="button" class="tools-btn" id="start-metronome" title="Start">▶</button>
              <button type="button" class="tools-btn" id="stop-metronome" title="Stop" disabled>■</button>
            </div>
          </div>
        </div>
        <hr class="tools-rule" aria-hidden="true">
        <div class="dock-section tools-block tools-block--looper">
          <span class="dock-section-label">looper</span>
          <div class="tools-controls-col">
            <div class="tools-inline looper-toolbar">
              <select id="looper-tracks" class="dock-select tools-select-narrow" title="Layers (each row = full bar)">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <div class="tools-segment" role="group" aria-label="Chords or notes">
                <button type="button" class="tools-segment-btn is-active" data-looper-mode="chord">chords</button>
                <button type="button" class="tools-segment-btn" data-looper-mode="note">notes</button>
              </div>
              <button type="button" class="tools-btn" id="start-looper" title="Start looper">▶</button>
              <button type="button" class="tools-btn" id="stop-looper" title="Stop looper" disabled>■</button>
            </div>
            <div id="looper-slots" class="looper-slots"></div>
          </div>
        </div>
        <hr class="tools-rule" aria-hidden="true">
        <div class="dock-section tools-block">
          <span class="dock-section-label">tuner</span>
          <div class="tools-controls-col">
            <div class="tools-inline">
              <select id="tuner-note" class="dock-select">${noteOptions}</select>
              <select id="tuner-octave" class="dock-select select-wide">
                <option value="3">oct 3</option>
                <option value="4" selected>oct 4</option>
                <option value="5">oct 5</option>
              </select>
              <button type="button" class="tools-btn" id="play-note" title="Play note">♪</button>
            </div>
            <div class="tools-inline">
              <select id="tuner-string" class="dock-select select-wide">${stringOptions}</select>
              <button type="button" class="tools-btn" id="play-string" title="Play string">♪</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  ensureDockChrome(el, 'tools', 'tools');

  const summary = el.querySelector('.tools-bar-summary');
  const tempoInput = el.querySelector('#tempo');
  const timeSignatureSelect = el.querySelector('#time-signature');
  const metronomeStart = el.querySelector('#start-metronome');
  const metronomeStop = el.querySelector('#stop-metronome');
  const looperStart = el.querySelector('#start-looper');
  const looperStop = el.querySelector('#stop-looper');
  const looperTracksSelect = el.querySelector('#looper-tracks');
  const looperSlots = el.querySelector('#looper-slots');
  const modeButtons = el.querySelectorAll('[data-looper-mode]');

  let beatsPerMeasure = 4;
  let looperMode = 'chord';

  function clampBpm(val) {
    return Math.min(250, Math.max(30, val));
  }

  function getIntervalMs() {
    const tempo = parseInt(tempoInput.value, 10);
    if (isNaN(tempo) || tempo <= 0) return 0;
    return (60 / tempo) * 1000;
  }

  function getBeatsPerMeasure() {
    return beatsPerMeasure;
  }

  function updateSummary() {
    summary.textContent = `${tempoInput.value} BPM · ${timeSignatureSelect.value}`;
  }

  function slotOptionsHtml(value) {
    return looperMode === 'note' ? noteSelectOptions(value) : chordSelectOptions(value);
  }

  function getTrackCount() {
    return parseInt(looperTracksSelect.value, 10) || 1;
  }

  function readSlotState() {
    const state = [];
    for (let t = 0; t < MAX_TRACKS; t += 1) {
      const track = [];
      for (let b = 0; b < beatsPerMeasure; b += 1) {
        const sel = looperSlots.querySelector(`[data-track="${t}"][data-beat="${b}"]`);
        track.push(sel?.value || '');
      }
      state.push(track);
    }
    return state;
  }

  function playSlotValue(value) {
    if (!value) return;
    if (looperMode === 'note') playNote(value, LOOPER_NOTE_OCTAVE);
    else playChordByName(value, chordsJson, notesJson);
  }

  function highlightBeat(beat) {
    looperSlots.querySelectorAll('.looper-slot').forEach((sel) => {
      const selBeat = parseInt(sel.dataset.beat, 10) + 1;
      sel.classList.toggle('is-active', selBeat === beat);
    });
  }

  function clearBeatHighlight() {
    looperSlots.querySelectorAll('.looper-slot.is-active').forEach((sel) => {
      sel.classList.remove('is-active');
    });
  }

  function setLooperMode(mode) {
    looperMode = mode;
    modeButtons.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.looperMode === mode);
    });
    rebuildLooperSlots();
  }

  function rebuildLooperSlots() {
    const saved = readSlotState();
    const trackCount = getTrackCount();
    looperSlots.style.setProperty('--looper-beats', beatsPerMeasure);

    let html = '';
    for (let t = 0; t < trackCount; t += 1) {
      const slots = Array.from({ length: beatsPerMeasure }, (_, b) => {
        const value = saved[t]?.[b] || '';
        return `<select class="dock-select looper-slot" data-track="${t}" data-beat="${b}" title="Layer ${t + 1}, beat ${b + 1}">${slotOptionsHtml(value)}</select>`;
      }).join('');
      html += `<div class="looper-track-row"><span class="looper-track-tag">${t + 1}</span>${slots}</div>`;
    }

    looperSlots.innerHTML = html;
    looperSlots.querySelectorAll('.looper-slot').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => e.stopPropagation());
    });
  }

  function updateTimeSignature() {
    beatsPerMeasure = parseInt(timeSignatureSelect.value.split('/')[0], 10);
    updateSummary();
    rebuildLooperSlots();
  }

  function setPlayerUi(mode) {
    metronomeStart.disabled = mode === 'metronome';
    metronomeStop.disabled = mode !== 'metronome';
    looperStart.disabled = mode === 'looper';
    looperStop.disabled = mode !== 'looper';
  }

  const metronomeScheduler = createBeatScheduler({
    getIntervalMs,
    getBeatsPerMeasure,
    onBeat(beat) {
      playTick(beat === 1);
    },
  });

  const looperScheduler = createBeatScheduler({
    getIntervalMs,
    getBeatsPerMeasure,
    onBeat(beat) {
      highlightBeat(beat);
      const trackCount = getTrackCount();
      const saved = readSlotState();
      for (let t = 0; t < trackCount; t += 1) {
        playSlotValue(saved[t]?.[beat - 1]);
      }
    },
  });

  function stopAll() {
    metronomeScheduler.stop();
    looperScheduler.stop();
    clearBeatHighlight();
    setPlayerUi(null);
  }

  function startMetronome() {
    stopAll();
    updateTimeSignature();
    if (metronomeScheduler.start()) setPlayerUi('metronome');
  }

  function startLooper() {
    stopAll();
    updateTimeSignature();
    if (looperScheduler.start()) setPlayerUi('looper');
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
  timeSignatureSelect.addEventListener('change', updateTimeSignature);
  looperTracksSelect.addEventListener('change', (e) => {
    e.stopPropagation();
    rebuildLooperSlots();
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLooperMode(btn.dataset.looperMode);
    });
  });

  metronomeStart.addEventListener('click', (e) => {
    e.stopPropagation();
    startMetronome();
  });
  metronomeStop.addEventListener('click', (e) => {
    e.stopPropagation();
    stopAll();
  });
  looperStart.addEventListener('click', (e) => {
    e.stopPropagation();
    startLooper();
  });
  looperStop.addEventListener('click', (e) => {
    e.stopPropagation();
    stopAll();
  });

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

  wireDockBarToggle(el, setExpanded);

  updateTimeSignature();
  rebuildLooperSlots();
  return el;
}

/** @deprecated use renderToolsDock via bottom dock */
export function renderTools() {
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.innerHTML = '<h2>tools</h2><p>Moved to the bottom dock.</p>';
  return wrap;
}

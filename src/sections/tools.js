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

  function noteSelectOptions(selected = 'C') {
    return CHROMATIC.map((n) => `<option value="${n}"${n === selected ? ' selected' : ''}>${n}</option>`).join('');
  }
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
          <span class="dock-section-label">Looper</span>
          <div class="tools-controls-col">
            <div class="tools-inline looper-toolbar">
              <span class="looper-toolbar-label">Tracks</span>
              <select id="looper-tracks" class="dock-select looper-tracks-select" title="Number of tracks">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
              </select>
              <button type="button" class="dock-nav-btn" id="start-looper" title="Start looper">▶</button>
              <button type="button" class="dock-nav-btn" id="stop-looper" title="Stop looper" disabled>■</button>
            </div>
            <div id="looper-grid" class="looper-grid"></div>
            <div id="looper-machine" class="looper-machine" aria-label="Beat pattern"></div>
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
  const metronomeStart = el.querySelector('#start-metronome');
  const metronomeStop = el.querySelector('#stop-metronome');
  const looperStart = el.querySelector('#start-looper');
  const looperStop = el.querySelector('#stop-looper');
  const looperTracksSelect = el.querySelector('#looper-tracks');
  const looperGrid = el.querySelector('#looper-grid');
  const looperMachine = el.querySelector('#looper-machine');

  let beatsPerMeasure = 4;
  let activeBeat = 0;

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

  function updateTimeSignature() {
    beatsPerMeasure = parseInt(timeSignatureSelect.value.split('/')[0], 10);
    updateSummary();
    rebuildLooperGrid();
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

  function slotLabel(slot) {
    if (!slot) return '—';
    if (slot.type === 'chord') return slot.chord || '—';
    return slot.note || '—';
  }

  function readSlotState() {
    const state = [];
    for (let t = 0; t < MAX_TRACKS; t += 1) {
      const track = [];
      for (let b = 0; b < beatsPerMeasure; b += 1) {
        const cell = looperGrid.querySelector(`[data-track="${t}"][data-beat="${b}"]`);
        if (!cell) {
          track.push({ type: 'chord', value: '' });
          continue;
        }
        track.push({
          type: cell.querySelector('.looper-type')?.value || 'chord',
          value: cell.querySelector('.looper-value')?.value || '',
        });
      }
      state.push(track);
    }
    return state;
  }

  function playSlot(slot) {
    if (!slot?.value) return;
    if (slot.type === 'note') playNote(slot.value, LOOPER_NOTE_OCTAVE);
    else playChordByName(slot.value, chordsJson, notesJson);
  }

  function highlightBeat(beat) {
    activeBeat = beat;
    looperMachine.querySelectorAll('.looper-pad').forEach((pad) => {
      const padBeat = parseInt(pad.dataset.beat, 10);
      const isActive = padBeat === beat;
      pad.classList.toggle('is-active', isActive);
    });
  }

  function clearBeatHighlight() {
    activeBeat = 0;
    looperMachine.querySelectorAll('.looper-pad.is-active').forEach((p) => {
      p.classList.remove('is-active');
    });
  }

  function syncMachineDisplay() {
    const trackCount = parseInt(looperTracksSelect.value, 10);
    const saved = readSlotState();
    looperMachine.style.setProperty('--looper-beats', beatsPerMeasure);

    const beatPads = Array.from({ length: beatsPerMeasure }, (_, i) =>
      `<span class="looper-pad looper-pad-beat" data-beat="${i + 1}">${i + 1}</span>`
    ).join('');

    let rows = `<div class="looper-machine-row looper-machine-row-beats"><span class="looper-machine-corner"></span>${beatPads}</div>`;

    for (let t = 0; t < trackCount; t += 1) {
      const slots = Array.from({ length: beatsPerMeasure }, (_, b) => {
        const label = slotLabel(saved[t]?.[b]);
        const active = activeBeat === b + 1 ? ' is-active' : '';
        return `<span class="looper-pad looper-pad-slot${active}" data-beat="${b + 1}" data-track="${t}" title="${label}">${label}</span>`;
      }).join('');
      rows += `<div class="looper-machine-row" data-machine-track="${t}"><span class="looper-machine-corner">T${t + 1}</span>${slots}</div>`;
    }

    looperMachine.innerHTML = rows;
  }

  const looperScheduler = createBeatScheduler({
    getIntervalMs,
    getBeatsPerMeasure,
    onBeat(beat) {
      highlightBeat(beat);
      const trackCount = parseInt(looperTracksSelect.value, 10);
      const saved = readSlotState();
      for (let t = 0; t < trackCount; t += 1) {
        playSlot(saved[t]?.[beat - 1]);
      }
    },
  });

  function stopAll() {
    metronomeScheduler.stop();
    looperScheduler.stop();
    clearBeatHighlight();
    syncMachineDisplay();
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

  function populateValueSelect(select, type, value) {
    select.innerHTML = type === 'note'
      ? noteSelectOptions(value || 'C')
      : chordSelectOptions(value || '');
    if (value && ![...select.options].some((o) => o.value === value)) {
      select.value = type === 'note' ? 'C' : '';
    }
  }

  function wireSlotCell(cell) {
    const typeSel = cell.querySelector('.looper-type');
    const valueSel = cell.querySelector('.looper-value');

    typeSel.addEventListener('change', (e) => {
      e.stopPropagation();
      populateValueSelect(valueSel, typeSel.value, '');
      syncMachineDisplay();
    });
    typeSel.addEventListener('click', (e) => e.stopPropagation());

    valueSel.addEventListener('change', (e) => {
      e.stopPropagation();
      syncMachineDisplay();
    });
    valueSel.addEventListener('click', (e) => e.stopPropagation());
  }

  function renderSlotCell(track, beat, saved) {
    const slot = saved?.[track]?.[beat] || { type: 'chord', value: '' };
    const isNote = slot.type === 'note';
    const typeOpts = `
      <option value="chord"${isNote ? '' : ' selected'}>C</option>
      <option value="note"${isNote ? ' selected' : ''}>N</option>
    `;
    return `
      <div class="looper-cell" data-track="${track}" data-beat="${beat}">
        <select class="dock-select looper-type" title="C = chord, N = note">${typeOpts}</select>
        <select class="dock-select looper-value"></select>
      </div>
    `;
  }

  function rebuildLooperGrid() {
    const saved = readSlotState();
    const trackCount = parseInt(looperTracksSelect.value, 10);
    looperGrid.style.setProperty('--looper-beats', beatsPerMeasure);

    let rows = '';
    for (let t = 0; t < trackCount; t += 1) {
      const cells = Array.from({ length: beatsPerMeasure }, (_, b) => renderSlotCell(t, b, saved)).join('');
      rows += `<div class="looper-row" data-looper-track="${t}"><span class="looper-track-head">T${t + 1}</span>${cells}</div>`;
    }

    looperGrid.innerHTML = rows;
    looperGrid.querySelectorAll('.looper-cell').forEach((cell) => {
      const track = parseInt(cell.dataset.track, 10);
      const beat = parseInt(cell.dataset.beat, 10);
      const slot = saved?.[track]?.[beat] || { type: 'chord', value: '' };
      wireSlotCell(cell);
      populateValueSelect(cell.querySelector('.looper-value'), slot.type, slot.value);
    });
    syncMachineDisplay();
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
    rebuildLooperGrid();
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

  wireDockBarToggle(
    el,
    setExpanded,
    '.tools-stack, .dock-nav-btn, .dock-select, .input-bpm, .bpm-step, .looper-grid, .looper-cell, .looper-machine'
  );

  updateTimeSignature();
  return el;
}

/** @deprecated use renderToolsDock via bottom dock */
export function renderTools() {
  const wrap = document.createElement('div');
  wrap.className = 'section';
  wrap.innerHTML = '<h2>tools</h2><p>Moved to the bottom dock.</p>';
  return wrap;
}

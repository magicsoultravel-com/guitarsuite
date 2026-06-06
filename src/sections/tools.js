import { CHROMATIC, musicalSort } from '../music.js';
import { playTick, playPitch, playStandardString, STANDARD_TUNING } from '../audio.js';
import { playNote, playChordByName } from '../playback.js';
import { createBeatScheduler } from '../beatScheduler.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';

const MAX_TRACKS = 4;

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
              <select id="looper-tracks" class="dock-select" title="Number of tracks">
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
              </select>
              <button type="button" class="dock-nav-btn" id="start-looper" title="Start looper">▶</button>
              <button type="button" class="dock-nav-btn" id="stop-looper" title="Stop looper" disabled>■</button>
            </div>
            <div id="looper-grid" class="looper-grid"></div>
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

  let beatsPerMeasure = 4;

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

  function readSlotState() {
    const state = [];
    for (let t = 0; t < MAX_TRACKS; t += 1) {
      const track = [];
      for (let b = 0; b < beatsPerMeasure; b += 1) {
        const cell = looperGrid.querySelector(`[data-track="${t}"][data-beat="${b}"]`);
        if (!cell) {
          track.push({ type: 'chord', chord: '', note: 'C', octave: '4' });
          continue;
        }
        track.push({
          type: cell.querySelector('.looper-type')?.value || 'chord',
          chord: cell.querySelector('.looper-chord')?.value || '',
          note: cell.querySelector('.looper-note')?.value || 'C',
          octave: cell.querySelector('.looper-octave')?.value || '4',
        });
      }
      state.push(track);
    }
    return state;
  }

  function playSlot(slot) {
    if (!slot) return;
    if (slot.type === 'chord') {
      if (slot.chord) playChordByName(slot.chord, chordsJson, notesJson);
      return;
    }
    if (slot.note) playNote(slot.note, parseInt(slot.octave, 10));
  }

  const looperScheduler = createBeatScheduler({
    getIntervalMs,
    getBeatsPerMeasure,
    onBeat(beat) {
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

  function renderSlotCell(track, beat, saved) {
    const slot = saved?.[track]?.[beat] || { type: 'chord', chord: '', note: 'C', octave: '4' };
    const isNote = slot.type === 'note';
    return `
      <div class="looper-cell" data-track="${track}" data-beat="${beat}">
        <select class="dock-select looper-type" title="Note or chord">
          <option value="chord"${isNote ? '' : ' selected'}>Chord</option>
          <option value="note"${isNote ? ' selected' : ''}>Note</option>
        </select>
        <select class="dock-select looper-chord"${isNote ? ' hidden' : ''}>${chordSelectOptions(slot.chord)}</select>
        <span class="looper-note-wrap${isNote ? '' : ' hidden'}">
          <select class="dock-select looper-note">${noteSelectOptions(slot.note)}</select>
          <select class="dock-select looper-octave">
            <option value="3"${slot.octave === '3' ? ' selected' : ''}>3</option>
            <option value="4"${slot.octave === '4' ? ' selected' : ''}>4</option>
            <option value="5"${slot.octave === '5' ? ' selected' : ''}>5</option>
          </select>
        </span>
      </div>
    `;
  }

  function rebuildLooperGrid() {
    const saved = readSlotState();
    const trackCount = parseInt(looperTracksSelect.value, 10);
    const beatHeaders = Array.from({ length: beatsPerMeasure }, (_, i) =>
      `<span class="looper-beat-head">B${i + 1}</span>`
    ).join('');

    let rows = `<div class="looper-row looper-row-head"><span class="looper-track-head"></span>${beatHeaders}</div>`;
    for (let t = 0; t < trackCount; t += 1) {
      const cells = Array.from({ length: beatsPerMeasure }, (_, b) => renderSlotCell(t, b, saved)).join('');
      rows += `<div class="looper-row" data-looper-track="${t}"><span class="looper-track-head">T${t + 1}</span>${cells}</div>`;
    }

    looperGrid.innerHTML = rows;

    looperGrid.querySelectorAll('.looper-type').forEach((sel) => {
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const cell = sel.closest('.looper-cell');
        const isNote = sel.value === 'note';
        cell.querySelector('.looper-chord').hidden = isNote;
        cell.querySelector('.looper-note-wrap').hidden = !isNote;
      });
      sel.addEventListener('click', (e) => e.stopPropagation());
    });
    looperGrid.querySelectorAll('.looper-cell select').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
    });
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
    '.tools-stack, .dock-nav-btn, .dock-select, .input-bpm, .bpm-step, .looper-grid, .looper-cell'
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

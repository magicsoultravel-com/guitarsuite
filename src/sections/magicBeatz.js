import { getAudioContext } from '../audio.js';
import { ensureDockChrome, wireDockBarToggle, wireDockExpand } from '../dockModule.js';
import {
  createChannel,
  createEmptyPattern,
  createStep,
  resizePatternSteps,
  channelAudible,
  clampBpm,
  clamp01,
  beatsFromTimeSignature,
  totalSteps,
  STEPS_PER_BEAT,
  MAX_BARS,
  DEFAULT_VELOCITY,
  DEFAULT_GAIN,
} from '../magicBeatz/pattern.js';
import {
  loadProject,
  saveProject,
  getActivePattern,
  resolveArrangementStep,
  arrangementLengthBars,
  duplicatePattern,
  arrangementToSlots,
  slotsToArrangement,
  MAX_ARRANGE_BARS,
} from '../magicBeatz/project.js';
import { createStepTransport } from '../magicBeatz/stepTransport.js';
import {
  playChannelHit,
  percussionVoiceOptions,
  noteVoiceOptions,
  chordNameOptions,
  scaleOptions,
  degreeOptions,
  pitchedInstrumentOptions,
} from '../magicBeatz/banks/index.js';
import {
  playPitchedInstrument,
  startPitchedSustain,
  stopPitchedSustain,
  stopAllPitchedSustain,
  SUSTAIN_INSTRUMENTS,
} from '../magicBeatz/voices.js';
import { INSTRUMENT_OPTIONS } from '../magicBeatz/pattern.js';
import { connectMidiInput } from '../magicBeatz/midiInput.js';

/**
 * @param {{
 *   hub?: object,
 *   chordsJson?: object,
 *   notesJson?: object,
 *   scalesJson?: object,
 *   curatedKeys?: Set<string>|null,
 * }} opts
 */
export function renderMagicBeatzDock({
  hub = null,
  chordsJson = {},
  notesJson = {},
  scalesJson = {},
  curatedKeys = null,
} = {}) {
  const el = document.createElement('div');
  el.id = 'magic-beatz-dock';
  el.className = 'magic-beatz-dock';

  let project = loadProject();
  let selectedCell = null;
  let openChannelId = null;
  let arrangeSlots = arrangementToSlots(
    project.arrangement,
    Math.max(1, arrangementLengthBars(project.arrangement) || 1),
  );

  el.innerHTML = `
    <div class="dock-module-bar">
      <span class="dock-module-chevron" aria-hidden="true">▲</span>
    </div>
    <div class="dock-module-panel magic-beatz-panel" hidden>
      <div class="magic-beatz-stack">
        <div class="dock-section tools-block magic-beatz-transport">
          <span class="dock-section-label">transport</span>
          <div class="tools-controls-col">
            <div class="tools-inline">
              <button type="button" class="tools-btn mb-bpm-step" data-delta="-1" title="Slower">−</button>
              <input type="number" class="input-bpm mb-bpm" value="${project.bpm}" min="30" max="250" title="BPM">
              <button type="button" class="tools-btn mb-bpm-step" data-delta="1" title="Faster">+</button>
              <select class="dock-select tools-select-sig mb-sig" title="Time signature">
                <option value="4/4">4/4</option>
                <option value="3/4">3/4</option>
                <option value="6/8">6/8</option>
              </select>
              <select class="dock-select tools-select-narrow mb-bars" title="Bars in active pattern">
                ${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}b</option>`).join('')}
              </select>
              <div class="tools-segment mb-mode" role="group" aria-label="Play mode">
                <button type="button" class="tools-segment-btn mb-mode-pattern is-active" data-mode="pattern" title="Loop the active pattern only">pat</button>
                <button type="button" class="tools-segment-btn mb-mode-song" data-mode="song" title="Play the arrangement left to right">song</button>
              </div>
              <button type="button" class="tools-btn mb-play" title="Play">▶</button>
              <button type="button" class="tools-btn mb-stop" title="Stop" disabled>■</button>
            </div>
            <div class="tools-inline magic-beatz-swing-row">
              <label class="magic-beatz-swing-label" for="mb-swing">swing</label>
              <input type="range" id="mb-swing" class="magic-beatz-swing" min="0" max="100" value="${Math.round(project.swing * 100)}" title="Swing">
              <span class="magic-beatz-swing-val">${Math.round(project.swing * 100)}%</span>
              <button type="button" class="tools-btn magic-beatz-btn-wide mb-add-ch" title="Add channel">+ ch</button>
            </div>
          </div>
        </div>

        <div class="dock-section tools-block magic-beatz-patterns-block">
          <span class="dock-section-label">patterns</span>
          <div class="tools-inline mb-pattern-bar">
            <select class="dock-select mb-pattern-select" title="Active pattern"></select>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-pat-new" title="New pattern">new</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-pat-dup" title="Duplicate">dup</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-pat-ren" title="Rename">ren</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-pat-del" title="Delete pattern">del</button>
          </div>
        </div>

        <div class="dock-section tools-block magic-beatz-grid-block">
          <span class="dock-section-label">grid</span>
          <div class="tools-inline mb-grid-bar">
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-grid-clear" title="Clear all steps">clear</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-grid-reset" title="Reset channels to defaults">reset</button>
          </div>
          <div class="magic-beatz-grid-wrap">
            <div class="magic-beatz-grid" role="grid" aria-label="Step sequencer"></div>
          </div>
          <div class="tools-inline magic-beatz-vel-row">
            <label class="magic-beatz-swing-label" for="mb-velocity">velocity</label>
            <input type="range" id="mb-velocity" class="magic-beatz-velocity" min="10" max="100" value="${Math.round(DEFAULT_VELOCITY * 100)}" title="Selected step velocity" disabled>
            <span class="magic-beatz-vel-val">—</span>
          </div>
        </div>

        <div class="dock-section tools-block magic-beatz-arrange-block">
          <span class="dock-section-label">arrangement</span>
          <div class="tools-inline mb-arrange-bar">
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-arr-add" title="Add bar">+ bar</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-arr-del" title="Remove last bar">− bar</button>
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-arr-clear" title="Clear arrangement">clear</button>
          </div>
          <div class="mb-arrange-wrap">
            <div class="mb-arrange-grid mb-cells" role="list" aria-label="Arrangement bars"></div>
          </div>
        </div>

        <div class="dock-section tools-block magic-beatz-keys-block">
          <span class="dock-section-label">keyboard</span>
          <div class="tools-inline mb-keys-bar">
            <select class="dock-select mb-keys-inst" title="Keyboard instrument"></select>
            <button type="button" class="tools-btn mb-oct-down" title="Octave down (−)">◀</button>
            <span class="mb-oct-label" title="Base octave">oct 3</span>
            <button type="button" class="tools-btn mb-oct-up" title="Octave up (=)">▶</button>
            <input type="hidden" class="mb-keys-oct" value="3">
            <button type="button" class="tools-btn magic-beatz-btn-wide mb-rec" title="Capture keyboard into the grid (click again to stop &amp; write)">capture</button>
            <select class="dock-select mb-quantize" title="Quantize captured hits when stopping">
              <option value="16" selected>1/16</option>
              <option value="8">1/8</option>
              <option value="4">1/4</option>
              <option value="off">off</option>
            </select>
            <span class="mb-keys-hint" title="Computer keys follow the on-screen keyboard; USB MIDI when available">A = C · −/= oct · MIDI</span>
            <span class="mb-midi-status" title="MIDI status" aria-live="polite">MIDI…</span>
          </div>
          <div class="mb-keyboard" aria-label="Piano keyboard"></div>
        </div>
      </div>
    </div>
  `;

  ensureDockChrome(el, 'magic-beatz', 'magic beatz');

  const barLabel = el.querySelector('.dock-module-label');
  const bpmInput = el.querySelector('.mb-bpm');
  const sigSelect = el.querySelector('.mb-sig');
  const barsSelect = el.querySelector('.mb-bars');
  const swingInput = el.querySelector('#mb-swing');
  const swingVal = el.querySelector('.magic-beatz-swing-val');
  const playBtn = el.querySelector('.mb-play');
  const stopBtn = el.querySelector('.mb-stop');
  const addChBtn = el.querySelector('.mb-add-ch');
  const gridClearBtn = el.querySelector('.mb-grid-clear');
  const gridResetBtn = el.querySelector('.mb-grid-reset');
  const recBtn = el.querySelector('.mb-rec');
  const quantizeSelect = el.querySelector('.mb-quantize');
  const gridEl = el.querySelector('.magic-beatz-grid');
  const velInput = el.querySelector('#mb-velocity');
  const velVal = el.querySelector('.magic-beatz-vel-val');
  const patternSelect = el.querySelector('.mb-pattern-select');
  const arrangeGrid = el.querySelector('.mb-arrange-grid');
  const keysInst = el.querySelector('.mb-keys-inst');
  const keysOct = el.querySelector('.mb-keys-oct');
  const octLabel = el.querySelector('.mb-oct-label');
  const keyboardEl = el.querySelector('.mb-keyboard');
  const midiStatusEl = el.querySelector('.mb-midi-status');
  const modeBtns = el.querySelectorAll('.mb-mode .tools-segment-btn');

  let recording = false;
  let recordBuffer = [];
  /** AudioContext time of step 0 of the current loop (updated on transport start / wrap). */
  let loopOriginTime = 0;

  keysInst.innerHTML = INSTRUMENT_OPTIONS.map(
    (o) => `<option value="${escapeAttr(o.id)}"${o.id === 'piano' ? ' selected' : ''}>${escapeHtml(o.label)}</option>`
  ).join('');

  const heldKeys = new Map(); // holdId -> sustainKey|null
  const heldPcCodes = new Set();

  /** Computer keyboard → semitone offset from visible C (baseOct). A always = C on screen. */
  const PC_NOTE_OFFSETS = {
    KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4,
    KeyF: 5, KeyT: 6, KeyG: 7, KeyY: 8, KeyH: 9,
    KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14,
    KeyP: 15, Semicolon: 16, Quote: 17, BracketRight: 18, Backslash: 19,
  };

  const PC_KEY_LABEL = {
    KeyA: 'A', KeyW: 'W', KeyS: 'S', KeyE: 'E', KeyD: 'D',
    KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H',
    KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L',
    KeyP: 'P', Semicolon: ';', Quote: "'", BracketRight: ']', Backslash: '\\',
  };

  const PITCH_ORDER = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function midiFromBase(baseOct, semis) {
    return (baseOct + 1) * 12 + semis;
  }

  function pitchOctFromMidi(midi) {
    const pitch = PITCH_ORDER[((midi % 12) + 12) % 12];
    const octave = Math.floor(midi / 12) - 1;
    return { pitch, octave };
  }

  function pitchToMidi(pitch, octave) {
    const idx = PITCH_ORDER.indexOf(pitch);
    if (idx < 0) return null;
    return (octave + 1) * 12 + idx;
  }

  function findPianoBtn(pitch, octave) {
    const safe = (window.CSS && CSS.escape) ? CSS.escape(pitch) : String(pitch).replace(/#/g, '\\#');
    return keyboardEl.querySelector(`.mb-key[data-pitch="${safe}"][data-octave="${octave}"]`);
  }

  function pcLabelForNote(pitch, octave, baseOct) {
    const midi = pitchToMidi(pitch, octave);
    if (midi == null) return '';
    const offset = midi - midiFromBase(baseOct, 0);
    for (const [code, semis] of Object.entries(PC_NOTE_OFFSETS)) {
      if (semis === offset) return PC_KEY_LABEL[code] || '';
    }
    return '';
  }

  function isTypingTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return !!target.isContentEditable;
  }

  function keyboardArmed() {
    const panel = el.querySelector('.magic-beatz-panel');
    return !!(panel && !panel.hidden);
  }

  function pressNote(pitch, octave, holdId, velocity) {
    if (heldKeys.has(holdId)) return;
    const btn = findPianoBtn(pitch, octave);
    const inst = keysInst.value || 'piano';
    const playVel = velocity != null ? clamp01(velocity) : 0.85;
    const captureVel = velocity != null ? clamp01(velocity) : DEFAULT_VELOCITY;
    btn?.classList.add('is-down');
    if (recording) {
      recordBuffer.push({
        pitch,
        octave,
        instrumentId: inst,
        t: getAudioContext().currentTime,
        velocity: captureVel,
      });
    }
    if (SUSTAIN_INSTRUMENTS.has(inst)) {
      const sk = startPitchedSustain(inst, pitch, octave, playVel);
      heldKeys.set(holdId, sk || null);
    } else {
      playPitchedInstrument(inst, pitch, octave, undefined, playVel);
      if (btn) window.setTimeout(() => btn.classList.remove('is-down'), 120);
    }
  }

  function clearHoldHighlight(holdId) {
    if (holdId instanceof Element) {
      holdId.classList.remove('is-down');
      return;
    }
    if (typeof holdId !== 'string') return;
    if (holdId.startsWith('pc:')) {
      const body = holdId.slice(3);
      const pipe = body.lastIndexOf('|');
      const pitch = body.slice(0, pipe);
      const octave = parseInt(body.slice(pipe + 1), 10);
      findPianoBtn(pitch, octave)?.classList.remove('is-down');
      return;
    }
    if (holdId.startsWith('midi:')) {
      const midi = parseInt(holdId.slice(5), 10);
      if (Number.isNaN(midi)) return;
      const { pitch, octave } = pitchOctFromMidi(midi);
      findPianoBtn(pitch, octave)?.classList.remove('is-down');
    }
  }

  function releaseNote(holdId) {
    if (!heldKeys.has(holdId)) return;
    const sk = heldKeys.get(holdId);
    if (sk) stopPitchedSustain(sk);
    heldKeys.delete(holdId);
    clearHoldHighlight(holdId);
  }

  function releaseHeldKey(btn) {
    releaseNote(btn);
  }

  function releaseAllHeldKeys() {
    for (const id of [...heldKeys.keys()]) releaseNote(id);
    heldPcCodes.clear();
  }

  window.addEventListener('mouseup', releaseAllHeldKeys);
  window.addEventListener('blur', releaseAllHeldKeys);

  function onPcKeyDown(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (isTypingTarget(e.target)) return;
    if (!keyboardArmed()) return;

    if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      keysOct.value = String(clampOctave((parseInt(keysOct.value, 10) || 3) - 1));
      rebuildKeyboard();
      return;
    }
    if (e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      keysOct.value = String(clampOctave((parseInt(keysOct.value, 10) || 3) + 1));
      rebuildKeyboard();
      return;
    }

    const offset = PC_NOTE_OFFSETS[e.code];
    if (offset == null) return;
    e.preventDefault();
    if (heldPcCodes.has(e.code)) return;
    heldPcCodes.add(e.code);

    const baseOct = clampOctave(parseInt(keysOct.value, 10) || 3);
    const { pitch, octave } = pitchOctFromMidi(midiFromBase(baseOct, offset));
    pressNote(pitch, octave, `pc:${pitch}|${octave}`);
  }

  function onPcKeyUp(e) {
    if (!heldPcCodes.has(e.code)) return;
    heldPcCodes.delete(e.code);
    const offset = PC_NOTE_OFFSETS[e.code];
    if (offset == null) return;
    const baseOct = clampOctave(parseInt(keysOct.value, 10) || 3);
    const { pitch, octave } = pitchOctFromMidi(midiFromBase(baseOct, offset));
    releaseNote(`pc:${pitch}|${octave}`);
  }

  window.addEventListener('keydown', onPcKeyDown);
  window.addEventListener('keyup', onPcKeyUp);

  function updateMidiStatus(status) {
    if (!midiStatusEl) return;
    const labels = {
      unsupported: 'MIDI n/a',
      denied: 'MIDI denied',
      none: 'MIDI: none',
      ready: status.deviceName ? `MIDI: ${status.deviceName}` : 'MIDI: ready',
    };
    const text = labels[status.kind] || 'MIDI…';
    midiStatusEl.textContent = text;
    midiStatusEl.title = text;
    midiStatusEl.dataset.kind = status.kind;
  }

  function onMidiNoteOn(midiNote, velocity) {
    if (!keyboardArmed()) return;
    const { pitch, octave } = pitchOctFromMidi(midiNote);
    pressNote(pitch, octave, `midi:${midiNote}`, velocity);
  }

  function onMidiNoteOff(midiNote) {
    releaseNote(`midi:${midiNote}`);
  }

  connectMidiInput({
    onNoteOn: onMidiNoteOn,
    onNoteOff: onMidiNoteOff,
    onStatus: updateMidiStatus,
  });

  function syncOctLabel() {
    const oct = clampOctave(parseInt(keysOct.value, 10) || 3);
    keysOct.value = String(oct);
    if (octLabel) octLabel.textContent = `oct ${oct}`;
  }

  function clampOctave(n) {
    return Math.min(5, Math.max(1, n));
  }

  const sigStr = `${project.timeSignature[0]}/${project.timeSignature[1]}`;
  if ([...sigSelect.options].some((o) => o.value === sigStr)) {
    sigSelect.value = sigStr;
  }

  function activePattern() {
    return getActivePattern(project);
  }

  function persist() {
    project.arrangement = slotsToArrangement(arrangeSlots);
    saveProject(project);
    updateSummary();
  }

  function updateSummary() {
    if (!barLabel) return;
    const pat = activePattern();
    const running = transport.isRunning() ? ' · playing' : '';
    const mode = project.playMode === 'song' ? 'song' : 'pat';
    barLabel.textContent = `magic beatz · ${project.bpm} bpm · ${mode} · ${pat?.name || '?'}${running}`;
  }

  function getBpm() {
    return clampBpm(parseInt(bpmInput.value, 10));
  }

  function getBeatsPerMeasure() {
    return beatsFromTimeSignature(project.timeSignature);
  }

  function getPatternBars() {
    const pat = activePattern();
    return Math.min(MAX_BARS, Math.max(1, pat?.bars || 1));
  }

  function getSwing() {
    return clamp01(project.swing);
  }

  function getTotalSteps() {
    if (project.playMode === 'song') {
      const beats = getBeatsPerMeasure();
      const bars = Math.max(1, arrangeSlots.length);
      return bars * beats * STEPS_PER_BEAT;
    }
    return totalSteps(getPatternBars(), getBeatsPerMeasure());
  }

  function setPlayingUi(playing) {
    playBtn.disabled = playing;
    stopBtn.disabled = !playing;
    updateSummary();
  }

  function syncModeButtons() {
    modeBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.mode === project.playMode);
    });
  }

  function setPlayMode(mode) {
    project.playMode = mode === 'song' ? 'song' : 'pattern';
    syncModeButtons();
    persist();
  }

  function schedulePlayhead(globalStep, when, localStep) {
    const delayMs = Math.max(0, (when - getAudioContext().currentTime) * 1000 - 8);
    window.setTimeout(() => {
      if (!transport.isRunning()) return;
      highlightStep(localStep);
      highlightArrange(globalStep);
    }, delayMs);
  }

  function highlightStep(stepIndex) {
    gridEl.querySelectorAll('.mb-cell.is-playhead').forEach((c) => c.classList.remove('is-playhead'));
    gridEl.querySelectorAll(`.mb-cell[data-step="${stepIndex}"]`).forEach((c) => {
      c.classList.add('is-playhead');
    });
  }

  function highlightArrange(globalStep) {
    arrangeGrid.querySelectorAll('.mb-arr-cell.is-playhead').forEach((c) => c.classList.remove('is-playhead'));
    if (project.playMode !== 'song') return;
    const beats = getBeatsPerMeasure();
    const stepsPerBarCount = beats * STEPS_PER_BEAT;
    const total = Math.max(1, arrangeSlots.length) * stepsPerBarCount;
    const step = ((globalStep % total) + total) % total;
    const bar = Math.floor(step / stepsPerBarCount);
    arrangeGrid.querySelector(`.mb-arr-cell[data-bar="${bar}"]`)?.classList.add('is-playhead');
  }

  function clearPlayhead() {
    gridEl.querySelectorAll('.mb-cell.is-playhead').forEach((c) => c.classList.remove('is-playhead'));
    arrangeGrid.querySelectorAll('.mb-arr-cell.is-playhead').forEach((c) => c.classList.remove('is-playhead'));
  }

  const transport = createStepTransport({
    getBpm,
    getBeatsPerMeasure,
    getBars: getPatternBars,
    getTotalSteps,
    getSwing,
    onStep(stepIndex, _total, when) {
      if (project.playMode === 'song') {
        const resolved = resolveArrangementStep(project, stepIndex, arrangeSlots.length);
        if (!resolved) return;
        schedulePlayhead(stepIndex, when, resolved.localStep);
        const channels = resolved.pattern.channels;
        for (const ch of channels) {
          if (!channelAudible(ch, channels)) continue;
          const step = ch.steps[resolved.localStep];
          if (!step) continue;
          playChannelHit(ch, when, step.velocity, {
            hub, chordsJson, notesJson, scalesJson,
          });
        }
        return;
      }

      if (stepIndex === 0) loopOriginTime = when;
      const pat = activePattern();
      if (!pat) return;
      schedulePlayhead(stepIndex, when, stepIndex);
      for (const ch of pat.channels) {
        if (!channelAudible(ch, pat.channels)) continue;
        const step = ch.steps[stepIndex];
        if (!step) continue;
        playChannelHit(ch, when, step.velocity, {
          hub, chordsJson, notesJson, scalesJson,
        });
      }
    },
  });

  function stopTransport() {
    transport.stop();
    clearPlayhead();
    setPlayingUi(false);
    if (recording) setRecording(false);
  }

  function startTransport() {
    project.bpm = getBpm();
    bpmInput.value = project.bpm;
    persist();
    setPlayingUi(true);
    const ctx = getAudioContext();
    loopOriginTime = ctx.currentTime + 0.05;
    if (!transport.start()) setPlayingUi(false);
  }

  function secondsPerStep() {
    const bpm = getBpm();
    if (!bpm) return 0;
    return 60 / bpm / STEPS_PER_BEAT;
  }

  function quantizeStepIndex(rawStep, total, grid) {
    if (grid === 'off' || !grid) {
      return ((Math.round(rawStep) % total) + total) % total;
    }
    const q = parseInt(grid, 10);
    // grid 16 => every step; 8 => every 2 sixteenths; 4 => every 4
    const div = q === 16 ? 1 : q === 8 ? 2 : q === 4 ? 4 : 1;
    const snapped = Math.round(rawStep / div) * div;
    return ((snapped % total) + total) % total;
  }

  function findOrCreateNoteChannel(pat, pitch, octave, instrumentId) {
    let ch = pat.channels.find(
      (c) => c.type === 'note'
        && c.pitch === pitch
        && (c.octave ?? 4) === octave
        && (c.instrumentId || 'piano') === instrumentId
    );
    if (ch) return ch;
    const len = totalSteps(pat.bars, getBeatsPerMeasure());
    ch = createChannel({
      type: 'note',
      pitch,
      octave,
      instrumentId,
      name: `${pitch}${octave}`,
      steps: Array.from({ length: len }, () => null),
    });
    pat.channels.push(ch);
    return ch;
  }

  function applyRecordBuffer() {
    const pat = activePattern();
    if (!pat || !recordBuffer.length) return;
    const sps = secondsPerStep();
    if (!sps) return;
    const total = totalSteps(pat.bars, getBeatsPerMeasure());
    const q = quantizeSelect.value || '16';
    const loopLen = total * sps;

    for (const hit of recordBuffer) {
      let elapsed = hit.t - loopOriginTime;
      if (elapsed < 0) elapsed = 0;
      const rawStep = (elapsed % loopLen) / sps;
      const stepIndex = quantizeStepIndex(rawStep, total, q);
      const ch = findOrCreateNoteChannel(
        pat,
        hit.pitch,
        hit.octave,
        hit.instrumentId || keysInst.value || 'piano',
      );
      ch.steps[stepIndex] = createStep(hit.velocity ?? DEFAULT_VELOCITY);
    }
    persist();
    rebuildGrid();
  }

  function setRecording(on) {
    recording = !!on;
    recBtn.classList.toggle('is-on', recording);
    recBtn.textContent = recording ? 'capturing…' : 'capture';
    if (recording) {
      recordBuffer = [];
      setPlayMode('pattern');
      if (!transport.isRunning()) startTransport();
      // keep loopOriginTime aligned via onStep when already running
    } else if (recordBuffer.length) {
      applyRecordBuffer();
      recordBuffer = [];
    }
  }

  function syncMetaFromControls() {
    project.bpm = getBpm();
    const [num, den] = sigSelect.value.split('/').map((n) => parseInt(n, 10));
    project.timeSignature = [num || 4, den || 4];
    const pat = activePattern();
    if (pat) {
      pat.bars = Math.min(MAX_BARS, Math.max(1, parseInt(barsSelect.value, 10) || 1));
      resizePatternSteps(pat, project.timeSignature);
    }
    project.swing = clamp01(parseInt(swingInput.value, 10) / 100);
    swingVal.textContent = `${Math.round(project.swing * 100)}%`;
    persist();
    rebuildAll();
  }

  function optionsHtml(list, selected) {
    return list
      .map((o) => `<option value="${escapeAttr(o.id)}"${String(o.id) === String(selected) ? ' selected' : ''}>${escapeHtml(o.label)}</option>`)
      .join('');
  }

  function channelShortLabel(ch) {
    if (ch.type === 'percussion') return ch.voiceId || 'perc';
    if (ch.type === 'note') return `${ch.pitch || 'C'}${ch.octave ?? ''}`;
    if (ch.chordMode === 'degree') return `d${(ch.degree ?? 0) + 1}`;
    return ch.chordName || 'chord';
  }

  function channelMenuFieldsHtml(ch) {
    const typeOpts = [
      { id: 'percussion', label: 'perc' },
      { id: 'note', label: 'note' },
      { id: 'chord', label: 'chord' },
    ];

    let voiceHtml = '';
    if (ch.type === 'percussion') {
      voiceHtml = `<label class="mb-pop-field">voice<select class="dock-select mb-voice" data-ch="${escapeAttr(ch.id)}">${optionsHtml(percussionVoiceOptions(), ch.voiceId)}</select></label>`;
    } else if (ch.type === 'note') {
      voiceHtml = `
        <label class="mb-pop-field">inst<select class="dock-select mb-instrument" data-ch="${escapeAttr(ch.id)}">${optionsHtml(pitchedInstrumentOptions('note'), ch.instrumentId || 'bass-sub')}</select></label>
        <label class="mb-pop-field">pitch<select class="dock-select mb-pitch" data-ch="${escapeAttr(ch.id)}">${optionsHtml(noteVoiceOptions(), ch.pitch)}</select></label>
        <label class="mb-pop-field">oct<select class="dock-select mb-octave" data-ch="${escapeAttr(ch.id)}">
          ${[1, 2, 3, 4, 5].map((o) => `<option value="${o}"${o === (ch.octave ?? 2) ? ' selected' : ''}>${o}</option>`).join('')}
        </select></label>`;
    } else {
      const mode = ch.chordMode === 'degree' ? 'degree' : 'named';
      voiceHtml = `
        <label class="mb-pop-field">inst<select class="dock-select mb-instrument" data-ch="${escapeAttr(ch.id)}">${optionsHtml(pitchedInstrumentOptions('chord'), ch.instrumentId || 'keys-pluck')}</select></label>
        <label class="mb-pop-field">mode<select class="dock-select mb-chord-mode" data-ch="${escapeAttr(ch.id)}">
          <option value="named"${mode === 'named' ? ' selected' : ''}>name</option>
          <option value="degree"${mode === 'degree' ? ' selected' : ''}>deg</option>
        </select></label>`;
      if (mode === 'named') {
        voiceHtml += `<label class="mb-pop-field">chord<select class="dock-select mb-chord-name" data-ch="${escapeAttr(ch.id)}">${optionsHtml(chordNameOptions(chordsJson, curatedKeys), ch.chordName)}</select></label>`;
      } else {
        const root = hub?.getRoot?.() || 'C';
        voiceHtml += `
          <label class="mb-pop-field">scale<select class="dock-select mb-scale" data-ch="${escapeAttr(ch.id)}">${optionsHtml(scaleOptions(scalesJson), ch.scaleKey || 'Ionian')}</select></label>
          <label class="mb-pop-field">deg<select class="dock-select mb-degree" data-ch="${escapeAttr(ch.id)}">${optionsHtml(degreeOptions(root, ch.scaleKey || 'Ionian', scalesJson), String(ch.degree ?? 0))}</select></label>`;
      }
    }

    const gainPct = Math.round(clamp01(ch.gain ?? DEFAULT_GAIN) * 100);
    return `
      <label class="mb-pop-field">type<select class="dock-select mb-type" data-ch="${escapeAttr(ch.id)}">${optionsHtml(typeOpts, ch.type)}</select></label>
      ${voiceHtml}
      <label class="mb-pop-field mb-pop-gain">gain<input type="range" class="mb-gain" data-ch="${escapeAttr(ch.id)}" min="0" max="100" value="${gainPct}" title="Gain ${gainPct}%"></label>
      <div class="mb-pop-actions">
        <button type="button" class="tools-btn magic-beatz-btn-wide mb-clear-row" data-ch="${escapeAttr(ch.id)}" title="Clear row">clear</button>
        <button type="button" class="tools-btn magic-beatz-btn-wide mb-remove-ch" data-ch="${escapeAttr(ch.id)}" title="Remove channel">remove</button>
      </div>`;
  }

  function channelControlsHtml(ch) {
    const open = openChannelId === ch.id;
    return `
      <div class="mb-channel-head${open ? ' is-open' : ''}" data-ch="${escapeAttr(ch.id)}">
        <div class="mb-ms-stack">
          <button type="button" class="tools-btn mb-mute${ch.mute ? ' is-on' : ''}" data-ch="${escapeAttr(ch.id)}" title="Mute">M</button>
          <button type="button" class="tools-btn mb-solo${ch.solo ? ' is-on' : ''}" data-ch="${escapeAttr(ch.id)}" title="Solo">S</button>
        </div>
        <button type="button" class="tools-btn magic-beatz-btn-wide mb-ch-toggle" data-ch="${escapeAttr(ch.id)}" title="Channel settings" aria-expanded="${open}">
          ${escapeHtml(channelShortLabel(ch))} ${open ? '▴' : '▾'}
        </button>
        <div class="mb-ch-pop" data-ch="${escapeAttr(ch.id)}" ${open ? '' : 'hidden'}>
          ${channelMenuFieldsHtml(ch)}
        </div>
      </div>`;
  }

  function rebuildPatternSelect() {
    const activeId = project.activePatternId;
    patternSelect.innerHTML = project.patterns
      .map((p) => `<option value="${escapeAttr(p.id)}"${p.id === activeId ? ' selected' : ''}>${escapeHtml(p.name)}</option>`)
      .join('');
    const pat = activePattern();
    if (pat) barsSelect.value = String(pat.bars);
  }

  function rebuildArrange() {
    if (!arrangeSlots.length) {
      arrangeSlots = [project.activePatternId || project.patterns[0]?.id || ''];
    }
    arrangeGrid.style.setProperty('--mb-steps', String(arrangeSlots.length));
    arrangeGrid.style.setProperty('--mb-arr-bars', String(arrangeSlots.length));

    let html = '';
    for (let i = 0; i < arrangeSlots.length; i += 1) {
      const selected = arrangeSlots[i] || '';
      const cellOpts = [
        `<option value=""${!selected ? ' selected' : ''}>—</option>`,
        ...project.patterns.map((p, idx) => {
          const short = `P${idx + 1}`;
          return `<option value="${escapeAttr(p.id)}"${p.id === selected ? ' selected' : ''}>${escapeHtml(short)}</option>`;
        }),
      ].join('');
      const filled = selected ? ' is-on' : '';
      const barMark = i === 0 ? ' is-bar' : ' is-beat';
      html += `<div class="mb-cell mb-arr-cell${filled}${barMark}" data-bar="${i}" title="Bar ${i + 1}">
        <select class="mb-arr-pat" data-bar="${i}" aria-label="Pattern for bar ${i + 1}">${cellOpts}</select>
      </div>`;
    }
    arrangeGrid.innerHTML = html;

    arrangeGrid.querySelectorAll('.mb-arr-pat').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const bar = parseInt(sel.dataset.bar, 10);
        arrangeSlots[bar] = sel.value || '';
        if (sel.value) {
          project.activePatternId = sel.value;
          rebuildPatternSelect();
          rebuildGrid();
        }
        persist();
        rebuildArrange();
      });
    });
  }

  function rebuildKeyboard() {
    syncOctLabel();
    stopAllPitchedSustain();
    heldKeys.clear();
    heldPcCodes.clear();

    const baseOct = clampOctave(parseInt(keysOct.value, 10) || 3);
    const pattern = [
      { pitch: 'C', white: true },
      { pitch: 'C#', white: false },
      { pitch: 'D', white: true },
      { pitch: 'D#', white: false },
      { pitch: 'E', white: true },
      { pitch: 'F', white: true },
      { pitch: 'F#', white: false },
      { pitch: 'G', white: true },
      { pitch: 'G#', white: false },
      { pitch: 'A', white: true },
      { pitch: 'A#', white: false },
      { pitch: 'B', white: true },
    ];

    let whites = '';
    let blacks = '';
    let whiteIndex = 0;
    const totalWhites = 14;

    for (let oct = baseOct; oct <= baseOct + 1; oct += 1) {
      for (const note of pattern) {
        const pc = pcLabelForNote(note.pitch, oct, baseOct);
        const pcHint = pc ? `<i class="mb-pc-hint">${escapeHtml(pc)}</i>` : '';
        if (note.white) {
          const noteHint = note.pitch === 'C' ? `<span>C${oct}</span>` : '';
          whites += `<button type="button" class="mb-key mb-key-white" data-pitch="${escapeAttr(note.pitch)}" data-octave="${oct}" title="${note.pitch}${oct}${pc ? ` · ${pc}` : ''}">${pcHint}${noteHint}</button>`;
          whiteIndex += 1;
        } else {
          const leftPct = ((whiteIndex - 0.35) / totalWhites) * 100;
          blacks += `<button type="button" class="mb-key mb-key-black" data-pitch="${escapeAttr(note.pitch)}" data-octave="${oct}" style="left:${leftPct}%" title="${note.pitch}${oct}${pc ? ` · ${pc}` : ''}">${pcHint}</button>`;
        }
      }
    }

    keyboardEl.innerHTML = `
      <div class="mb-keys-white">${whites}</div>
      <div class="mb-keys-black">${blacks}</div>
    `;

    keyboardEl.querySelectorAll('.mb-key').forEach((btn) => {
      const pitch = btn.dataset.pitch;
      const octave = parseInt(btn.dataset.octave, 10);
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pressNote(pitch, octave, btn);
      });
      btn.addEventListener('mouseup', (e) => {
        e.stopPropagation();
        releaseNote(btn);
      });
      btn.addEventListener('mouseleave', () => releaseNote(btn));
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        pressNote(pitch, octave, btn);
      }, { passive: false });
      btn.addEventListener('touchend', (e) => {
        e.preventDefault();
        releaseNote(btn);
      });
      btn.addEventListener('touchcancel', () => releaseNote(btn));
    });
  }

  function rebuildGrid() {
    const pat = activePattern();
    if (!pat) {
      gridEl.innerHTML = '';
      return;
    }
    const beats = getBeatsPerMeasure();
    const steps = totalSteps(pat.bars, beats);
    gridEl.style.setProperty('--mb-steps', String(steps));
    gridEl.style.setProperty('--mb-spb', String(STEPS_PER_BEAT));

    let html = '';
    for (const ch of pat.channels) {
      html += `<div class="mb-row" data-ch="${escapeAttr(ch.id)}">`;
      html += channelControlsHtml(ch);
      html += '<div class="mb-cells">';
      for (let i = 0; i < steps; i += 1) {
        const on = !!ch.steps[i];
        const beatStart = i % STEPS_PER_BEAT === 0;
        const barStart = i % (beats * STEPS_PER_BEAT) === 0;
        const classes = [
          'mb-cell',
          on ? 'is-on' : '',
          beatStart ? 'is-beat' : '',
          barStart ? 'is-bar' : '',
          selectedCell?.channelId === ch.id && selectedCell?.stepIndex === i ? 'is-selected' : '',
        ].filter(Boolean).join(' ');
        const vel = ch.steps[i]?.velocity;
        const style = on && vel != null ? ` style="opacity:${(0.45 + 0.55 * vel).toFixed(2)}"` : '';
        html += `<button type="button" class="${classes}" data-ch="${escapeAttr(ch.id)}" data-step="${i}" title="Step ${i + 1}${vel != null ? ` · vel ${Math.round(vel * 100)}` : ''}" aria-pressed="${on}"${style}></button>`;
      }
      html += '</div></div>';
    }
    gridEl.innerHTML = html;
    wireGridEvents();
    updateVelocityUi();
  }

  function rebuildAll() {
    rebuildPatternSelect();
    rebuildGrid();
    rebuildArrange();
    rebuildKeyboard();
    syncModeButtons();
    updateSummary();
  }

  function findChannel(id) {
    return activePattern()?.channels.find((c) => c.id === id);
  }

  function wireGridEvents() {
    gridEl.querySelectorAll('.mb-cell').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chId = btn.dataset.ch;
        const stepIndex = parseInt(btn.dataset.step, 10);
        const ch = findChannel(chId);
        if (!ch) return;

        if (e.altKey && ch.steps[stepIndex]) {
          selectedCell = { channelId: chId, stepIndex };
          updateVelocityUi();
          rebuildGrid();
          return;
        }

        if (ch.steps[stepIndex]) {
          ch.steps[stepIndex] = null;
          if (selectedCell?.channelId === chId && selectedCell?.stepIndex === stepIndex) {
            selectedCell = null;
          }
        } else {
          ch.steps[stepIndex] = createStep(DEFAULT_VELOCITY);
          selectedCell = { channelId: chId, stepIndex };
          playChannelHit(ch, undefined, DEFAULT_VELOCITY, {
            hub, chordsJson, notesJson, scalesJson,
          });
        }
        persist();
        rebuildGrid();
      });
    });

    const bindChange = (sel, fn) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const ch = findChannel(sel.dataset.ch);
        if (!ch) return;
        fn(ch, sel);
        persist();
        rebuildGrid();
      });
    };

    gridEl.querySelectorAll('.mb-mute').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = findChannel(btn.dataset.ch);
        if (!ch) return;
        ch.mute = !ch.mute;
        persist();
        rebuildGrid();
      });
    });

    gridEl.querySelectorAll('.mb-solo').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = findChannel(btn.dataset.ch);
        if (!ch) return;
        ch.solo = !ch.solo;
        persist();
        rebuildGrid();
      });
    });

    gridEl.querySelectorAll('.mb-ch-toggle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.ch;
        openChannelId = openChannelId === id ? null : id;
        rebuildGrid();
      });
    });

    gridEl.querySelectorAll('.mb-ch-pop').forEach((pop) => {
      pop.addEventListener('click', (e) => e.stopPropagation());
    });

    gridEl.querySelectorAll('.mb-type').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.type = sel.value;
        if (ch.type === 'percussion') {
          ch.bankId = 'percussion';
          ch.instrumentId = '';
          ch.voiceId = percussionVoiceOptions().some((v) => v.id === ch.voiceId) ? ch.voiceId : 'kick';
          ch.name = ch.voiceId;
        } else if (ch.type === 'note') {
          ch.bankId = 'note';
          ch.instrumentId = 'bass-sub';
          ch.pitch = ch.pitch || 'C';
          ch.octave = ch.octave ?? 2;
          ch.voiceId = ch.pitch;
          ch.name = ch.pitch;
        } else {
          ch.bankId = 'chord';
          ch.instrumentId = 'keys-pluck';
          ch.chordMode = ch.chordMode || 'named';
          const names = chordNameOptions(chordsJson, curatedKeys);
          ch.chordName = ch.chordName || names[0]?.id || '';
          ch.voiceId = ch.chordName;
          ch.scaleKey = ch.scaleKey || 'Ionian';
          ch.degree = ch.degree ?? 0;
          ch.name = ch.chordMode === 'degree' ? `deg ${ch.degree + 1}` : ch.chordName;
        }
      });
    });

    gridEl.querySelectorAll('.mb-voice').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.voiceId = sel.value;
        ch.name = sel.value;
      });
    });

    gridEl.querySelectorAll('.mb-instrument').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.instrumentId = sel.value;
      });
    });

    gridEl.querySelectorAll('.mb-pitch').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.pitch = sel.value;
        ch.voiceId = sel.value;
        ch.name = sel.value;
      });
    });

    gridEl.querySelectorAll('.mb-octave').forEach((sel) => {
      sel.addEventListener('click', (e) => e.stopPropagation());
      sel.addEventListener('change', (e) => {
        e.stopPropagation();
        const ch = findChannel(sel.dataset.ch);
        if (!ch) return;
        ch.octave = parseInt(sel.value, 10) || 4;
        persist();
      });
    });

    gridEl.querySelectorAll('.mb-chord-mode').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.chordMode = sel.value === 'degree' ? 'degree' : 'named';
      });
    });

    gridEl.querySelectorAll('.mb-chord-name').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.chordName = sel.value;
        ch.voiceId = sel.value;
        ch.name = sel.value;
      });
    });

    gridEl.querySelectorAll('.mb-scale').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.scaleKey = sel.value;
        ch.degree = 0;
      });
    });

    gridEl.querySelectorAll('.mb-degree').forEach((sel) => {
      bindChange(sel, (ch) => {
        ch.degree = parseInt(sel.value, 10) || 0;
        ch.name = `deg ${ch.degree + 1}`;
      });
    });

    gridEl.querySelectorAll('.mb-gain').forEach((input) => {
      input.addEventListener('click', (e) => e.stopPropagation());
      input.addEventListener('input', (e) => {
        e.stopPropagation();
        const ch = findChannel(input.dataset.ch);
        if (!ch) return;
        ch.gain = clamp01(parseInt(input.value, 10) / 100);
        input.title = `Channel gain ${Math.round(ch.gain * 100)}%`;
        persist();
      });
    });

    gridEl.querySelectorAll('.mb-clear-row').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const ch = findChannel(btn.dataset.ch);
        if (!ch) return;
        ch.steps = ch.steps.map(() => null);
        if (selectedCell?.channelId === ch.id) selectedCell = null;
        persist();
        rebuildGrid();
      });
    });

    gridEl.querySelectorAll('.mb-remove-ch').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = activePattern();
        if (!p || p.channels.length <= 1) return;
        p.channels = p.channels.filter((c) => c.id !== btn.dataset.ch);
        if (selectedCell?.channelId === btn.dataset.ch) selectedCell = null;
        persist();
        rebuildGrid();
      });
    });
  }

  function updateVelocityUi() {
    if (!selectedCell) {
      velInput.disabled = true;
      velVal.textContent = '—';
      return;
    }
    const ch = findChannel(selectedCell.channelId);
    const step = ch?.steps[selectedCell.stepIndex];
    if (!step) {
      velInput.disabled = true;
      velVal.textContent = '—';
      return;
    }
    velInput.disabled = false;
    velInput.value = Math.round(step.velocity * 100);
    velVal.textContent = `${Math.round(step.velocity * 100)}%`;
  }

  el.querySelectorAll('.mb-bpm-step').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      bpmInput.value = clampBpm(parseInt(bpmInput.value, 10) + parseInt(btn.dataset.delta, 10));
      project.bpm = getBpm();
      persist();
    });
  });

  bpmInput.addEventListener('change', (e) => {
    e.stopPropagation();
    project.bpm = getBpm();
    bpmInput.value = project.bpm;
    persist();
  });
  bpmInput.addEventListener('click', (e) => e.stopPropagation());

  sigSelect.addEventListener('change', (e) => {
    e.stopPropagation();
    syncMetaFromControls();
  });
  barsSelect.addEventListener('change', (e) => {
    e.stopPropagation();
    syncMetaFromControls();
  });
  swingInput.addEventListener('input', (e) => {
    e.stopPropagation();
    project.swing = clamp01(parseInt(swingInput.value, 10) / 100);
    swingVal.textContent = `${Math.round(project.swing * 100)}%`;
    persist();
  });
  swingInput.addEventListener('click', (e) => e.stopPropagation());

  modeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setPlayMode(btn.dataset.mode);
    });
  });

  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    startTransport();
  });
  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopTransport();
  });

  gridClearBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const pat = activePattern();
    if (!pat) return;
    for (const ch of pat.channels) ch.steps = ch.steps.map(() => null);
    selectedCell = null;
    persist();
    rebuildGrid();
  });

  gridResetBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const pat = activePattern();
    if (!pat) return;
    const neu = createEmptyPattern({
      id: pat.id,
      name: pat.name,
      bars: pat.bars,
      timeSignature: project.timeSignature,
    });
    resizePatternSteps(neu, project.timeSignature);
    pat.channels = neu.channels;
    selectedCell = null;
    persist();
    rebuildGrid();
  });

  recBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    setRecording(!recording);
  });
  quantizeSelect.addEventListener('click', (e) => e.stopPropagation());

  addChBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const pat = activePattern();
    if (!pat) return;
    const len = totalSteps(pat.bars, getBeatsPerMeasure());
    pat.channels.push(createChannel({
      type: 'percussion',
      voiceId: 'kick',
      name: 'kick',
      steps: Array.from({ length: len }, () => null),
    }));
    persist();
    rebuildGrid();
  });

  velInput.addEventListener('input', (e) => {
    e.stopPropagation();
    if (!selectedCell) return;
    const ch = findChannel(selectedCell.channelId);
    const step = ch?.steps[selectedCell.stepIndex];
    if (!step) return;
    step.velocity = clamp01(parseInt(velInput.value, 10) / 100);
    velVal.textContent = `${Math.round(step.velocity * 100)}%`;
    persist();
  });
  velInput.addEventListener('click', (e) => e.stopPropagation());

  patternSelect.addEventListener('click', (e) => e.stopPropagation());
  patternSelect.addEventListener('change', (e) => {
    e.stopPropagation();
    project.activePatternId = patternSelect.value;
    selectedCell = null;
    persist();
    rebuildAll();
  });

  el.querySelector('.mb-pat-new').addEventListener('click', (e) => {
    e.stopPropagation();
    const neu = createEmptyPattern({ name: `Pattern ${project.patterns.length + 1}`, bars: 1 });
    resizePatternSteps(neu, project.timeSignature);
    project.patterns.push(neu);
    project.activePatternId = neu.id;
    selectedCell = null;
    persist();
    rebuildAll();
  });

  el.querySelector('.mb-pat-dup').addEventListener('click', (e) => {
    e.stopPropagation();
    const pat = activePattern();
    if (!pat) return;
    const copy = duplicatePattern(pat);
    resizePatternSteps(copy, project.timeSignature);
    project.patterns.push(copy);
    project.activePatternId = copy.id;
    selectedCell = null;
    persist();
    rebuildAll();
  });

  el.querySelector('.mb-pat-ren').addEventListener('click', (e) => {
    e.stopPropagation();
    const pat = activePattern();
    if (!pat) return;
    const name = window.prompt('Pattern name', pat.name);
    if (!name || !name.trim()) return;
    pat.name = name.trim();
    persist();
    rebuildAll();
  });

  el.querySelector('.mb-pat-del').addEventListener('click', (e) => {
    e.stopPropagation();
    if (project.patterns.length <= 1) return;
    const id = project.activePatternId;
    project.patterns = project.patterns.filter((p) => p.id !== id);
    project.arrangement = project.arrangement.filter((c) => c.patternId !== id);
    arrangeSlots = arrangeSlots.map((s) => (s === id ? '' : s));
    if (!arrangeSlots.some(Boolean)) {
      arrangeSlots = [project.patterns[0].id];
    }
    project.arrangement = slotsToArrangement(arrangeSlots);
    project.activePatternId = project.patterns[0].id;
    selectedCell = null;
    persist();
    rebuildAll();
  });

  el.querySelector('.mb-arr-add').addEventListener('click', (e) => {
    e.stopPropagation();
    if (arrangeSlots.length >= MAX_ARRANGE_BARS) return;
    arrangeSlots.push(project.activePatternId || project.patterns[0]?.id || '');
    persist();
    rebuildArrange();
  });

  el.querySelector('.mb-arr-del').addEventListener('click', (e) => {
    e.stopPropagation();
    if (arrangeSlots.length <= 1) return;
    arrangeSlots.pop();
    persist();
    rebuildArrange();
  });

  el.querySelector('.mb-arr-clear').addEventListener('click', (e) => {
    e.stopPropagation();
    arrangeSlots = arrangeSlots.map(() => '');
    if (!arrangeSlots.length) arrangeSlots = [''];
    persist();
    rebuildArrange();
  });

  keysInst.addEventListener('click', (e) => e.stopPropagation());
  keysInst.addEventListener('change', (e) => {
    e.stopPropagation();
    stopAllPitchedSustain();
    heldKeys.clear();
  });

  el.querySelector('.mb-oct-down').addEventListener('click', (e) => {
    e.stopPropagation();
    keysOct.value = String(clampOctave((parseInt(keysOct.value, 10) || 3) - 1));
    rebuildKeyboard();
  });
  el.querySelector('.mb-oct-up').addEventListener('click', (e) => {
    e.stopPropagation();
    keysOct.value = String(clampOctave((parseInt(keysOct.value, 10) || 3) + 1));
    rebuildKeyboard();
  });

  // Close channel popover when clicking elsewhere in the panel
  el.querySelector('.magic-beatz-panel')?.addEventListener('click', () => {
    if (openChannelId == null) return;
    openChannelId = null;
    rebuildGrid();
  });

  if (hub?.subscribe) {
    hub.subscribe(() => {
      const needsRebuild = activePattern()?.channels.some(
        (c) => c.type === 'chord' && c.chordMode === 'degree'
      );
      if (needsRebuild) rebuildGrid();
    });
  }

  const { setExpanded: setExpandedRaw } = wireDockExpand(el, {
    bodyClass: 'magic-beatz-expanded',
    moduleId: 'magic-beatz',
  });
  function setExpanded(open, opts) {
    setExpandedRaw(open, opts);
    if (!open) releaseAllHeldKeys();
  }
  wireDockBarToggle(el, setExpanded);

  rebuildAll();
  return el;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

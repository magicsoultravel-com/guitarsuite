import { pickChord as applyChordPick, makeChordContext } from './chordResolve.js';
import { playVoicedChord, playChord } from './playback.js';

export function makePlayFns(notesJson) {
  return {
    playVoiced: (variant) => playVoicedChord(variant, notesJson),
    playNotes: (notes) => playChord(notes),
  };
}

export function getChordContext(hub, chordsJson, notesJson, chordsTheory) {
  return hub.getChordContext() || makeChordContext(chordsJson, notesJson, chordsTheory);
}

/** Pick by symbol — same path as the Chord dock module (`chordName`). */
export function pickChordByName(hub, ctx, name) {
  if (!name) return;
  applyChordPick(hub, ctx, makePlayFns(ctx.notesJson), { chordName: name });
}

/**
 * Standard chord chip — matches the Chord dock module (`dock-chip fb-selectable`).
 * @param {object} [options]
 * @param {string} [options.extraClass]
 * @param {string} [options.title]
 */
export function createChordChip(hub, ctx, name, options = {}) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = ['dock-chip', 'fb-selectable', options.extraClass].filter(Boolean).join(' ');
  btn.dataset.chord = name;
  btn.dataset.label = name;
  btn.textContent = name;
  btn.title = options.title || `Show ${name} on fretboard`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    pickChordByName(hub, ctx, name);
  });
  return btn;
}

export function appendChordChips(container, names, hub, ctx, options = {}) {
  container.replaceChildren();
  for (const name of names) {
    if (!name) continue;
    container.appendChild(createChordChip(hub, ctx, name, options));
  }
}

/** Replace table header cells (or any container) with standard chord chips. */
export function mountChordHeaderChips(container, hub, ctx, selector = '[data-chord]') {
  container.querySelectorAll(selector).forEach((el) => {
    const name = el.dataset.chord;
    if (!name) return;
    el.replaceChildren(createChordChip(hub, ctx, name, { extraClass: 'is-compact' }));
  });
}


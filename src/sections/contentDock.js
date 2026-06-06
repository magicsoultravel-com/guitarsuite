import { wrapAsDockModule } from '../dockSection.js';
import { initDockModules } from '../dockModule.js';
import { renderChordsAndNotes } from './songChordsNotes.js';

export const CONTENT_DOCK_ORDER = [
  'chords-notes',
  'chords-theory',
  'scales-modes',
  'scale-progressions',
  'genre-theory',
  'useful-links',
  'gallery',
];

export function renderContentDock(modules = {}) {
  const dock = document.createElement('div');
  dock.id = 'content-dock';
  dock.className = 'content-dock';

  const wrapped = {};

  for (const id of CONTENT_DOCK_ORDER) {
    const section = modules[id];
    if (!section) continue;
    const mod = wrapAsDockModule(section, {
      id,
      label: moduleLabel(id),
    });
    if (id === 'chords-notes') mod.id = 'chords-notes-section';
    wrapped[id] = mod;
    dock.appendChild(mod);
  }

  document.body.appendChild(dock);
  document.body.classList.add('has-content-dock');
  initDockModules(dock);

  function updateChordsNotes(song, chordsJson, notesJson) {
    const mod = wrapped['chords-notes'];
    if (!mod) return null;
    const panel = mod.querySelector('.dock-module-panel');
    if (!panel) return null;
    const section = renderChordsAndNotes(song, chordsJson, notesJson);
    section.querySelector('h2')?.remove();
    section.classList.remove('section');
    panel.replaceChildren(...section.childNodes);
    return section;
  }

  return { dock, wrapped, updateChordsNotes };
}

function moduleLabel(id) {
  const labels = {
    'chords-notes': 'Chords & notes',
    'chords-theory': 'Chords theory',
    'scales-modes': 'Scales & modes',
    'scale-progressions': 'Scale progressions',
    'genre-theory': 'Genre theory',
    'useful-links': 'Useful links',
    gallery: 'Image carousel',
  };
  return labels[id] || id;
}

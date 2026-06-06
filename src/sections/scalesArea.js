import { escapeHtml } from '../utils.js';
import { getScaleSemitones } from '../music.js';

function renderModesTable(scales) {
  const rows = Object.entries(scales)
    .map(([name, data]) => {
      const use = data.use ? escapeHtml(data.use) : '';
      const semitones = getScaleSemitones(data.steps).join(' ');
      return `<tr class="fb-selectable fb-scale-row" data-scale="${escapeHtml(name)}" data-steps='${JSON.stringify(data.steps)}'>
        <td>${escapeHtml(name)}</td>
        <td><code>${escapeHtml(data.steps.join(' '))}</code></td>
        <td><code>${semitones}</code></td>
        <td class="scale-use">${use}</td>
      </tr>`;
    })
    .join('');

  return `
    <p class="fb-hint">Uses the global root note. Click a row to highlight on fretboard (up to 3 layers).</p>
    <table id="scales-theory-table">
      <thead>
        <tr><th>Name</th><th>Steps</th><th>Intervals (semitones)</th><th>Typical use</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderProgressionsGrid(scales) {
  const cards = Object.keys(scales)
    .map(
      (name) =>
        `<article class="scale-prog-card" data-scale="${escapeHtml(name)}">
          <h3 class="scale-prog-card-title">${escapeHtml(name)}</h3>
          <div class="scale-prog-card-body"></div>
        </article>`,
    )
    .join('');

  return `
    <p class="fb-hint scale-prog-hint">Diatonic chords and common progressions at root <strong class="scale-prog-root">C</strong>. Click a chord to highlight and hear it.</p>
    <div class="scale-progressions-grid">${cards}</div>
  `;
}

export function renderScalesArea(scales) {
  const el = document.createElement('div');
  el.id = 'scales-area';
  el.className = 'section scales-area';
  el.innerHTML = `
    <div class="scales-area-head">
      <h2>scales</h2>
      <div class="scale-tabs" role="tablist" aria-label="Scales views">
        <button type="button" class="scale-tab is-active" role="tab" aria-selected="true" data-tab="modes">Modes</button>
        <button type="button" class="scale-tab" role="tab" aria-selected="false" data-tab="progressions">Progressions</button>
      </div>
    </div>
    <div class="scale-tab-panel" data-panel="modes" role="tabpanel">${renderModesTable(scales)}</div>
    <div class="scale-tab-panel" data-panel="progressions" role="tabpanel" hidden>${renderProgressionsGrid(scales)}</div>
  `;
  return el;
}

export function wireScalesAreaTabs(sectionEl) {
  const tabs = sectionEl.querySelectorAll('.scale-tab');
  const panels = sectionEl.querySelectorAll('.scale-tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      tabs.forEach((t) => {
        const active = t === tab;
        t.classList.toggle('is-active', active);
        t.setAttribute('aria-selected', String(active));
      });
      panels.forEach((p) => {
        p.hidden = p.dataset.panel !== id;
      });
    });
  });
}

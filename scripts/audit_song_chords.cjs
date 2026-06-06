const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'assets');
const songs = JSON.parse(fs.readFileSync(path.join(root, 'songs.json'), 'utf8'));
const chords = JSON.parse(fs.readFileSync(path.join(root, 'chords.json'), 'utf8'));
const keys = new Set(Object.keys(chords));

const all = new Set();
for (const s of songs) {
  for (const c of (s.chords || '').split(/\s+/)) {
    if (c) all.add(c);
  }
}

const missing = [...all].filter((c) => !keys.has(c)).sort();
console.log('Unique song chords:', all.size);
console.log('Missing from chords.json:', missing.length);
missing.forEach((c) => console.log(' ', c));

console.log('\nPer song gaps:');
for (const s of songs) {
  const m = [...new Set((s.chords || '').split(/\s+/))].filter((c) => c && !keys.has(c)).sort();
  if (m.length) console.log(` ${s.title}: ${m.join(', ')}`);
}

// Typos / aliases to fix in songs
const aliases = {
  AE: 'A/E',
  AM: 'Am',
  Bd: 'Bb',
  'D/f#': 'D/F#',
  'D/f#': 'D/F#',
};
console.log('\nPossible typos in songs:');
for (const c of all) {
  if (aliases[c]) console.log(` ${c} -> ${aliases[c]}`);
}

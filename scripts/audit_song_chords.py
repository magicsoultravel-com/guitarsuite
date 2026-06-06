#!/usr/bin/env python3
"""Audit song chords vs chords.json. Run: python scripts/audit_song_chords.py"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
songs = json.loads((ROOT / "assets" / "songs.json").read_text(encoding="utf-8"))
chords = json.loads((ROOT / "assets" / "chords.json").read_text(encoding="utf-8"))

all_song = set()
for s in songs:
    all_song.update(c for c in s.get("chords", "").split() if c)

missing = sorted(c for c in all_song if c not in chords)
print(f"Unique song chords: {len(all_song)}")
print(f"In chords.json: {len(all_song) - len(missing)}")
print(f"Missing: {len(missing)}")
for c in missing:
    print(f"  {c}")
print()
for s in songs:
    cs = set(s.get("chords", "").split())
    m = sorted(c for c in cs if c and c not in chords)
    if m:
        print(f"{s['title']}: {', '.join(m)}")

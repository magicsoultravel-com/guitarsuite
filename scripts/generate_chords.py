#!/usr/bin/env python3
"""Merge standard barre voicings for every theory suffix x chromatic root."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROMATIC = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

THEORY_SUFFIX = {
    "Major": "",
    "Minor": "m",
    "Diminished": "dim",
    "Augmented": "aug",
    "Major 7th": "maj7",
    "Minor 7th": "m7",
    "Dominant 7th": "7",
    "Diminished 7th": "dim7",
    "Half-Diminished 7th": "m7b5",
    "Suspended 2nd": "sus2",
    "Suspended 4th": "sus4",
    "Add 9th": "add9",
    "Minor Add 9th": "madd9",
    "6th": "6",
    "Minor 6th": "m6",
    "9th": "9",
    "Minor 9th": "m9",
}

TYPE_LABEL = {
    "": "major",
    "m": "minor",
    "dim": "diminished",
    "aug": "augmented",
    "maj7": "major7",
    "m7": "minor7",
    "7": "7",
    "dim7": "diminished7",
    "m7b5": "half-diminished7",
    "sus2": "sus2",
    "sus4": "sus4",
    "add9": "add9",
    "madd9": "minor add9",
    "6": "6",
    "m6": "minor6",
    "9": "9",
    "m9": "minor9",
}

E_SHAPE = {
    "": [0, 2, 2, 1, 0, 0],
    "m": [0, 2, 2, 0, 0, 0],
    "7": [0, 2, 0, 2, 0, 0],
    "maj7": [0, 2, 1, 1, 0, 0],
    "m7": [0, 2, 0, 0, 0, 0],
    "dim": [0, 1, 2, 0, 2, 0],
    "dim7": [0, 1, 2, 1, 2, 1],
    "m7b5": [0, 1, 2, 0, 2, 0],
    "aug": [0, 3, 2, 1, 1, 0],
    "sus2": [0, 2, 2, 2, 0, 0],
    "sus4": [0, 2, 2, 2, 0, 0],
    "6": [0, 2, 2, 1, 2, 0],
    "m6": [0, 2, 0, 1, 0, 0],
    "add9": [0, 2, 2, 1, 0, 2],
    "madd9": [0, 2, 0, 0, 0, 2],
    "9": [0, 2, 0, 2, 0, 2],
    "m9": [0, 2, 0, 0, 0, 2],
}

A_SHAPE = {
    "": [0, 2, 2, 2, 0],
    "m": [0, 2, 2, 0, 0],
    "7": [0, 2, 0, 2, 0],
    "maj7": [0, 2, 1, 1, 0],
    "m7": [0, 2, 0, 0, 0],
    "dim": [0, 1, 2, 0, None],
    "m7b5": [0, 1, 2, 0, None],
}

KEYS = ["E1", "A", "D", "G", "B", "E2"]
A_KEYS = ["A", "D", "G", "B"]


def pitch(note):
    return CHROMATIC.index(note)


def e_shape(root_note, suffix):
    offsets = E_SHAPE.get(suffix)
    if not offsets:
        return None
    base = (pitch(root_note) - 4 + 12) % 12
    if base > 11:
        return None
    shape = {}
    for k, off in zip(KEYS, offsets):
        f = base + off
        shape[k] = "x" if f > 14 else str(f)
    return shape


def a_shape(root_note, suffix):
    offsets = A_SHAPE.get(suffix)
    if not offsets:
        return e_shape(root_note, suffix)
    base = (pitch(root_note) - 9 + 12) % 12
    shape = {"E1": "x", "E2": "x"}
    for k, off in zip(A_KEYS, offsets):
        if off is None:
            shape[k] = "x"
        else:
            f = base + off
            shape[k] = "x" if f > 14 else str(f)
    return shape


def build_shape(root_note, suffix):
    s = e_shape(root_note, suffix)
    if not s or sum(1 for v in s.values() if v != "x") < 3:
        s = a_shape(root_note, suffix)
    return s


def main():
    path = ROOT / "assets" / "chords.json"
    with path.open(encoding="utf-8") as f:
        existing = json.load(f)

    added = 0
    for root_note in CHROMATIC:
        for suffix in THEORY_SUFFIX.values():
            name = root_note + suffix
            if existing.get(name, {}).get("variant1"):
                continue
            variant1 = build_shape(root_note, suffix)
            if not variant1:
                continue
            if sum(1 for v in variant1.values() if v != "x") < 3:
                continue
            existing[name] = {
                "root": root_note,
                "type": TYPE_LABEL.get(suffix, suffix or "major"),
                "variant1": variant1,
            }
            added += 1

    if "Cmaj7" in existing:
        existing["Cmaj7"]["root"] = "C"
    if "A7" in existing:
        existing["A7"]["type"] = "7"

    with path.open("w", encoding="utf-8") as f:
        json.dump(existing, f, indent=4)
        f.write("\n")

    print(f"Added {added} chords. Total: {len(existing)}")


if __name__ == "__main__":
    main()

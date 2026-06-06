<?php

class StaffGenerator {
    private $notesJson;
    private $stringOrder = ['E', 'A', 'D', 'G', 'B', 'e'];

    public function __construct($notesJson) {
        $this->notesJson = $notesJson;
    }

    public function getChordNotes($chordShape) {
        $notes = [];
        $frets = [
            'E1' => $chordShape['E1'] ?? 'x',
            'A' => $chordShape['A'] ?? 'x',
            'D' => $chordShape['D'] ?? 'x',
            'G' => $chordShape['G'] ?? 'x',
            'B' => $chordShape['B'] ?? 'x',
            'E2' => $chordShape['E2'] ?? 'x',
        ];
        foreach ($this->stringOrder as $index => $string) {
            $stringLookup = $string . ($index === 0 ? '1' : ($index === 5 ? '2' : ''));
            if (isset($frets[$stringLookup]) && $frets[$stringLookup] !== 'x' && $frets[$stringLookup] !== '') {
                $fretValue = $frets[$stringLookup];
                if (isset($this->notesJson[strtoupper($string)][$fretValue])) {
                    // More precise octave calculation (requires more info if notes.json isn't consistent)
                    $octave = (in_array(strtoupper($string), ['E', 'A', 'D', 'G', 'B'])) ? 4 : 5;
                    $notes[] = $this->notesJson[strtoupper($string)][$fretValue] . $octave;
                }
            }
        }
        return array_unique($notes);
    }

    public function generateAsciiStaff($notes) {
        $staffVisual = [
            "     ", // F5
            "-----", // E5
            "     ", // D5
            "-----", // C5
            "     ", // B4
            "-----", // A4
            "     ", // G4
            "-----", // F4
            "     ", // E4
        ];

        $noteMap = [
            "E4" => 8, "F4" => 7, "G4" => 6, "A4" => 5, "B4" => 4, "C5" => 3, "D5" => 2, "E5" => 1, "F5" => 0,
            "F#4" => 7, "G#4" => 6, "A#4" => 5, "C#5" => 3, "D#5" => 2, "F#5" => 0,
            "Eb4" => 7, "Gb4" => 5, "Ab4" => 4, "Bb4" => 3, "Db5" => 1, "Eb5" => 0, "Gb5" => 0,
        ];

        foreach ($notes as $note) {
             $baseNote = str_replace(['#', 'b'], '', $note);
            if (isset($noteMap[$baseNote])) {
                $index = $noteMap[$baseNote];
                $accidental = '';
                if (strpos($note, '#') !== false) {
                    $accidental = '#';
                } elseif (strpos($note, 'b') !== false) {
                    $accidental = 'b';
                }
                $staffVisual[$index] = "  " . $accidental . "o  ";
            }
        }

        $output = "";
        for ($i = 0; $i < count($staffVisual); $i++) {
            $output .= $staffVisual[$i] . "\n";
        }
        return $output;
    }

     public function displayStaffForSong($currentSong, $chordsJson) {
        if (isset($currentSong)) {
            $chords = explode(' ', $currentSong['chords']);
            $unique_chords = array_unique($chords);
            echo "<div class=\"section\">";
            echo "<h2>Musical Staff</h2>";
            echo "<div class=\"chord-staff\">";
            foreach ($unique_chords as $chordName) {
                if (isset($chordsJson[$chordName])) {
                    echo "<div style=\"margin-bottom: 20px;\">";
                    echo "<strong>$chordName</strong><br>";
                    echo "<pre>" . $this->generateAsciiStaff($this->getChordNotes($chordsJson[$chordName]['variant1'])) . "</pre>";
                    echo "</div>";
                }
            }
            echo "</div>";
            echo "</div>";
        } else {
            echo "<div class=\"section\"><p>No song selected to display musical staff.</p></div>";
        }
    }
}
?>

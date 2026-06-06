<?php
global $currentSong;
$chordsJson = json_decode(file_get_contents(__DIR__ . '/../assets/chords.json'), true);
$notesJson = json_decode(file_get_contents(__DIR__ . '/../assets/notes.json'), true);
//$stringOrder = ['E', 'A', 'D', 'G', 'B', 'e'];
$musicalOrder = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];

function getChordNotes($chordShape, $notesJson) {
    $notes = [];
    $frets = [
        'E1' => $chordShape['E1'] ?? 'x',
        'A' => $chordShape['A'] ?? 'x',
        'D' => $chordShape['D'] ?? 'x',
        'G' => $chordShape['G'] ?? 'x',
        'B' => $chordShape['B'] ?? 'x',
        'E2' => $chordShape['E2'] ?? 'x',
    ];
    //global $stringOrder; // Access the global variable
    foreach ($frets as $stringKey => $fretValue) {
        $stringBase = strtoupper(str_replace(['1', '2'], '', $stringKey));
        if ($fretValue !== 'x' && $fretValue !== '') {
            // Ensure the key exists before accessing
            if (isset($notesJson[$stringBase][$fretValue])) {
                $notes[] = $notesJson[$stringBase][$fretValue];
            }
        }
    }
    return array_unique($notes);
}

function sortNotesByMusicalOrder($notes, $musicalOrder) {
    usort($notes, function($a, $b) use ($musicalOrder) {
        $indexA = array_search($a, $musicalOrder);
        $indexB = array_search($b, $musicalOrder);
        if ($indexA === false) $indexA = PHP_INT_MAX;
        if ($indexB === false) $indexB = PHP_INT_MAX;
        return $indexA <=> $indexB;
    });
    return $notes;
}

// Check if $currentSong is set and if JSONs were loaded successfully
if (isset($currentSong) && $chordsJson !== null && $notesJson !== null) {
    $chords = explode(' ', $currentSong['chords']);
    $unique_chords = array_unique($chords);

    // --- Data Collection for Table ---
    $allChordNotes = [];
    $maxNotes = 0;

    foreach ($unique_chords as $chordName) {
        if (isset($chordsJson[$chordName]['variant1']) && is_array($chordsJson[$chordName]['variant1'])) {
            $notesForChord = getChordNotes($chordsJson[$chordName]['variant1'], $notesJson);
            $sortedNotes = sortNotesByMusicalOrder($notesForChord, $musicalOrder);
            $allChordNotes[$chordName] = $sortedNotes;
            $maxNotes = max($maxNotes, count($sortedNotes));
        } else {
            // If no shape data, use a placeholder
            $allChordNotes[$chordName] = ['N/A'];
            $maxNotes = max($maxNotes, 1); // Ensure at least one row for "N/A"
        }
    }
    // --- End Data Collection ---
    ?>

    <div class="section">
        <h2>notes</h2>
        <div>
            <table>
                <thead>
                    <tr>
                        <?php foreach (array_keys($allChordNotes) as $chordName) : ?>
                            <th><?php echo htmlspecialchars($chordName); ?></th>
                        <?php endforeach; ?>
                    </tr>
                </thead>
                <tbody>
                    <?php for ($i = 0; $i < $maxNotes; $i++) : ?>
                        <tr>
                            <?php foreach (array_keys($allChordNotes) as $chordName) : ?>
                                <td>
                                    <?php
                                    // Display the note if it exists for this row, otherwise display a non-breaking space
                                    if (isset($allChordNotes[$chordName][$i])) {
                                        echo htmlspecialchars($allChordNotes[$chordName][$i]);
                                    } else {
                                        echo '&nbsp;';
                                    }
                                    ?>
                                </td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endfor; ?>
                </tbody>
            </table>
        </div>
    </div>

<?php
} else {
    // Better message if JSONs failed to load or song not selected
    echo '<div class="section"><p>Cannot display musical notes. Either no song is selected, or required data files (chords.json/notes.json) could not be loaded.</p></div>';
    // Optionally log errors here for silent failures on production
    if ($chordsJson === null) error_log("ERROR: chords.json failed to load/parse in musical-notes.php");
    if ($notesJson === null) error_log("ERROR: notes.json failed to load/parse in musical-notes.php");
}
?>
<div class="section">
    <h2>chords</h2>
    <div>
    <?php
    global $currentSong; // Ensure $currentSong is accessible from song-book.php

    $chordsJsonPath = __DIR__.'/../assets/chords.json';
    $chordsJson = []; // Initialize to empty array

    $chordsFileContent = file_get_contents($chordsJsonPath);
    if ($chordsFileContent === false) {
        // Log error if file can't be read, but don't stop execution
        error_log("ERROR: Failed to read chords.json at: " . $chordsJsonPath);
    } else {
        $chordsJson = json_decode($chordsFileContent, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            // Log error if JSON parsing fails
            error_log("ERROR: Failed to parse chords.json: " . json_last_error_msg());
            $chordsJson = []; // Ensure it's an empty array if parsing failed
        }
    }

    if (isset($currentSong) && !empty($currentSong['chords'])) {
        $chords = explode(' ', $currentSong['chords']);
        $unique_chords = array_unique($chords);

        // --- Data Collection for Table ---
        $allChordFrets = [];
        $maxFrets = 0;

        foreach ($unique_chords as $chord) {
            if (isset($chordsJson[$chord]['variant1']) && is_array($chordsJson[$chord]['variant1'])) {
                // Get just the fret values as a simple array
                $frets = array_values($chordsJson[$chord]['variant1']);
                $allChordFrets[$chord] = $frets;
                $maxFrets = max($maxFrets, count($frets));
            } else {
                // If no shape data, use a placeholder
                $allChordFrets[$chord] = ['N/A'];
                $maxFrets = max($maxFrets, 1); // Ensure at least one row for "N/A"
            }
        }
        // --- End Data Collection ---
        ?>

        <table>
            <thead>
                <tr>
                    <?php foreach (array_keys($allChordFrets) as $chordName) : ?>
                        <th><?php echo htmlspecialchars($chordName); ?></th>
                    <?php endforeach; ?>
                </tr>
            </thead>
            <tbody>
                <?php for ($i = 0; $i < $maxFrets; $i++) : ?>
                    <tr>
                        <?php foreach (array_keys($allChordFrets) as $chordName) : ?>
                            <td>
                                <?php
                                // Display the fret value if it exists for this row, otherwise display a non-breaking space
                                if (isset($allChordFrets[$chordName][$i])) {
                                    echo htmlspecialchars($allChordFrets[$chordName][$i]);
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
        <div id="tablature-display"></div>

    <?php } elseif (isset($currentSong) && empty($currentSong['chords'])) {
        echo '<p>Current song has no chords defined.</p>';
    } else {
        echo 'No song selected or $currentSong not available.';
    }
    ?>
    </div>
</div>
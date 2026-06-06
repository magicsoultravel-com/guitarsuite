<?php
// Ensure session_start() is at the very top of your main page (e.g., index.php)
// before including any template files.
require_once __DIR__ . '/../inc/auth.php'; // Make sure auth.php is included for is_admin()

$isLoggedIn = is_logged_in();
$isAdmin = is_admin(); // Ensure this function is available and correctly determines admin status

$songUploadError = '';
$songUploadSuccess = '';
$chordUploadError = '';
$chordUploadSuccess = '';

// --- PHP Logic for Song Uploader ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['form_type']) && $_POST['form_type'] == 'song_uploader') {
    if (!$isAdmin) {
        $songUploadError = 'You do not have permission to add songs.';
    } else {
        $songsJsonPath = __DIR__ . '/../assets/songs.json';
        $songsJson = json_decode(file_get_contents($songsJsonPath), true);
        if (!is_array($songsJson)) {
            $songsJson = []; // Initialize if file is empty or invalid
        }

        $title = trim($_POST['title']);
        $artist = trim($_POST['artist']);
        $chords = trim($_POST['chords']);

        // Check if song with this title already exists
        foreach ($songsJson as $song) {
            if (isset($song['title']) && strcasecmp($song['title'], $title) === 0) { // Case-insensitive check
                $songUploadError = 'Song with this title already exists.';
                break;
            }
        }

        if (!$songUploadError) {
            if (empty($title)) {
                $songUploadError = 'Title cannot be empty.';
            } else if (empty($artist)) {
                $songUploadError = 'Artist cannot be empty.';
            } else if (empty($chords)) {
                $songUploadError = 'Chords cannot be empty.';
            } else {
                $newSongId = 1;
                if (!empty($songsJson)) {
                    // Find the maximum existing ID and add 1
                    $maxId = 0;
                    foreach ($songsJson as $song) {
                        if (isset($song['id']) && $song['id'] > $maxId) {
                            $maxId = $song['id'];
                        }
                    }
                    $newSongId = $maxId + 1;
                }

                $newSong = [
                    'id' => $newSongId,
                    'title' => $title,
                    'artist' => $artist,
                    'chords' => $chords,
                ];
                $songsJson[] = $newSong;
                file_put_contents($songsJsonPath, json_encode($songsJson, JSON_PRETTY_PRINT));
                $songUploadSuccess = 'Song added successfully.';
            }
        }
    }
}

// --- PHP Logic for Chord Uploader ---
if ($_SERVER['REQUEST_METHOD'] == 'POST' && isset($_POST['form_type']) && $_POST['form_type'] == 'chord_uploader') {
    if (!$isAdmin) {
        $chordUploadError = 'You do not have permission to add chords.';
    } else {
        $chordsJsonPath = __DIR__ . '/../assets/chords.json';
        $chordsJson = json_decode(file_get_contents($chordsJsonPath), true);
        if (!is_array($chordsJson)) {
            $chordsJson = []; // Initialize if file is empty or invalid
        }

        $chordName = trim($_POST['chord_name']);
        $root = trim($_POST['root']);
        $type = trim($_POST['type']);
        $E1 = trim($_POST['E1']);
        $A = trim($_POST['A']);
        $D = trim($_POST['D']);
        $G = trim($_POST['G']);
        $B = trim($_POST['B']);
        $E2 = trim($_POST['E2']);

        if ($chordName === '') {
            $chordUploadError = 'Chord name cannot be empty.';
        } elseif (isset($chordsJson[$chordName])) {
            $chordUploadError = 'Chord with this name already exists.';
        }

        // Validate frets (can be 'x', empty, or numeric)
        $fretValues = [$E1, $A, $D, $G, $B, $E2];
        foreach ($fretValues as $fret) {
            if ($fret !== 'x' && $fret !== '' && !is_numeric($fret)) {
                $chordUploadError = 'Fret values must be numeric, "x", or empty.';
                break;
            }
        }

        if (!$chordUploadError) {
            if (empty($root)) {
                $chordUploadError = 'Root cannot be empty.';
            } else if (empty($type)) {
                $chordUploadError = 'Type cannot be empty.';
            } else {
                $chordsJson[$chordName] = [
                    'root' => $root,
                    'type' => $type,
                    'variant1' => [
                        'E1' => $E1,
                        'A' => $A,
                        'D' => $D,
                        'G' => $G,
                        'B' => $B,
                        'E2' => $E2,
                    ],
                ];

                file_put_contents($chordsJsonPath, json_encode($chordsJson, JSON_PRETTY_PRINT));
                $chordUploadSuccess = 'Chord added successfully.';
            }
        }
    }
}
?>

<style>
    /* Styles for the main section container (consistent) */
    .section {
        border: 1px solid #ddd;
        padding: 15px;
        margin-bottom: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
        position: relative;
    }
    /* Removed .section-content and .toggle-collapse related styles from here */


    /* Styles specific to the uploader forms */
    .form-selector-buttons {
        margin-bottom: 20px;
    }

    .form-selector-buttons button {
        padding: 10px 15px;
        font-size: 1em;
        margin-right: 10px;
        cursor: pointer;
        background-color: #007bff;
        color: white;
        border: none;
        border-radius: 4px;
        transition: background-color 0.2s ease;
    }

    .form-selector-buttons button:hover {
        background-color: #0056b3;
    }

    .form-selector-buttons button.active {
        background-color: #0056b3;
        border: 2px solid #004085;
    }

    .uploader-form-container {
        border: 1px solid #e0e0e0;
        padding: 20px;
        margin-top: 20px;
        border-radius: 5px;
        background-color: #fff;
        /* Initially hide forms */
        display: none;
    }
    .uploader-form-container.active {
        display: block; /* Show active form */
    }

    .uploader-form-container label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
    }

    .uploader-form-container input[type="text"],
    .uploader-form-container textarea {
        width: calc(100% - 22px); /* Account for padding and border */
        padding: 10px;
        margin-bottom: 15px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box; /* Include padding and border in the element's total width and height */
    }

    .uploader-form-container input[type="submit"] {
        padding: 10px 20px;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1em;
        transition: background-color 0.2s ease;
    }

    .uploader-form-container input[type="submit"]:hover {
        background-color: #218838;
    }

    .message {
        margin-top: 10px;
        padding: 10px;
        border-radius: 4px;
        font-weight: bold;
    }

    .message.error {
        color: #dc3545;
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
    }

    .message.success {
        color: #28a745;
        background-color: #d4edda;
        border: 1px solid #c3e6cb;
    }
</style>

<div class="section">
    <h2 style="display: inline-block; margin: 0;">Song and Chord Uploader</h2>
    <div>
        <div class="form-selector-buttons">
            <button id="show-song-form-btn">Add New Song</button>
            <button id="show-chord-form-btn">Add New Chord</button>
        </div>

        <div id="song-uploader-form-container" class="uploader-form-container">
            <h3>Add New Song</h3>
            <form method="post" action="">
                <input type="hidden" name="form_type" value="song_uploader">
                <label for="song_title">Title:</label>
                <input type="text" id="song_title" name="title" value="<?php echo htmlspecialchars($_POST['title'] ?? ''); ?>" required><br>
                <label for="song_artist">Artist:</label>
                <input type="text" id="song_artist" name="artist" value="<?php echo htmlspecialchars($_POST['artist'] ?? ''); ?>" required><br>
                <label for="song_chords">Chords (space separated):</label>
                <textarea id="song_chords" name="chords" rows="5" cols="50" required><?php echo htmlspecialchars($_POST['chords'] ?? ''); ?></textarea><br>
                <input type="submit" value="Add Song">
                <?php if ($songUploadError) : ?>
                    <p class="message error"><?php echo htmlspecialchars($songUploadError); ?></p>
                <?php elseif ($songUploadSuccess) : ?>
                    <p class="message success"><?php echo htmlspecialchars($songUploadSuccess); ?></p>
                <?php endif; ?>
            </form>
        </div>

        <div id="chord-uploader-form-container" class="uploader-form-container">
            <h3>Add New Chord</h3>
            <form method="post" action="">
                <input type="hidden" name="form_type" value="chord_uploader">
                <label for="chord_name">Chord Name (e.g., C, Gmin7):</label>
                <input type="text" id="chord_name" name="chord_name" value="<?php echo htmlspecialchars($_POST['chord_name'] ?? ''); ?>" required><br>
                <label for="chord_root">Root (e.g., C, G):</label>
                <input type="text" id="chord_root" name="root" value="<?php echo htmlspecialchars($_POST['root'] ?? ''); ?>" required><br>
                <label for="chord_type">Type (e.g., major, min7):</label>
                <input type="text" id="chord_type" name="type" value="<?php echo htmlspecialchars($_POST['type'] ?? ''); ?>" required><br>
                <h4>Fret Positions (x for muted, 0 for open):</h4>
                <label for="E1_fret">Low E (E1):</label>
                <input type="text" id="E1_fret" name="E1" value="<?php echo htmlspecialchars($_POST['E1'] ?? 'x'); ?>" required><br>
                <label for="A_fret">A:</label>
                <input type="text" id="A_fret" name="A" value="<?php echo htmlspecialchars($_POST['A'] ?? 'x'); ?>" required><br>
                <label for="D_fret">D:</label>
                <input type="text" id="D_fret" name="D" value="<?php echo htmlspecialchars($_POST['D'] ?? 'x'); ?>" required><br>
                <label for="G_fret">G:</label>
                <input type="text" id="G_fret" name="G" value="<?php echo htmlspecialchars($_POST['G'] ?? 'x'); ?>" required><br>
                <label for="B_fret">B:</label>
                <input type="text" id="B_fret" name="B" value="<?php echo htmlspecialchars($_POST['B'] ?? 'x'); ?>" required><br>
                <label for="E2_fret">High E (E2):</label>
                <input type="text" id="E2_fret" name="E2" value="<?php echo htmlspecialchars($_POST['E2'] ?? 'x'); ?>" required><br>
                <input type="submit" value="Add Chord">
                <?php if ($chordUploadError) : ?>
                    <p class="message error"><?php echo htmlspecialchars($chordUploadError); ?></p>
                <?php elseif ($chordUploadSuccess) : ?>
                    <p class="message success"><?php echo htmlspecialchars($chordUploadSuccess); ?></p>
                <?php endif; ?>
            </form>
        </div>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const showSongFormBtn = document.getElementById('show-song-form-btn');
    const showChordFormBtn = document.getElementById('show-chord-form-btn');
    const songFormContainer = document.getElementById('song-uploader-form-container');
    const chordFormContainer = document.getElementById('chord-uploader-form-container');

    // --- Form Switching Logic (retained as it's specific to this section) ---
    function showForm(formToShow, buttonToActivate) {
        // Hide all forms
        songFormContainer.classList.remove('active');
        chordFormContainer.classList.remove('active');

        // Deactivate all buttons
        showSongFormBtn.classList.remove('active');
        showChordFormBtn.classList.remove('active');

        // Show the selected form and activate its button
        formToShow.classList.add('active');
        buttonToActivate.classList.add('active');
    }

    showSongFormBtn.addEventListener('click', () => showForm(songFormContainer, showSongFormBtn));
    showChordFormBtn.addEventListener('click', () => showForm(chordFormContainer, showChordFormBtn));

    // --- Handle post-submission state ---
    // If there was a submission, determine which form was active and display it.
    // This makes sure the form stays open and visible after submission.
    <?php if ($songUploadError || $songUploadSuccess) : ?>
        showForm(songFormContainer, showSongFormBtn);
    <?php elseif ($chordUploadError || $chordUploadSuccess) : ?>
        showForm(chordFormContainer, showChordFormBtn);
    <?php else : ?>
        // On initial load, by default, show the song upload form
        showForm(songFormContainer, showSongFormBtn);
    <?php endif; ?>
});
</script>
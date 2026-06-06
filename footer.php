<?php
// Ensure session is started in your main file (e.g., index.php)
// before including any template files.
// For example, in index.php:
// <?php session_start(); require_once 'templates/header.php'; ... require_once 'templates/chords-db.php'; ... require_once 'templates/footer.php'; ? >

require_once __DIR__ . '/../inc/auth.php';
$isLoggedIn = is_logged_in();
$email = $_SESSION['email'] ?? '';
// Using the is_admin() function from auth.php for consistency
$isAdmin = is_admin();

$chords = json_decode(file_get_contents(__DIR__ . '/../assets/chords.json'), true);
// Removed notesJson loading as it's only used for audio playback

if (isset($_GET['edit']) && $isAdmin) {
    $editChord = $_GET['edit'];
    if (isset($_POST['save'])) {
        // Save changes to JSON file
        $chords[$editChord]['root'] = $_POST['root'];
        $chords[$editChord]['type'] = $_POST['type'];
        $variant1 = array();
        // Ensure variant1 is an array before looping
        if (isset($_POST['variant1']) && is_array($_POST['variant1'])) {
            foreach ($_POST['variant1'] as $string => $fret) {
                $variant1[$string] = $fret;
            }
        }
        $chords[$editChord]['variant1'] = $variant1;
        // Use JSON_PRETTY_PRINT for readability in the JSON file
        file_put_contents(__DIR__ . '/../assets/chords.json', json_encode($chords, JSON_PRETTY_PRINT));
        header('Location: chords-db.php');
        exit;
    }
}

// Removed getChordMidiNotes function as it's only for audio playback

?>

<style>
    /* Table specific styles */
    table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px; /* Spacing from the section header */
    }

    th, td {
        padding: 10px;
        text-align: left;
        border: 1px solid #ccc;
    }

    th {
        background-color: #f0f0f0;
    }

    .edit-mode {
        background-color: #ffffcc;
    }

    /* Styles for the section container */
    .section {
        border: 1px solid #ddd;
        padding: 15px;
        margin-bottom: 20px;
        background-color: #f9f9f9;
        border-radius: 5px;
        position: relative; /* Needed for absolute positioning of the button */
    }
    /* Removed .section-content and .toggle-collapse related styles */
</style>

<div class="section">
    <h2 style="display: inline-block; margin: 0;">Chords Database</h2>
    <div style="max-height: 1000px; overflow: visible;"> <table>
            <tr>
                <th>Chord</th>
                <th>Root</th>
                <th>Type</th>
                <th>Variant 1</th>
                <th>Action</th>
            </tr>
            <?php foreach ($chords as $chordName => $chord) {
                $isEditing = isset($_GET['edit']) && $_GET['edit'] == $chordName && $isAdmin;
            ?>
            <tr <?php if ($isEditing) echo 'class="edit-mode"'; ?>>
                <?php if ($isEditing) { ?>
                    <form id="edit-form-<?php echo htmlspecialchars($chordName); ?>" method="post">
                <?php } ?>
                <td><?php echo htmlspecialchars($chordName); ?></td>
                <?php if ($isEditing) { ?>
                    <td><input type="text" name="root" value="<?php echo htmlspecialchars($chord['root'] ?? ''); ?>" form="edit-form-<?php echo htmlspecialchars($chordName); ?>"></td>
                    <td><input type="text" name="type" value="<?php echo htmlspecialchars($chord['type'] ?? ''); ?>" form="edit-form-<?php echo htmlspecialchars($chordName); ?>"></td>
                    <td>
                        <?php
                        // Ensure 'variant1' exists and is an array before iterating
                        if (isset($chord['variant1']) && is_array($chord['variant1'])) {
                            foreach ($chord['variant1'] as $string => $fret) { ?>
                                <label><?php echo htmlspecialchars($string); ?>:</label>
                                <input type="text" name="variant1[<?php echo htmlspecialchars($string); ?>]" value="<?php echo htmlspecialchars($fret); ?>" form="edit-form-<?php echo htmlspecialchars($chordName); ?>"><br>
                            <?php }
                        } else {
                            echo '<div class="no-shape">No variant1 data</div>';
                        }
                        ?>
                        <input type="hidden" name="save" value="1" form="edit-form-<?php echo htmlspecialchars($chordName); ?>">
                    </td>
                    <td>
                        <button type="submit" form="edit-form-<?php echo htmlspecialchars($chordName); ?>">Save</button>
                        <a href="chords-db.php">Cancel</a>
                    </td>
                <?php } else { ?>
                    <td><?php echo htmlspecialchars($chord['root'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($chord['type'] ?? ''); ?></td>
                    <td>
                        <?php
                        // Ensure 'variant1' exists and is an array before iterating
                        if (isset($chord['variant1']) && is_array($chord['variant1'])) {
                            foreach ($chord['variant1'] as $string => $fret) { ?>
                                <?php echo htmlspecialchars($string); ?>: <?php echo htmlspecialchars($fret); ?><br>
                            <?php }
                        } else {
                            echo '<div class="no-shape">No variant1 data</div>';
                        }
                        ?>
                    </td>
                    <td>
                        <?php if ($isAdmin) { ?>
                            <a href="?edit=<?php echo htmlspecialchars($chordName); ?>">Edit</a>
                        <?php } ?>
                    </td>
                <?php } ?>
                <?php if ($isEditing) { ?>
                    </form>
                <?php } ?>
            </tr>
            <?php } ?>
        </table>
    </div>
</div>
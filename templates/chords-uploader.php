<div class="section">
    <?php
    $filePath = __DIR__ . '/../assets/chords.json';
    $chordsJson = json_decode(file_get_contents($filePath), true);
    if (!is_array($chordsJson)) {
        $chordsJson = [];
    }

    $error = '';
    $success = '';

    if ($_SERVER['REQUEST_METHOD'] == 'POST' && $_POST['form_type'] == 'chord_uploader') {
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
            $error = 'Chord name cannot be empty';
        } elseif (isset($chordsJson[$chordName])) {
            $error = 'Chord with this name already exists';
        }

        if (!$error) {
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

            file_put_contents($filePath, json_encode($chordsJson, JSON_PRETTY_PRINT));
            $success = 'Chord added successfully';
        }
    }
    ?>
    <h2>Chords Uploader</h2>
    <form method="post">
        <input type="hidden" name="form_type" value="chord_uploader">
        <label for="chord_name">Chord Name (key):</label>
        <input type="text" id="chord_name" name="chord_name" required><br><br>
        <label for="root">Root:</label>
        <input type="text" id="root" name="root" required><br><br>
        <label for="type">Type:</label>
        <input type="text" id="type" name="type" required><br><br>
        <label for="E1">E1:</label>
        <input type="text" id="E1" name="E1" required><br><br>
        <label for="A">A:</label>
        <input type="text" id="A" name="A" required><br><br>
        <label for="D">D:</label>
        <input type="text" id="D" name="D" required><br><br>
        <label for="G">G:</label>
        <input type="text" id="G" name="G" required><br><br>
        <label for="B">B:</label>
        <input type="text" id="B" name="B" required><br><br>
        <label for="E2">E2:</label>
        <input type="text" id="E2" name="E2" required><br><br>
        <input type="submit" value="Add Chord">
        <?php if ($error) : ?>
            <p style="color: red;"><?php echo $error; ?></p>
        <?php elseif ($success) : ?>
            <p style="color: green;"><?php echo $success; ?></p>
        <?php endif; ?>
    </form>
</div>

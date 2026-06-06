<div class="section">
    <?php
    $songsJson = json_decode(file_get_contents(__DIR__ . '/../assets/songs.json'), true);
    $error = '';
    $success = '';

    if ($_SERVER['REQUEST_METHOD'] == 'POST' && $_POST['form_type'] == 'song_uploader') {
        $title = $_POST['title'];
        foreach ($songsJson as $song) {
            if ($song['title'] == $title) {
                $error = 'Song with this title already exists';
                break;
            }
        }
        if (!$error) {
            $newSong = [
                'id' => count($songsJson) + 1,
                'title' => $title,
                'artist' => $_POST['artist'],
                'chords' => $_POST['chords'],
            ];
            $songsJson[] = $newSong;
            file_put_contents(__DIR__ . '/../assets/songs.json', json_encode($songsJson, JSON_PRETTY_PRINT));
            $success = 'Song added successfully';
        }
    }
    ?>
    <h2>Songs Uploader</h2>
    <form method="post">
        <input type="hidden" name="form_type" value="song_uploader">
        <label for="title">Title:</label>
        <input type="text" id="title" name="title"><br><br>
        <label for="artist">Artist:</label>
        <input type="text" id="artist" name="artist"><br><br>
        <label for="chords">Chords:</label>
        <textarea id="chords" name="chords" rows="5" cols="50"></textarea><br><br>
        <input type="submit" value="Add Song">
        <?php if ($error) : ?>
            <p style="color: red;"><?php echo $error; ?></p>
        <?php elseif ($success) : ?>
            <p style="color: green;"><?php echo $success; ?></p>
        <?php endif; ?>
    </form>
</div>
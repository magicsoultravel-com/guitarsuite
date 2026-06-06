<div class="section" style="position: relative;">
    <h2 style="display: inline-block; margin: 0;">now playing</h2>
    <div style="margin-top: 10px;"> 

    <?php
    global $currentSong;
    $songs = json_decode(file_get_contents(__DIR__ . '/../assets/songs.json'), true);
    $chords = json_decode(file_get_contents(__DIR__ . '/../assets/chords.json'), true);
    $currentSongIndex = isset($_GET['songIndex']) ? (int)$_GET['songIndex'] : 0;
    if (!empty($songs) && isset($songs[$currentSongIndex])) {
        $currentSong = $songs[$currentSongIndex];
        ?>

        <div class="now-playing" style="flex-grow: 1;">
            <p>
                "<?php echo htmlspecialchars($currentSong['title']); ?>" by <?php echo htmlspecialchars($currentSong['artist']); ?>
            </p>
        </div>

        
            <a 
                href="?songIndex=<?php echo ($currentSongIndex - 1 + count($songs)) % count($songs); ?>" 
                >Previous</a>
            <a 
                href="?songIndex=<?php echo ($currentSongIndex + 1) % count($songs); ?>" 
                          >Next</a>
        

     
            <p>
                Total Songs: <a href="templates/songs-db.php" style="text-decoration: none;"><?php echo count($songs); ?></a>
            </p>
            <p>
                Total Chords: <a href="templates/chords-db.php" style="text-decoration: none;"><?php echo count($chords); ?></a>
<br><br>
            </p>

            <button id="show-chords-button">show</button>
            <div id="chords-container" style="display: none;">
                <?php
                $chordsArray = explode(' ', $currentSong['chords']);
                $chordLines = [];
                foreach (array_chunk($chordsArray, 4) as $line) {
                    $chordLines[] = implode(' ', $line);
                }
                echo implode(' | ', $chordLines);
                ?>
            </div>

    <?php } else {
        echo '<p>No song found at index ' . htmlspecialchars($currentSongIndex) . '</p>';
    }
    ?>
<br><br>
</div>

<script>
document.getElementById('show-chords-button').addEventListener('click', function() {
    var chordsContainer = document.getElementById('chords-container');
    if (chordsContainer.style.display === 'none') {
        chordsContainer.style.display = 'block';
        this.textContent = 'hide';
    } else {
        chordsContainer.style.display = 'none';
        this.textContent = 'show';
    }
});
</script>
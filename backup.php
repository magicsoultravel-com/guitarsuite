<?php
include_once __DIR__ . '/../inc/StaffGenerator.php';

global $currentSong;
$notesJson = json_decode(file_get_contents(__DIR__ . '/../assets/notes.json'), true);
$chordsJson = json_decode(file_get_contents(__DIR__ . '/../assets/chords.json'), true);
$staffGenerator = new StaffGenerator($notesJson);

$staffGenerator->displayStaffForSong($currentSong, $chordsJson);
?>
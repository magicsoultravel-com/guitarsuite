<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/inc/auth.php';
require_once __DIR__ . '/inc/content.php';
require_once __DIR__ . '/inc/comments.php';

$isLoggedIn = is_logged_in();
$email = $_SESSION['email'] ?? ''; 
echo '<div class="main-container">'; // A new wrapper for your main content sections
echo '<div class="sections-wrapper">';

include __DIR__ . '/templates/header.php';
include __DIR__ . '/templates/song-book.php';
include __DIR__ . '/templates/chords-sheet.php';
include __DIR__ . '/templates/musical-notes.php';
include __DIR__ . '/templates/fretboard-display.php';
include __DIR__ . '/templates/chords-theory.php';
include __DIR__ . '/templates/scales-theory.php';
include __DIR__ . '/templates/metronome.php';
include __DIR__ . '/templates/useful-links.php';
include __DIR__ . '/templates/blogger-developer.php';




        $sections = ['about']; // Define the sections you want to load
        foreach ($sections as $section_name) {
            $content = load_content($section_name);

            if (!empty($content) && isset($content['title']) && isset($content['body'])) {
                echo '<section class="section ' . htmlspecialchars($section_name) . '-section">';
                echo '<h2>' . htmlspecialchars($content['title']) . '</h2>';
                echo '<div class="left-align">' . $content['body'] . '</div>';
                echo '</section>';
            } else {
                echo '<section class="section error-section">';
                echo '<h2>Error loading ' . htmlspecialchars($section_name) . ' content.</h2>';
                echo '</section>';
            }
        }



include __DIR__ . '/templates/gallery-carousel.php'; 
echo '</div>';
echo '</div>'; // Closes <div class="sections-wrapper">

include __DIR__ . '/templates/footer.php';

?>
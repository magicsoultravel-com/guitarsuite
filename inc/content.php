<?php
function load_content($page) {
    $path = __DIR__ . '/../content/' . $page . '.json';
    if (!file_exists($path)) return ['title' => 'Error', 'body' => 'Content not found.'];
    $json = file_get_contents($path);
    return json_decode($json, true) ?? ['title' => 'Error', 'body' => 'Invalid content format.'];
}

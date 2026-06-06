<?php
// utils.php — Shared utility functions

function log_event($message) {
    $logFile = __DIR__ . '/../logs/access.log';
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($logFile, "[$timestamp] $message\n", FILE_APPEND);
}

function generate_token($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

function sanitize_email($email) {
    return filter_var(trim($email), FILTER_SANITIZE_EMAIL);
}

function log_access_event($message) {
    $logfile = __DIR__ . '/../logs/access.log';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $time = date('Y-m-d H:i:s');
    $entry = "[$time] [$ip] $message\n";
    file_put_contents($logfile, $entry, FILE_APPEND);
}

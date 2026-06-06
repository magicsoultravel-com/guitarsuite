<?php
// inc/config.php — Site configuration

$config = [
    // Site settings
    'site_name' => 'guitar suite', // Changed to match your site title from header.php

    // File paths for logs (if needed, these don't interfere with user management)
    // 'log_file' => __DIR__ . '/../logs/access.log',
    // 'mail_log' => __DIR__ . '/../logs/mail.log',
];

// No need to define ADMIN_EMAIL here, as admin status is checked dynamically from users.json.
// The static admin entry (Donny) has been removed to prevent conflicts and security issues.
?>
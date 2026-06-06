<?php
require_once(__DIR__ . '/../inc/auth.php');

$email = strtolower(trim($_GET['email'] ?? ''));

if (!$email) {
    exit('No email provided.');
}

$users = load_users();
if (!isset($users[$email])) {
    exit('Invalid user.');
}

$users[$email]['verified'] = true;
save_users($users);

echo "Email verified. You can now <a href='login.php'>login</a>.";

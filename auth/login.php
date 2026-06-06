<?php

// Ensure session is started at the very beginning
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once(__DIR__ . '/../inc/auth.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    // Use get_user_by_email to fetch the specific user, which is more direct
    $user = get_user_by_email($email);

    // Instead of exiting abruptly, we should handle these with redirects
    // and potentially store error messages in the session to display on the form.
    // For now, adhering to your previous 'exit' behavior for minimal changes:

    if (!$user) { // If user is null, user not found
        exit('User not found.');
    }

    if (!($user['verified'] ?? false)) { // Check 'verified' status, safely handling if key is missing
        exit('Email not verified.');
    }

    if (!password_verify($password, $user['password'])) {
        exit('Invalid password.');
    }

    // --- CRUCIAL CHANGE: Set email in session and redirect immediately ---
    $_SESSION['email'] = $email; // Set the email in the session for the logged-in user

    // Redirect to the main index page
    // Calculate the path dynamically to handle different server configurations
    $redirectPath = dirname(dirname($_SERVER['SCRIPT_NAME'])) . '/index.php';
    header("Location: " . $redirectPath); // Immediate redirect
    exit; // Always exit after a header redirect
}
?>

<form method="post">
  Email: <input type="email" name="email" required><br>
  Password: <input type="password" name="password" required><br>
  <input type="submit" value="Login">
</form>
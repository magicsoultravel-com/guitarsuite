<?php
// Start the session at the very beginning
session_start();

// Unset all session variables to clear user data
$_SESSION = array();

// Destroy the session cookie on the client side
// This ensures the session ID is no longer valid
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Destroy the session on the server side
session_destroy();

// --- CHANGE STARTS HERE ---
// Dynamically determine the base path for redirect after logout
// $_SERVER['SCRIPT_NAME'] will be something like "/aaguitarsuite/auth/logout.php"
// We want to redirect to "/aaguitarsuite/"
$basePath = str_replace('/auth/logout.php', '', $_SERVER['SCRIPT_NAME']);
header("Location: " . $basePath . "/");
// --- CHANGE ENDS HERE ---
exit;
?>
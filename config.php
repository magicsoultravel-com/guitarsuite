<?php
// Ensure session is started if not already done by header.php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * Path to your users JSON file.
 */
define('USERS_FILE', __DIR__ . '/../users/users.json');

/**
 * Reads the users data from the JSON file.
 * @return array The associative array of users from the JSON file, or an empty array if file is not found/invalid.
 */
function get_all_users(): array {
    if (!file_exists(USERS_FILE)) {
        return [];
    }
    $json_content = file_get_contents(USERS_FILE);
    if ($json_content === false) {
        error_log("Failed to read users.json");
        return [];
    }
    $users = json_decode($json_content, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("Error decoding users.json: " . json_last_error_msg());
        return [];
    }
    return is_array($users) ? $users : [];
}

/**
 * Fetches user data by email from the JSON file.
 * @param string $email The user's email address.
 * @return array|null User data array if found, null otherwise.
 */
function get_user_by_email(string $email): ?array {
    $users = get_all_users();
    return $users[$email] ?? null;
}

/**
 * Authenticates a user against the stored JSON data.
 * @param string $email The email to authenticate.
 * @param string $password The plain-text password to verify.
 * @return bool True if authentication is successful, false otherwise.
 */
function authenticate_user(string $email, string $password): bool {
    $user = get_user_by_email($email);

    // Verify user exists and password is correct (using password_verify for hashed passwords)
    if ($user && password_verify($password, $user['password'])) {
        return true;
    }
    return false;
}

/**
 * Checks if a user is currently logged in.
 * @return bool True if logged in, false otherwise.
 */
function is_logged_in(): bool {
    // Check if user's email is set in the session.
    // We assume if email is in session, user is logged in.
    return isset($_SESSION['email']);
}

/**
 * Checks if the logged-in user is an administrator.
 * This requires a re-check against the JSON file to ensure the admin status is current.
 * @return bool True if logged in and is admin, false otherwise.
 */
function is_admin(): bool {
    if (!is_logged_in()) {
        return false;
    }

    $email = $_SESSION['email'];
    $user = get_user_by_email($email);

    // If user found and their 'admin' flag is true in the JSON.
    return ($user && ($user['admin'] ?? false));
}

// You might also want functions to add/update/delete users (which would involve writing to JSON)
// but let's focus on getting login and admin checks fixed first.
?>

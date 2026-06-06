<?php
require_once(__DIR__ . '/../inc/auth.php');
require_once(__DIR__ . '/../inc/mailer.php');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = strtolower(trim($_POST['email'] ?? ''));
    $password = $_POST['password'] ?? '';

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        exit('Invalid email.');
    }

    $users = load_users();
    if (isset($users[$email])) {
        exit('User already exists.');
    }

    $users[$email] = [
        'password' => password_hash($password, PASSWORD_DEFAULT),
        'verified' => false
    ];
    save_users($users);

    send_email($email, 'Verify your account', "Thanks for registering. Visit /auth/verify.php?email=$email to verify.");
    echo "Registration successful. Check logs for verification link.";
    exit;
}
?>

<form method="post">
  Email: <input type="email" name="email" required><br>
  Password: <input type="password" name="password" required><br>
  <input type="submit" value="Register">
</form>

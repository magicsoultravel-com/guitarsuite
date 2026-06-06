<?php
// /zdev/minimal/templates/shoutbox-module.php

// Ensure $isLoggedIn and $email are available from the main index.php context.
// These variables will be passed down when index.php includes this template.

// Include the comments data handler you just created.
// We go up one level from /templates/ to /zdev/minimal/, then into /inc/
require_once __DIR__ . '/../inc/comments.php'; 

// Get existing shouts (comments) from the JSON file
$messages = $shoutboxData->getShouts(); 

// --- Handle New Shout (Comment) Submission ---
// Check if the form was submitted via POST and if our specific submit button was pressed
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['submit_shout'])) {
    if ($isLoggedIn) {
        // Get and clean the message from the form
        $userMessage = trim($_POST['shout_message'] ?? ''); 

        // Check if the message is not empty
        if (!empty($userMessage)) {
            // Add the shout using the ShoutboxData class
            $shoutboxData->addShout($email, $userMessage); 
            
            // Redirect to prevent form re-submission on page refresh.
            // We append a hash to jump back to the shoutbox section after refresh.
            header('Location: ' . htmlspecialchars($_SERVER['PHP_SELF']) . '#shoutbox-section');
            exit; // Stop further script execution after redirect
        } else {
            // Display a message if the shout is empty (you can add better styling for this later)
            echo '<p>Message cannot be empty.</p>';
        }
    } else {
        // Display a message if the user is not logged in
        echo '<p>You must be logged in to post a message.</p>';
    }
}
?>

<section class="section shoutbox-section" id="shoutbox-section">
    <h2>shoutout</h2>

    <?php if ($isLoggedIn): ?>
        <form action="<?= htmlspecialchars($_SERVER['PHP_SELF']) ?>" method="post" class="shoutbox-form">
            <textarea name="shout_message" placeholder="Type your message here..." rows="3" maxlength="255"></textarea>
            <br>
            <button type="submit" name="submit_shout">Post Shout</button>
        </form>
    <?php else: ?>
        <p>Please log in to post messages in the shoutbox.</p>
    <?php endif; ?>

    <div class="shouts-display">
        <?php if (!empty($messages)): ?>
            <?php foreach ($messages as $msg): ?>
                <div class="shout-item">
                    <p><strong><?= htmlspecialchars($msg['user_email']) ?>:</strong> <?= htmlspecialchars($msg['message']) ?></p>
                    <small><?= date('Y-m-d H:i', strtotime($msg['created_at'])) ?></small>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <p>No messages yet. Be the first to shout!</p>
        <?php endif; ?>
    </div>
</section>

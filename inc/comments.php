<?php
// /zdev/minimal/inc/comments.php

class ShoutboxData {
    private $jsonFile;

    public function __construct() {
        // Define the path to your JSON data file
        // __DIR__ gives the directory of the current file (/zdev/minimal/inc)
        // We go up one level (../) to get to /zdev/minimal/
        // Then we go into the 'content' directory
        $this->jsonFile = __DIR__ . '/../content/comments-section.json'; // <<-- UPDATED PATH

        // Create the 'content' directory if it doesn't exist.
        // This ensures the directory structure is in place before trying to create the file.
        if (!is_dir(dirname($this->jsonFile))) {
            mkdir(dirname($this->jsonFile), 0755, true);
        }

        // Initialize the JSON file if it doesn't exist or is empty.
        // This ensures json_decode doesn't fail on the first read.
        if (!file_exists($this->jsonFile) || filesize($this->jsonFile) == 0) {
            file_put_contents($this->jsonFile, json_encode([]));
        }
    }

    /**
     * Reads all shout messages from the JSON file.
     * @return array An array of shout messages, sorted by creation date (newest first).
     */
    public function getShouts() {
        // Safely read file content, handle potential errors
        $fileContent = file_get_contents($this->jsonFile);
        if ($fileContent === false) {
            // Log error or handle gracefully, e.g., permissions issue
            return [];
        }

        $data = json_decode($fileContent, true);
        if (!is_array($data)) {
            return []; // Return empty array if JSON is malformed
        }
        
        // Sort by 'created_at' in descending order (newest first)
        usort($data, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });
        
        return $data;
    }

    /**
     * Adds a new shout message to the JSON file.
     * @param string $userEmail The email of the user posting the shout.
     * @param string $message The content of the shout.
     * @return bool True on success, false on failure.
     */
    public function addShout($userEmail, $message) {
        // Basic validation
        if (empty($userEmail) || empty($message)) {
            return false;
        }

        $shouts = $this->getShouts(); // Get existing shouts
        
        // Sanitize message to prevent HTML injection (important!)
        // ENT_QUOTES covers both single and double quotes
        $sanitizedMessage = htmlspecialchars(trim($message), ENT_QUOTES, 'UTF-8');

        $newShout = [
            'id' => uniqid(), // Simple unique ID for JSON entry
            'user_email' => htmlspecialchars($userEmail, ENT_QUOTES, 'UTF-8'), // Sanitize email too, just in case
            'message' => $sanitizedMessage,
            'created_at' => date('Y-m-d H:i:s') // Store current timestamp
        ];

        $shouts[] = $newShout; // Add new shout to the array

        // Limit the number of shouts to prevent the file from growing indefinitely.
        // Example: keep only the latest 50 shouts.
        // This re-sorts and slices, ensuring only the newest are kept.
        if (count($shouts) > 50) {
            usort($shouts, function($a, $b) {
                return strtotime($b['created_at']) - strtotime($a['created_at']);
            });
            $shouts = array_slice($shouts, 0, 50);
        }

        // Save back to JSON file with pretty printing for readability
        // JSON_UNESCAPED_SLASHES prevents forward slashes from being escaped (e.g., in URLs)
        return file_put_contents($this->jsonFile, json_encode($shouts, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }
}

// Instantiate the ShoutboxData class for use throughout your application
$shoutboxData = new ShoutboxData();
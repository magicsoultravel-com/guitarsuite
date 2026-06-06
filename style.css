<?php

// website-content-manager.php

// Define the root directory of your 'zdev/minimal' application
// This script is in /zdev/minimal/admin/, so going up one level gets to /zdev/minimal/
$appRoot = dirname(__DIR__); // This will be something like /var/www/html/zdev/minimal/

// Define the absolute paths to the files you want to read
$indexPath = $appRoot . '/index.php';
$headerPath = $appRoot . '/templates/header.php';
$footerPath = $appRoot . '/templates/footer.php';

// Placeholder for load_content() if it's not globally defined.
// In a real setup, this would be in a shared config or functions file.
if (!function_exists('load_content')) {
    function load_content($section_name) {
        // This path is correct as it's relative to the appRoot, which is defined above
        $content_file_path = dirname(dirname(__FILE__)) . '/content/' . strtolower($section_name) . '.json';
        // Alternative using $appRoot:
        // $content_file_path = $GLOBALS['appRoot'] . '/content/' . strtolower($section_name) . '.json';
        // Or pass $appRoot as an argument to load_content() if it's not global

        if (file_exists($content_file_path)) {
            $json_content = file_get_contents($content_file_path);
            $decoded_content = json_decode($json_content, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded_content)) {
                return $decoded_content;
            }
        }
        return ['title' => 'Content Not Found', 'body' => '']; // Default empty content
    }
}


$indexContent = file_exists($indexPath) ? file_get_contents($indexPath) : '';
$headerContent = file_exists($headerPath) ? file_get_contents($headerPath) : '';
$footerContent = file_exists($footerPath) ? file_get_contents($footerPath) : '';

$message = ''; // For success/error messages
$message_type = ''; // 'success' or 'error' or 'info'

// Define editable content sections (these correspond to JSON file names in /content/)
// This array is now primarily for displaying which sections *could* be editable
// if the functionality were present, but the 'edit' action is removed.
$editable_sections = ['about', 'home', 'contact', 'privacy'];


// --- Handle Form Submission (Saving Content) ---
// THIS BLOCK IS COMPLETELY REMOVED as per your request to remove all edit-related features.
// The POST handling logic is no longer needed if there are no forms to submit.


// Check for messages from a redirect (will only show if a previous action sent a message,
// but this page will no longer generate such redirects related to content saving)
if (isset($_GET['message']) && isset($_GET['type'])) {
    $message = htmlspecialchars($_GET['message']);
    $message_type = htmlspecialchars($_GET['type']);
}


// --- Parse index.php and other files (remains the same as these are for display) ---
// 1. List require_once lines from index.php
$requireLines = [];
preg_match_all('/^\s*require_once\s+__DIR__\s*\.\s*[\'"]\/inc\/([\w-]+\.php)[\'"];/m', $indexContent, $matches);
if (!empty($matches[0])) {
    $requireLines = $matches[0];
}

// 2. List include lines from index.php
$includeLines = [];
preg_match_all('/^\s*include\s+__DIR__\s*\.\s*[\'"]\/templates\/([\w-]+\.php)[\'"];/m', $indexContent, $matches);
if (!empty($matches[0])) {
    $includeLines = $matches[0];
}

// 3. Extract $sections array items dynamically
$sections = [];
if (preg_match("/\\\$sections\s*=\s*\[(.*?)\];/s", $indexContent, $sectionsMatch)) {
    if (isset($sectionsMatch[1])) {
        preg_match_all("/'([^']+)'/", $sectionsMatch[1], $itemMatches);
        $sections = $itemMatches[1] ?? [];
    }
}

// 4. Extract <title> from header.php
$headerTitle = 'Not found';
if (preg_match('/<title>(.*?)<\/title>/s', $headerContent, $matches)) {
    $headerTitle = trim($matches[1]);
}

// 5. Extract <header> tag content from header.php
$headerTagContent = 'Not found';
if (preg_match('/<header[^>]*>(.*?)<\/header>/s', $headerContent, $matches)) {
    $headerTagContent = trim($matches[0]);
}

// 6. Extract &copy; line from footer.php
$copyLine = 'Not found';
if (preg_match('/^.*?(&copy;.*)$/m', $footerContent, $matches)) {
    $copyLine = trim($matches[1]);
}

// 7. Extract the last PHP include from footer.php
$footerLastInclude = 'Not found';
if (preg_match_all('/(require|include)(_once)?\s+__DIR__\s*\.\s*[\'"]\/inc\/([\w-]+\.php)[\'"];/m', $footerContent, $matches)) {
    if (!empty($matches[0])) {
        $footerLastInclude = end($matches[0]);
    }
}

?>
<title>Admin - Website Content Overview</title>

<div class="section">
    <?php if ($message): ?>
        <div class="message <?= htmlspecialchars($message_type) ?>">
            <?= $message ?>
        </div>
    <?php endif; ?>

    <h2>website overview</h2>
    <p>This section provides a read-only overview of your website's core content files and parsed information.</p>

    <table border="1">
        <thead>
            <tr>
                <th>Section</th>
                <th>Contents</th>
                <th>Status</th> </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>require_once lines from index.php</strong></td>
                <td>
                    <?php if (!empty($requireLines)): ?>
                        <ul>
                            <?php foreach ($requireLines as $line): ?>
                                <li><?= htmlspecialchars($line) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php else: ?>
                        No require_once lines found.
                    <?php endif; ?>
                </td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>include lines from index.php</strong></td>
                <td>
                    <?php if (!empty($includeLines)): ?>
                        <ul>
                            <?php foreach ($includeLines as $line): ?>
                                <li><?= htmlspecialchars($line) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php else: ?>
                        No include lines found.
                    <?php endif; ?>
                </td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>Items in $sections array (from index.php)</strong></td>
                <td>
                    <?php if (!empty($sections)): ?>
                        <ul>
                            <?php foreach ($sections as $item): ?>
                                <li><?= htmlspecialchars($item) ?></li>
                            <?php endforeach; ?>
                        </ul>
                    <?php else: ?>
                        No items found in $sections array or array not found.
                    <?php endif; ?>
                </td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>&lt;title&gt; from header.php</strong></td>
                <td><?= htmlspecialchars($headerTitle) ?></td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>&lt;header&gt; tag from header.php</strong></td>
                <td><?= htmlspecialchars($headerTagContent) ?></td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>Line starting with &amp;copy; from footer.php</strong></td>
                <td><?= htmlspecialchars($copyLine) ?></td>
                <td>Read-only</td>
            </tr>
            <tr>
                <td><strong>Last PHP include/require from footer.php</strong></td>
                <td><?= htmlspecialchars($footerLastInclude) ?></td>
                <td>Read-only</td>
            </tr>

            <?php foreach ($sections as $section_name): ?>
                <?php
                // Check if this section is in the $editable_sections list
                // $is_editable is now only for informational display, not for enabling actions
                $is_editable = in_array($section_name, $editable_sections);
                $content = load_content($section_name);
                $contentTitle = htmlspecialchars($content['title'] ?? 'N/A');
                // The body content is displayed as-is (no htmlspecialchars) to show raw HTML from JSON
                $contentBody = $content['body'] ?? 'N/A';
                ?>
                <tr>
                    <td><strong>Content for: "<?= htmlspecialchars(ucfirst($section_name)) ?>"</strong></td>
                    <td>
                        <p><strong>Title:</strong> <?= $contentTitle ?></p>
                        <p><strong>Body:</strong><br><?= $contentBody ?></p>
                        <?php if (empty($content) || !isset($content['title']) || !isset($content['body'])): ?>
                            <p><em>(Error loading content or invalid JSON format for this section.)</em></p>
                        <?php endif; ?>
                    </td>
                    <td>
                        <?php if ($is_editable): ?>
                            Content File (JSON)
                        <?php else: ?>
                            Not directly managed here
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
</div>
<?php
// panel.php - The main administration panel interface.


ob_start();
$basePath = dirname(dirname($_SERVER['SCRIPT_NAME']));

require_once __DIR__ . '/../inc/auth.php';
if (!is_admin()) {
    header('Location: ' . $basePath . '/');
    ob_end_clean();
    exit;
}

$toolsDir = __DIR__;
$tools = []; // Initialize an array to store available tools.

// Scan the current directory for PHP files that act as tools.
foreach (scandir($toolsDir) as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'php' && $file !== 'panel.php') {
        $toolName = pathinfo($file, PATHINFO_FILENAME);
        // Exclude internal PHP files that are not meant to be selectable tools in the menu.
        if (!in_array($toolName, ['auth', 'config', 'api_handler'])) { // Example exclusions
            $tools[$toolName] = $file;
        }
    }
}
ksort($tools); // Sort tools alphabetically for consistent menu display.

$currentTool = $_GET['tool'] ?? null;
if ($currentTool && !isset($tools[$currentTool])) {
    $currentTool = null; // Reset to null if an invalid tool was requested.
}

if ($currentTool && isset($tools[$currentTool])) {
    // Include the tool file. Its AJAX handlers will exit if relevant.
    include __DIR__ . '/' . $tools[$currentTool];
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <title><?= htmlspecialchars(basename(dirname(__DIR__))) ?> Panel</title>
    <link rel="stylesheet" href="<?= htmlspecialchars($basePath) ?>/assets/style.css" />
<style>
    /* Ultra-compact file browser */
.file-browser-table {
    font-size: 12px;
    border-collapse: collapse;
    width: 50vw;
}
 
    .file-browser-table td, .file-browser-table th {
        padding: 2px 4px;
        border: 1px solid #eee;
    }
    .file-actions a {
        margin-left: 2px;
        text-decoration: none;
        font-size: 14px;
    }
    .icon {
        font-size: 14px;
        margin-right: 2px;
    }
    /* Hide 'Type' column on small screens */
    @media (max-width: 768px) {
        .file-browser-table td:nth-child(4),
        .file-browser-table th:nth-child(4) {
            display: none;
        }

/* This targets ALL <th> and <td> elements */
th, td {
    padding: 2px;
    border: 0px solid black;
    text-align: left; /* Example: to center all content */
}

/* This targets ALL <th> elements specifically */
th {
    background-color: lightgray;
    font-weight: normal;
}
}
.folder-row .icon {
    display: inline-block; /* Ensure the icon behaves like a block element */
    transition: transform 0.2s ease-out; /* Smooth rotation */
}

.folder-row.collapsed .icon::before {
    content: '📁'; /* Closed folder icon */
}

.folder-row.expanded .icon::before {
    content: '📂'; /* Open folder icon */
    /* Or you might want to rotate it */
    /* transform: rotate(90deg); */
}
</style>

</head>
<body>
<?php include 'notepad.php'; ?>
<main>
<div class="page-wrapper">
<div class="section">
    <h5><?= htmlspecialchars(basename(dirname(__DIR__))) ?> magic admin</h5>
    <h5>tools</h5>
    <div>
        <?php foreach ($tools as $toolName => $file): ?>
            <button onclick="location.href='?tool=<?= htmlspecialchars($toolName) ?>'" 
                    class="<?= ($currentTool === $toolName) ? 'active-tool' : '' ?>">
                <?= htmlspecialchars(ucfirst(str_replace('-', ' ', $toolName))) ?>
            </button>
        <?php endforeach; ?>
        <button onclick="location.href='<?= htmlspecialchars($basePath) ?>/'">&larr; Return to Site</button>
    </div>
    <!--?php include 'command-runner.php'; ?-->
</div>
</div>
</main>
</body>
</html>
<?php
ob_end_flush();
?>
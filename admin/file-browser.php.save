
<?php
// file-browser.php - This file is designed to be INCLUDED by panel.php
// It should NOT output a full HTML document on its own.

// IMPORTANT: This ob_start() is critical to catch any accidental output
// before our AJAX responses are sent. It MUST be the very first thing
// after the opening PHP tag if this file can be accessed directly for AJAX.
ob_start();

require_once __DIR__ . '/../inc/auth.php';

// --- AJAX Handlers (DOWNLOAD, VIEW, SAVE, DELETE) ---
// These handlers will exit immediately after sending their response,
// preventing the rest of file-browser.php and panel.php from rendering.

if (isset($_GET['download_file'])) {
    if (!is_admin()) { // Keep this server-side check for security
        http_response_code(403);
        echo "Access denied. You must be authenticated to download files.";
        exit;
    }

    $browseRoot = realpath(__DIR__ . '/../');
    $requestedFilePath = $_GET['download_file'];
    $cleanedRelativePath = str_replace('..', '', urldecode($requestedFilePath));
    $fullPath = realpath($browseRoot . '/' . $cleanedRelativePath);

    if ($fullPath && is_file($fullPath) && strpos($fullPath, $browseRoot) === 0) {
        if (ob_get_level()) { ob_end_clean(); } // Clear any output buffer before sending file
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($fullPath) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fullPath));
        readfile($fullPath);
        exit; // <--- Critical: Exit after sending the file for download!
    } else {
        http_response_code(404);
        echo "File not found or access denied.";
        exit;
    }
}

if (isset($_GET['view_content'])) {
    if (!is_admin()) { // Keep this server-side check for security
        http_response_code(403);
        echo "Access denied. Only authenticated users can view file content.";
        exit;
    }

    $browseRoot = realpath(__DIR__ . '/../');
    $requestedFilePath = $_GET['view_content'];
    $cleanedRelativePath = str_replace('..', '', urldecode($requestedFilePath));
    $fullPath = realpath($browseRoot . '/' . $cleanedRelativePath);

    if ($fullPath && is_file($fullPath) && strpos($fullPath, $browseRoot) === 0) {
        $allowedExtensions = ['txt', 'csv', 'json', 'html', 'css', 'js', 'php', 'log', 'md', 'xml'];
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if (in_array($ext, $allowedExtensions)) {
            if (ob_get_level()) {
                ob_end_clean();
            }
            header('Content-Type: text/plain; charset=utf-8');
            readfile($fullPath);
            exit;
        } else {
            http_response_code(415);
            echo "File type not supported for viewing.";
            exit;
        }
    } else {
        http_response_code(404);
        echo "File not found or access denied.";
        exit;
    }
}

// File Save Handler
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_file') {
    if (ob_get_level()) { ob_end_clean(); } // Clear any output buffer before sending JSON

    header('Content-Type: application/json');

    if (!is_admin()) { // Keep this server-side check for security
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied. Privileges required.']);
        exit;
    }

    $browseRoot = realpath(__DIR__ . '/../');
    $filePath = $_POST['path'] ?? '';
    $fileContent = $_POST['content'] ?? '';

    $cleanedRelativePath = str_replace('..', '', urldecode($filePath));
    $fullPath = realpath($browseRoot . '/' . $cleanedRelativePath);

    if ($fullPath && is_file($fullPath) && strpos($fullPath, $browseRoot) === 0) {
        $allowedExtensions = ['txt', 'csv', 'json', 'html', 'css', 'js', 'php', 'log', 'md', 'xml'];
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        if (!in_array($ext, $allowedExtensions)) {
            http_response_code(415);
            echo json_encode(['success' => false, 'message' => 'File type not supported for editing.']);
            exit;
        }

        if (!is_writable($fullPath)) {
            $dir = dirname($fullPath);
            if (!is_writable($dir)) {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Neither file nor parent directory is writable. Check permissions for "' . htmlspecialchars($dir) . '".']);
                exit;
            }
        }

        if (file_put_contents($fullPath, $fileContent) !== false) {
            echo json_encode(['success' => true, 'message' => 'File saved successfully.']);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to write to file. Check file permissions or disk space.']);
            exit;
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found, access denied, or invalid path provided.']);
        exit;
    }
}

// File Delete Handler
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete_file') {
    if (ob_get_level()) { ob_end_clean(); } // Clear any output buffer before sending JSON

    header('Content-Type: application/json');

    if (!is_admin()) { // Keep this server-side check for security
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Access denied. Privileges required to delete files.']);
        exit;
    }

    $browseRoot = realpath(__DIR__ . '/../');
    $filePath = $_POST['path'] ?? '';

    $cleanedRelativePath = str_replace('..', '', urldecode($filePath));
    $fullPath = realpath($browseRoot . '/' . $cleanedRelativePath);

    if ($fullPath && is_file($fullPath) && strpos($fullPath, $browseRoot) === 0) {
        // IMPORTANT SECURITY NOTE:
        // Consider adding more specific checks here if you want to prevent
        // deletion of certain critical files (e.g., this script itself, auth.php).
        // Example:
        // if (basename($fullPath) === 'file-browser.php' || basename($fullPath) === 'panel.php') {
        //     http_response_code(403);
        //     echo json_encode(['success' => false, 'message' => 'Deletion of this core file is not allowed.']);
        //     exit;
        // }

        if (unlink($fullPath)) {
            echo json_encode(['success' => true, 'message' => 'File deleted successfully.']);
            exit;
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to delete file. Check file permissions.']);
            exit;
        }
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'File not found or access denied for deletion.']);
        exit;
    }
}


// If none of the AJAX handlers above exited,
// it means this request is for rendering the file browser interface.
ob_end_clean(); // Clean the buffer if it was started here and not cleaned by an exit.

// --- End AJAX Handlers ---

// If execution reaches here, it means we are rendering the file browser HTML fragment
// (i.e., this file is included by panel.php for display).

$browseRoot = realpath(__DIR__ . '/../');
$basePath = $basePath ?? ''; // $basePath comes from panel.php if passed, otherwise default empty

function human_filesize($bytes, $decimals = 2) {
    $size = ['B', 'KB', 'MB', 'GB'];
    $factor = floor((strlen($bytes) - 1) / 3);
    return sprintf("%.{$decimals}f", $bytes / pow(1024, $factor)) . ' ' . ($size[$factor] ?? 'B');
}

function list_files($dir, $urlBase, $root) {
    $items = [];
    try {
        $it = new DirectoryIterator($dir);
        foreach ($it as $file) {
            if ($file->isDot()) continue;
            $path = $file->getPathname();
            $realPath = realpath($path);
            if (!$realPath || strpos($realPath, $root) !== 0) continue;

            $relativePathForDownload = ltrim(str_replace([$root, '\\'], ['', '/'], $realPath), '/');

            if ($file->isDir()) {
                $items[] = [
                    'type' => 'dir',
                    'name' => $file->getFilename(),
                    'children' => list_files($realPath, $urlBase, $root)
                ];
            } else {
                $items[] = [
                    'type' => 'file',
                    'name' => $file->getFilename(),
                    'size' => $file->getSize(),
                    'modified' => $file->getMTime(),
                    'path' => $urlBase . '/' . ltrim(str_replace([$root, '\\'], ['', '/'], $realPath), '/'),
                    'download_param' => $relativePathForDownload,
                    'ext' => strtolower(pathinfo($file->getFilename(), PATHINFO_EXTENSION))
                ];
            }
        }
    } catch (Exception $e) {
        error_log("Browse error in {$dir}: " . $e->getMessage());
    }

    usort($items, function($a, $b) {
        if ($a['type'] === 'dir' && $b['type'] !== 'dir') return -1;
        if ($a['type'] !== 'dir' && $b['type'] === 'dir') return 1;
        return strcasecmp($a['name'], $b['name']);
    });

    return $items;
}


function render_tree($items) {
    $scriptName = htmlspecialchars($_SERVER['PHP_SELF']);
    $allowedViewEditExtensions = ['txt', 'csv', 'json', 'html', 'css', 'js', 'php', 'log', 'md', 'xml'];

    echo '<table class="file-browser-table">';
    echo '<thead>';
    echo '<tr>';
    echo '<th>Name</th>';
    echo '<th>Size</th>';
    echo '<th>Modified</th>';
    echo '<th>Type</th>';
    echo '<th>Actions</th>';
    echo '</tr>';
    echo '</thead>';
    echo '<tbody>';

    foreach ($items as $item) {
        if ($item['type'] === 'dir') {
            echo '<tr class="folder-row" data-folder="' . htmlspecialchars($item['name']) . '">';
            echo '<td><span class="icon">📁</span> <span class="folder-name">' . htmlspecialchars($item['name']) . '</span></td>';
            echo '<td>-</td>';
            echo '<td>-</td>';
            echo '<td>Folder</td>';
            echo '<td>-</td>';
            echo '</tr>';

            // Render folder contents
            foreach ($item['children'] as $child) {
                echo '<tr class="file-row ' . htmlspecialchars($item['name']) . '-child" style="display: none;">';
                echo '<td><span class="icon">📄</span> ' . htmlspecialchars($child['name']) . '</td>';
                echo '<td>' . human_filesize($child['size']) . '</td>';
                echo '<td>' . date('Y-m-d H:i', $child['modified']) . '</td>';
                echo '<td>' . htmlspecialchars($child['ext'] ?: 'file') . '</td>';
                echo '<td>';
                echo '<a href="' . htmlspecialchars($scriptName . '?tool=file-browser&download_file=' . urlencode($child['download_param'])) . '" title="Download">&#128229;</a>';

                if (in_array($child['ext'], $allowedViewEditExtensions)) {
                    echo '<a href="javascript:void(0);" class="copy-to-clipboard-btn" data-file-path="' . htmlspecialchars(urlencode($child['download_param'])) . '" title="Copy Content">📋</a>';
                }

                if (in_array($child['ext'], $allowedViewEditExtensions)) {
                   echo '<a href="javascript:void(0);" class="copy-with-path-btn" data-file-path="' . htmlspecialchars(urlencode($child['download_param'])) . '" data-display-path="' . htmlspecialchars($child['path']) . '" title="Copy Path + Content">🤖</a>';
                }

                // Edit button check remains with is_admin() because it's a critical action
                if (is_admin() && in_array($child['ext'], $allowedViewEditExtensions)) {
                    echo '<a href="javascript:void(0);" class="edit-file-btn" data-file-path="' . htmlspecialchars(urlencode($child['download_param'])) . '" title="Edit File">✏️</a>';
                }
                // Delete button check remains with is_admin() for security
                if (is_admin()) {
                    echo '<a href="javascript:void(0);" class="delete-file-btn" data-file-path="' . htmlspecialchars(urlencode($child['download_param'])) . '" title="Delete File">🗑️</a>';
                }

                echo '</td>';
                echo '</tr>';
            }
        } else {
            echo '<tr>';
            echo '<td><span class="icon">📄</span> ' . htmlspecialchars($item['name']) . '</td>';
            echo '<td>' . human_filesize($item['size']) . '</td>';
            echo '<td>' . date('Y-m-d H:i', $item['modified']) . '</td>';
            echo '<td>' . htmlspecialchars($item['ext'] ?: 'file') . '</td>';
            echo '<td>';
            echo '<a href="' . htmlspecialchars($scriptName . '?tool=file-browser&download_file=' . urlencode($item['download_param'])) . '" title="Download">&#128229;</a>';

            if (in_array($item['ext'], $allowedViewEditExtensions)) {
                echo '<a href="javascript:void(0);" class="copy-to-clipboard-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" title="Copy Content">📋</a>';
            }

            if (in_array($item['ext'], $allowedViewEditExtensions)) {
               echo '<a href="javascript:void(0);" class="copy-with-path-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" data-display-path="' . htmlspecialchars($item['path']) . '" title="Copy Path + Content">🤖</a>';
            }

            // Edit button check remains with is_admin() because it's a critical action
            if (is_admin() && in_array($item['ext'], $allowedViewEditExtensions)) {
                echo '<a href="javascript:void(0);" class="edit-file-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" title="Edit File">✏️</a>';
            }
            // Delete button check remains with is_admin() for security
            if (is_admin()) {
                echo '<a href="javascript:void(0);" class="delete-file-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" title="Delete File">🗑️</a>';
            }

            echo '</td>';
            echo '</tr>';
        }
    }

    echo '</tbody>';
    echo '</table>';
}

$tree = list_files($browseRoot, $basePath, $browseRoot);
?>
<title><?= htmlspecialchars(basename(dirname(__DIR__))) ?> file browser</title>
<div class="sections-container">
    <div class="section">
        <p>Browse root: <strong><?= htmlspecialchars($basePath) ?></strong></p>

        <?php render_tree($tree); ?>
    </div>
</div>

<div id="fileEditorModal" class="modal-overlay">
    <div class="modal-content">
        <div>
            <h3 id="modalFilePath"></h3>
            <span class="close-button">&times;</span>
        </div>
        <textarea id="fileContentEditor" class="modal-textarea" readonly></textarea>
        <div>
            <button id="selectAllButton" title="Select all text in the editor">Select All</button>
            <button id="clearContentButton" title="Clear all text in the editor">Clear</button>
            <button id="copyEditorContentButton" title="Copy text from the editor to clipboard">Copy</button>
            <button id="pasteIntoEditorButton" title="Paste text from clipboard into the editor">Paste</button>

            <span id="saveFeedback" style="margin-left: 10px; margin-right: 10px; font-size: 0.9em; color: #555;"></span>
            <button id="saveFileButton">Save</button>
            <button id="closeModalButton">Close</button>
        </div>
    </div>
</div>

<script src="file-browser.js"></script>

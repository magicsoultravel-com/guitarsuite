<?php

ob_start();

require_once __DIR__ . '/../inc/auth.php';

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
        if (ob_get_level()) { ob_end_clean(); }
        header('Content-Description: File Transfer');
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . basename($fullPath) . '"');
        header('Expires: 0');
        header('Cache-Control: must-revalidate');
        header('Pragma: public');
        header('Content-Length: ' . filesize($fullPath));
        readfile($fullPath);
        exit;
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


if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'save_file') {
    if (ob_get_level()) { ob_end_clean(); } 

    header('Content-Type: application/json');

    if (!is_admin()) { 
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
    if (ob_get_level()) { ob_end_clean(); } 

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

ob_end_clean(); 



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


function render_tree($items, $level = 0) {
    $scriptName = htmlspecialchars($_SERVER['PHP_SELF']);
    $allowedViewEditExtensions = ['txt', 'csv', 'json', 'html', 'css', 'js', 'php', 'log', 'md', 'xml'];
    $indentation = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;', $level); // 4 non-breaking spaces per level

    if ($level === 0) { // Only echo table tags for the top level
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
    }

    foreach ($items as $item) {
        if ($item['type'] === 'dir') {
            echo '<tr class="folder-row" data-folder="' . htmlspecialchars($item['name']) . '" data-level="' . $level . '">';
            // ONE-LINER CHANGE HERE: Added style="text-align: left;"
            // Also, removed the 📁 emoji from inside the <span class="icon"> as that's now handled by CSS
            echo '<td style="text-align: left;">' . $indentation . '<span class="icon"></span> <span class="folder-name">' . htmlspecialchars($item['name']) . '</span></td>';
            echo '<td>-</td>';
            echo '<td>-</td>';
            echo '<td>Folder</td>';
            echo '<td>-</td>';
            echo '</tr>';

            // RECURSIVE CALL: Render children of the current folder
            if (!empty($item['children'])) {
                render_tree($item['children'], $level + 1);
            }
        } else {
            echo '<tr class="file-row" data-level="' . $level . '">';
            // ONE-LINER CHANGE HERE: Added style="text-align: left;"
            echo '<td style="text-align: left;">' . $indentation . '<span class="icon">📄</span> ' . htmlspecialchars($item['name']) . '</td>';
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

            if (is_admin() && in_array($item['ext'], $allowedViewEditExtensions)) {
                echo '<a href="javascript:void(0);" class="edit-file-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" title="Edit File">✏️</a>';
            }
            if (is_admin()) {
                echo '<a href="javascript:void(0);" class="delete-file-btn" data-file-path="' . htmlspecialchars(urlencode($item['download_param'])) . '" title="Delete File">🗑️</a>';
            }

            echo '</td>';
            echo '</tr>';
        }
    }

    if ($level === 0) { // Only echo closing table tags for the top level
        echo '</tbody>';
        echo '</table>';
    }
}

$tree = list_files($browseRoot, $basePath, $browseRoot);
?>
<title><?= htmlspecialchars(basename(dirname(__DIR__))) ?> file browser</title>
<div class="sections-container">

        <h5>root: <strong><?= htmlspecialchars($basePath) ?></strong></h5>

        <?php render_tree($tree); ?>
    </div>

<div id="fileEditorModal" class="modal-overlay">
    <div class="modal-content">
        
            <h5 id="modalFilePath"></h5>
            <span class="close-button">&times;</span>
        
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

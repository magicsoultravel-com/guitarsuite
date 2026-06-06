<?php
ob_start();

// Include the authentication logic.
require_once __DIR__ . '/../inc/auth.php';

// --- AJAX Command Execution Handler ---
// This block will execute if this file is called via a POST request
// with 'action=run_command' (e.g., from the button click).
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'run_command') {
    // Clear any output buffer before sending the JSON response.
    if (ob_get_level()) { ob_end_clean(); }

    // Set the Content-Type header to application/json.
    header('Content-Type: application/json');

    // Security check: Only allow authenticated administrators to run commands.
    if (!is_admin()) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'Access denied. Administrator privileges required.']);
        exit; // Terminate script execution immediately.
    }

    $output = '';
    $error = '';
    $success = false;

    // --- SECURITY CRITICAL: Hardcoded commands. DO NOT allow user input to modify these commands. ---
    $commands_to_run = [
        'sudo chown -R apache:apache /usr/share/nginx/',
        'sudo chmod 755 -R /usr/share/nginx/html/'
    ];
    
    $all_output_lines = [];
    $has_error_in_output = false; // Flag to check for command execution errors

    foreach ($commands_to_run as $cmd) {
        // Execute command and capture both standard output and standard error (2>&1).
        $full_cmd = $cmd . ' 2>&1';
        exec($full_cmd, $cmd_output, $return_var);
        
        $all_output_lines[] = "--- Output for: '{$cmd}' ---";
        if ($return_var !== 0) {
            $all_output_lines[] = "Command failed to execute (exit status: $return_var).";
            $has_error_in_output = true;
        }
        $all_output_lines = array_merge($all_output_lines, $cmd_output);
    }

    $output = implode("\n", $all_output_lines);
    $success = !$has_error_in_output; // If no errors found, consider it successful

    // Provide a general message based on success/failure
    $message = $success ? 'Commands executed successfully.' : 'Commands executed with potential issues or errors.';

    // Send JSON response back to the client.
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'output' => $output,
        'error' => $has_error_in_output ? $output : '' // If there was an error, put full output in error for client display
    ]);
    exit; // Crucial: Terminate script execution immediately after sending JSON.
}

// --- AJAX Create File Handler ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'create_file') {
    // Clear any output buffer before sending the JSON response.
    if (ob_get_level()) { ob_end_clean(); }

    // Set the Content-Type header to application/json.
    header('Content-Type: application/json');

    // Security check: Only allow authenticated administrators to create files.
    if (!is_admin()) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'Access denied. Administrator privileges required.']);
        exit; // Terminate script execution immediately.
    }

    $rootDir = realpath(__DIR__ . '/../');
    $folder = $_POST['folder'];
    $filename = $_POST['filename'];

    // Validate folder and filename
    if (!is_dir($rootDir . '/' . $folder)) {
        echo json_encode(['success' => false, 'message' => 'Invalid folder']);
        exit;
    }

    if (!preg_match('/^[a-zA-Z0-9._-]+$/', $filename)) {
        echo json_encode(['success' => false, 'message' => 'Invalid filename']);
        exit;
    }

    // Create the file
    $filePath = $rootDir . '/' . $folder . '/' . $filename;
    try {
        touch($filePath);
        echo json_encode(['success' => true, 'message' => 'File created successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error creating file: ' . $e->getMessage()]);
    }
    exit;
}

// --- AJAX Upload File Handler ---
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'upload_file') {
    // Clear any output buffer before sending the JSON response.
    if (ob_get_level()) { ob_end_clean(); }

    // Set the Content-Type header to application/json.
    header('Content-Type: application/json');

    // Security check: Only allow authenticated administrators to upload files.
    if (!is_admin()) {
        http_response_code(403); // Forbidden
        echo json_encode(['success' => false, 'message' => 'Access denied. Administrator privileges required.']);
        exit; // Terminate script execution immediately.
    }

    $rootDir = realpath(__DIR__ . '/../');
    $folder = $_POST['folder'];
    $file = $_FILES['file'];

    // Validate folder
    if (!is_dir($rootDir . '/' . $folder)) {
        echo json_encode(['success' => false, 'message' => 'Invalid folder']);
        exit;
    }

    // Validate file
    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode(['success' => false, 'message' => 'Error uploading file']);
        exit;
    }

    // Upload the file
    $filePath = $rootDir . '/' . $folder . '/' . $file['name'];
    try {
        move_uploaded_file($file['tmp_name'], $filePath);
        echo json_encode(['success' => true, 'message' => 'File uploaded successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Error uploading file: ' . $e->getMessage()]);
    }
    exit;
}

// If execution reaches here, it means this file was included by panel.php for display
// (not an AJAX POST request). So, we clean the buffer and output the HTML fragment.
ob_end_clean();
?>

<div class="sections-container">
    <div class="section">
        <h5>permission fixer</h5>
        <h6>/usr/share/nginx/` and `/usr/share/nginx/html/`.</h6>
        
        <button id="applyNginxPermissionsButton" class="action-button">Apply Nginx Permissions</button>
        
        <div id="permissionsFeedback" style="margin-top: 15px; font-weight: bold;"></div>
        <pre id="permissionsOutput" style="background-color: #f0f0f0; border: 1px solid #ddd;  padding: 10px; margin-top: 10px; font-family: monospace; white-space: pre-wrap; word-wrap: break-word; max-height: 300px; overflow-y: auto;"></pre>
    </div>
    <div class="section">
        <h5>create file</h5>
        <button id="createFileButton" class="action-button">Create File</button>
    </div>
    <div class="section">
        <h5>load file</h5>
        <button id="uploadFileButton" class="action-button">Upload File</button>
    </div>
</div>

<!-- Modal for creating file -->
<div id="createFileModal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);">
    <h5>create file</h5>
    <form id="createFileForm">
        <label for="folder">Folder:</label>
        <select id="folder" name="folder">
            <?php
            $rootDir = realpath(__DIR__ . '/../');
            $folders = scandir($rootDir);
            foreach ($folders as $folder) {
                if (is_dir($rootDir . '/' . $folder) && $folder !== '.' && $folder !== '..') {
                    echo '<option value="' . $folder . '">' . $folder . '</option>';
                }
            }
            ?>
        </select>
        <br>
        <label for="filename">Filename:</label>
        <input type="text" id="filename" name="filename" required>
        <br>
        <button type="submit" class="action-button">Create File</button>
        <button type="button" id="closeModalButton" class="action-button">Close</button>
    </form>
    <div id="createFileFeedback"></div>
</div>

<!-- Modal for uploading file -->
<div id="uploadFileModal" style="display: none; position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);">
    <h5>Upload File</h5>
    <form id="uploadFileForm" enctype="multipart/form-data">
        <label for="folder">Folder:</label>
        <select id="uploadFolder" name="folder">
            <?php
            $rootDir = realpath(__DIR__ . '/../');
            $folders = scandir($rootDir);
            foreach ($folders as $folder) {
                if (is_dir($rootDir . '/' . $folder) && $folder !== '.' && $folder !== '..') {
                    echo '<option value="' . $folder . '">' . $folder . '</option>';
                }
            }
            ?>
        </select>
        <br>
        <label for="file">File:</label>
        <input type="file" id="file" name="file" required>
        <br>
        <button type="submit" class="action-button">Upload File</button>
        <button type="button" id="closeUploadModalButton" class="action-button">Close</button>
    </form>
    <div id="uploadFileFeedback"></div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    // scriptName will be panel.php, as command-runner.php is included within it.
    const scriptName = '<?= htmlspecialchars($_SERVER['PHP_SELF']) ?>';

    // The tool name for the AJAX request should match the filename without .php
    const toolNameForAjax = 'command-runner'; // <--- CHANGE THIS LINE

    // Get references to the HTML elements
    const applyNginxPermissionsButton = document.getElementById('applyNginxPermissionsButton');
    const permissionsFeedback = document.getElementById('permissionsFeedback');
    const permissionsOutput = document.getElementById('permissionsOutput');

    if (applyNginxPermissionsButton) {
        applyNginxPermissionsButton.addEventListener('click', async function() {
            const button = this;
            button.disabled = true; // Disable button during execution

            // Clear previous output and set loading state
            permissionsFeedback.textContent = 'Executing commands...';
            permissionsFeedback.style.color = '#555'; // Grey for info
            permissionsOutput.textContent = ''; // Clear previous command output

            try {
                // Send an AJAX POST request to panel.php, specifying this tool and action
                // Use toolNameForAjax here
                const response = await fetch(`${scriptName}?tool=${toolNameForAjax}`, { // <--- CHANGE THIS LINE
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        action: 'run_command' // The action for our PHP handler
                    })
                });

                // Parse the JSON response from the PHP script
                const result = await response.json();

                if (result.success) {
                    permissionsFeedback.textContent = `Success: ${result.message}`;
                    permissionsFeedback.style.color = '#27ae60'; // Green for success
                    permissionsOutput.textContent = result.output;
                    permissionsOutput.style.color = '#333'; // Standard text color
                } else {
                    permissionsFeedback.textContent = `Error: ${result.message}`;
                    permissionsFeedback.style.color = '#e74c3c'; // Red for error
                    permissionsOutput.textContent = result.error || result.output || 'No specific error output.';
                    permissionsOutput.style.color = '#e74c3c'; // Red for error output
                }
            } catch (error) {
                console.error('Error executing permissions command:', error);
                permissionsFeedback.textContent = `Network Error: ${error.message}`;
                permissionsFeedback.style.color = '#e74c3c';
                permissionsOutput.textContent = 'Failed to connect to server or parse response.';
                permissionsOutput.style.color = '#e74c3c';
            } finally {
                button.disabled = false; // Re-enable the button
                // Optional: Clear feedback after a few seconds if desired, but keeping output is usually better for commands.
                // setTimeout(() => { permissionsFeedback.textContent = ''; }, 5000);
            }
        });
    }

    const createFileButton = document.getElementById('createFileButton');
    const createFileModal = document.getElementById('createFileModal');
   const closeModalButton = createFileModal.querySelector('#closeModalButton');
    const createFileForm = document.getElementById('createFileForm');
    const createFileFeedback = document.getElementById('createFileFeedback');

    createFileButton.addEventListener('click', function() {
        createFileModal.style.display = 'block';
    });

    closeModalButton.addEventListener('click', function() {
        createFileModal.style.display = 'none';
    });

    createFileForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const folder = document.getElementById('folder').value;
        const filename = document.getElementById('filename').value;

        try {
            const response = await fetch(`${scriptName}?tool=${toolNameForAjax}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'create_file',
                    folder: folder,
                    filename: filename
                })
            });

            const result = await response.json();

            if (result.success) {
                createFileFeedback.textContent = `Success: ${result.message}`;
                createFileFeedback.style.color = '#27ae60';
            } else {
                createFileFeedback.textContent = `Error: ${result.message}`;
                createFileFeedback.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error creating file:', error);
            createFileFeedback.textContent = `Network Error: ${error.message}`;
            createFileFeedback.style.color = '#e74c3c';
        }
    });

    const uploadFileButton = document.getElementById('uploadFileButton');
    const uploadFileModal = document.getElementById('uploadFileModal');
   const closeUploadModalButton = uploadFileModal.querySelector('#closeUploadModalButton');
    const uploadFileForm = document.getElementById('uploadFileForm');
    const uploadFileFeedback = document.getElementById('uploadFileFeedback');

    uploadFileButton.addEventListener('click', function() {
        uploadFileModal.style.display = 'block';
    });

    closeUploadModalButton.addEventListener('click', function() {
        uploadFileModal.style.display = 'none';
    });

    uploadFileForm.addEventListener('submit', async function(event) {
        event.preventDefault();
        const folder = document.getElementById('uploadFolder').value;
        const file = document.getElementById('file').files[0];

        const formData = new FormData();
        formData.append('action', 'upload_file');
        formData.append('folder', folder);
        formData.append('file', file);

        try {
            const response = await fetch(`${scriptName}?tool=${toolNameForAjax}`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                uploadFileFeedback.textContent = `Success: ${result.message}`;
                uploadFileFeedback.style.color = '#27ae60';
            } else {
                uploadFileFeedback.textContent = `Error: ${result.message}`;
                uploadFileFeedback.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            uploadFileFeedback.textContent = `Network Error: ${error.message}`;
            uploadFileFeedback.style.color = '#e74c3c';
        }
    });
});
</script>
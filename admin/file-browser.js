document.addEventListener('DOMContentLoaded', function() {

    const scriptName = window.location.pathname;
    const fileBrowserTable = document.querySelector('.file-browser-table');

    // Exit if the file browser table is not present
    if (!fileBrowserTable) {
        console.warn('File browser table not found. Folder toggle functionality will not be active.');
        return;
    }

    // --- Helper Functions for Folder Toggling ---

    /**
     * Hides all descendant rows of a given folder row.
     * It iterates through subsequent sibling rows and hides them if their data-level is greater than the folder's.
     * Also marks any hidden sub-folders as collapsed.
     * @param {HTMLElement} folderRow The <tr> element of the folder to collapse.
     */
    function hideChildren(folderRow) {
        let currentRow = folderRow.nextElementSibling;
        const folderLevel = parseInt(folderRow.dataset.level); // Get the level of the clicked folder

        while (currentRow) {
            // Check if the current row is within the table body, to prevent errors if it goes past the end
            if (!currentRow.closest('.file-browser-table tbody')) {
                break;
            }

            const currentRowLevel = parseInt(currentRow.dataset.level); // Get the level of the current row

            // If the current row is a descendant (higher level) of the folder, hide it
            if (currentRowLevel > folderLevel) {
                currentRow.style.display = 'none';

                // If the hidden row is itself a folder, ensure it's marked as collapsed
                if (currentRow.classList.contains('folder-row')) {
                    currentRow.classList.remove('expanded');
                    currentRow.classList.add('collapsed');
                }
            } else {
                // We've moved past all descendants of the current folder
                break;
            }
            currentRow = currentRow.nextElementSibling;
        }
    }

    /**
     * Shows immediate child rows of a given folder row.
     * It iterates through subsequent sibling rows and shows them if their data-level is exactly one more than the folder's.
     * @param {HTMLElement} folderRow The <tr> element of the folder to expand.
     */
    function showChildren(folderRow) {
        let currentRow = folderRow.nextElementSibling;
        const folderLevel = parseInt(folderRow.dataset.level); // Get the level of the clicked folder

        while (currentRow) {
             // Check if the current row is within the table body
            if (!currentRow.closest('.file-browser-table tbody')) {
                break;
            }

            const currentRowLevel = parseInt(currentRow.dataset.level); // Get the level of the current row

            // If the current row is a direct child (level + 1) of the folder, show it
            if (currentRowLevel === folderLevel + 1) {
                currentRow.style.display = 'table-row'; // Use 'table-row' for table rows

                // If the direct child is a folder, make sure its collapse state is correct.
                // It should be collapsed by default, not expanded automatically.
                if (currentRow.classList.contains('folder-row')) {
                    if (!currentRow.classList.contains('expanded')) {
                        currentRow.classList.add('collapsed');
                        currentRow.classList.remove('expanded');
                    }
                }
            }
            // If the current row is deeper than a direct child, or at the same level as the parent, stop.
            // This prevents showing sub-sub-folders automatically unless their parent is clicked.
            else if (currentRowLevel <= folderLevel) {
                break;
            }
            currentRow = currentRow.nextElementSibling;
        }
    }

    // --- Initial State Setup (Collapse all folders on page load) ---
    document.querySelectorAll('.folder-row').forEach(folderRow => {
        // Mark as collapsed and hide children when the page loads
        folderRow.classList.add('collapsed');
        folderRow.classList.remove('expanded'); // Ensure it's not marked as expanded initially
        hideChildren(folderRow);
    });


    // --- Event Listener for Folder Toggling (delegated) ---
    fileBrowserTable.addEventListener('click', function(event) {
        const target = event.target;
        // Find the closest 'folder-row' ancestor if the click was inside one
        const folderRow = target.closest('.folder-row');

        if (folderRow) {
            // Prevent default behavior if the click was on the folder name/icon link
            event.preventDefault();
            event.stopPropagation(); // Stop propagation to prevent multiple listeners on parent elements

            const isExpanded = folderRow.classList.contains('expanded');

            if (isExpanded) {
                // Collapse the folder
                folderRow.classList.remove('expanded');
                folderRow.classList.add('collapsed');
                hideChildren(folderRow);
            } else {
                // Expand the folder
                folderRow.classList.remove('collapsed');
                folderRow.classList.add('expanded');
                showChildren(folderRow);
            }
        }
    });


    // --- Existing Functionality (Copy, Edit, Delete, Modal) ---

    async function handleCopyToClipboard(button, prependPath = false) {
        const filePath = button.dataset.filePath;
        const displayPath = button.dataset.displayPath;

        if (!filePath) {
            console.error('File path not found for copy action.');
            return;
        }

        const fetchUrl = `${scriptName}?tool=file-browser&view_content=${filePath}`;

        let feedbackSpan = button.nextElementSibling;

        if (!feedbackSpan || (!feedbackSpan.classList.contains('copy-feedback') && !feedbackSpan.classList.contains('delete-feedback'))) {
            feedbackSpan = document.createElement('span');
            feedbackSpan.className = 'copy-feedback';
            button.parentNode.insertBefore(feedbackSpan, button.nextSibling);
            feedbackSpan.style.transition = 'opacity 0.5s ease-out';
            feedbackSpan.style.opacity = '0';
            feedbackSpan.style.marginLeft = '5px';
            feedbackSpan.style.fontSize = '0.8em';
        } else {
            feedbackSpan.className = 'copy-feedback';
            feedbackSpan.style.opacity = '0'; // Reset opacity for new animation
        }

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}. Response: ${errorText.substring(0, 100)}...`);
            }
            const fileContent = await response.text();

            let textToCopy = fileContent;
            if (prependPath && displayPath) {
                textToCopy = `\n\n${decodeURIComponent(displayPath)}\n\n${fileContent}`;
            }

            await navigator.clipboard.writeText(textToCopy);

            feedbackSpan.textContent = 'Copied!';
            feedbackSpan.style.color = '#27ae60';
            feedbackSpan.style.opacity = '1';
            setTimeout(() => {
                feedbackSpan.style.opacity = '0';
                setTimeout(() => feedbackSpan.textContent = '', 500);
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            feedbackSpan.textContent = 'Failed!';
            feedbackSpan.style.color = '#e74c3c';
            feedbackSpan.style.opacity = '1';
            setTimeout(() => {
                feedbackSpan.style.opacity = '0';
                setTimeout(() => feedbackSpan.textContent = '', 500);
            }, 3000);
        }
    }

    // Modal elements
    const fileEditorModal = document.getElementById('fileEditorModal');
    const closeButton = document.querySelector('.close-button');
    const closeModalButton = document.getElementById('closeModalButton');
    const saveFileButton = document.getElementById('saveFileButton');
    const modalFilePathDisplay = document.getElementById('modalFilePath');
    const fileContentEditor = document.getElementById('fileContentEditor');
    const saveFeedback = document.getElementById('saveFeedback');

    // Editor Control Buttons
    const selectAllButton = document.getElementById('selectAllButton');
    const clearContentButton = document.getElementById('clearContentButton');
    const copyEditorContentButton = document.getElementById('copyEditorContentButton');
    const pasteIntoEditorButton = document.getElementById('pasteIntoEditorButton');

    let currentEditingFilePath = null;

    async function openFileEditorModal(filePath) {
        if (!filePath) {
            console.error('File path not provided for editor.');
            return;
        }
        currentEditingFilePath = filePath;

        const fetchUrl = `${scriptName}?tool=file-browser&view_content=${filePath}`;
        modalFilePathDisplay.textContent = `Editing: ${decodeURIComponent(filePath)}`;
        fileContentEditor.value = 'Loading file content...';
        saveFeedback.textContent = '';
        saveFileButton.disabled = true;

        try {
            const response = await fetch(fetchUrl);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}. Message: ${errorText.substring(0, 100)}...`);
            }
            const fileContent = await response.text();
            fileContentEditor.value = fileContent;
            fileContentEditor.removeAttribute('readonly');
            saveFileButton.disabled = false;
        } catch (error) {
            console.error('Error fetching file content:', error);
            fileContentEditor.value = `Failed to load file content: ${error.message}`;
            fileContentEditor.setAttribute('readonly', 'readonly');
            saveFileButton.disabled = true;
            saveFeedback.textContent = 'Error loading file.';
            saveFeedback.style.color = '#e74c3c';
        }

        fileEditorModal.style.display = 'flex';
    }

    function closeFileEditorModal() {
        fileEditorModal.style.display = 'none';
        fileContentEditor.value = '';
        fileContentEditor.setAttribute('readonly', 'readonly');
        currentEditingFilePath = null;
        saveFeedback.textContent = '';
        saveFileButton.disabled = false;
    }

    async function saveFile() {
        if (!currentEditingFilePath) {
            saveFeedback.textContent = 'No file selected for saving.';
            saveFeedback.style.color = '#e74c3c';
            return;
        }

        saveFeedback.textContent = 'Saving...';
        saveFeedback.style.color = '#555';
        saveFileButton.disabled = true;

        const contentToSave = fileContentEditor.value;

        try {
            const response = await fetch(scriptName + '?tool=file-browser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'save_file',
                    path: currentEditingFilePath,
                    content: contentToSave
                })
            });

            const result = await response.json();

            if (result.success) {
                saveFeedback.textContent = 'Saved successfully!';
                saveFeedback.style.color = '#27ae60';
            } else {
                saveFeedback.textContent = `Error: ${result.message}`;
                saveFeedback.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error saving file or parsing response:', error);
            saveFeedback.textContent = `Network Error (check console): ${error.message}`;
            saveFeedback.style.color = '#e74c3c';
        } finally {
            saveFileButton.disabled = false;
            setTimeout(() => {
                saveFeedback.textContent = '';
            }, 3000);
        }
    }

    // Event Listeners for File Browser actions (using event delegation for new/changed elements)
    fileBrowserTable.addEventListener('click', function(event) {
        const target = event.target;

        if (target.closest('.copy-to-clipboard-btn')) {
            handleCopyToClipboard(target.closest('.copy-to-clipboard-btn'), false);
        } else if (target.closest('.copy-with-path-btn')) {
            handleCopyToClipboard(target.closest('.copy-with-path-btn'), true);
        } else if (target.closest('.edit-file-btn')) {
            openFileEditorModal(target.closest('.edit-file-btn').dataset.filePath);
        } else if (target.closest('.delete-file-btn')) {
            const deleteButton = target.closest('.delete-file-btn');
            const filePath = deleteButton.dataset.filePath;
            if (!filePath) {
                console.error('File path not found for delete action.');
                return;
            }

            const confirmDelete = confirm(`Are you sure you want to delete "${decodeURIComponent(filePath)}"? This action cannot be undone.`);
            if (!confirmDelete) {
                return;
            }

            let feedbackSpan = deleteButton.nextElementSibling;
            if (!feedbackSpan || (!feedbackSpan.classList.contains('copy-feedback') && !feedbackSpan.classList.contains('delete-feedback'))) {
                feedbackSpan = document.createElement('span');
                feedbackSpan.className = 'delete-feedback';
                deleteButton.parentNode.insertBefore(feedbackSpan, deleteButton.nextSibling);
                feedbackSpan.style.transition = 'opacity 0.5s ease-out';
                feedbackSpan.style.opacity = '0';
            } else {
                feedbackSpan.className = 'delete-feedback';
                feedbackSpan.style.opacity = '0';
            }
            feedbackSpan.style.marginLeft = '5px';
            feedbackSpan.style.fontSize = '0.8em';
            feedbackSpan.textContent = 'Deleting...';
            feedbackSpan.style.color = '#555';
            feedbackSpan.style.opacity = '1';

            (async () => {
                try {
                    const response = await fetch(scriptName + '?tool=file-browser', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: new URLSearchParams({
                            action: 'delete_file',
                            path: filePath
                        })
                    });

                    const result = await response.json();

                    if (result.success) {
                        feedbackSpan.textContent = 'Deleted!';
                        feedbackSpan.style.color = '#27ae60';
                        const fileRow = deleteButton.closest('tr');
                        if (fileRow) {
                            setTimeout(() => {
                                fileRow.style.opacity = '0';
                                fileRow.style.transition = 'opacity 0.5s ease-out';
                                setTimeout(() => fileRow.remove(), 500);
                            }, 500);
                        }
                    } else {
                        feedbackSpan.textContent = `Error: ${result.message}`;
                        feedbackSpan.style.color = '#e74c3c';
                        console.error('Delete failed:', result.message);
                    }
                } catch (error) {
                    console.error('Error deleting file or parsing response:', error);
                    feedbackSpan.textContent = `Network Error (check console): ${error.message}`;
                    feedbackSpan.style.color = '#e74c3c';
                } finally {
                    setTimeout(() => {
                        if (feedbackSpan) {
                            feedbackSpan.style.opacity = '0';
                            setTimeout(() => feedbackSpan.textContent = '', 500);
                        }
                    }, 3000);
                }
            })();
        }
    });


    // Event Listeners for Modal Control
    if (closeButton) closeButton.addEventListener('click', closeFileEditorModal);
    if (closeModalButton) closeModalButton.addEventListener('click', closeFileEditorModal);
    if (saveFileButton) saveFileButton.addEventListener('click', saveFile);

    // Event Listeners for Editor Control Buttons
    if (selectAllButton) selectAllButton.addEventListener('click', function() {
        fileContentEditor.select();
    });

    if (clearContentButton) clearContentButton.addEventListener('click', function() {
        fileContentEditor.value = '';
    });

    if (copyEditorContentButton) copyEditorContentButton.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(fileContentEditor.value);
            const originalText = this.textContent;
            this.textContent = 'Copied!';
            setTimeout(() => { this.textContent = originalText; }, 1500);
        } catch (err) {
            console.error('Failed to copy content from editor: ', err);
            alert('Failed to copy content from editor. Please use Ctrl+C (Cmd+C on Mac) or right-click > Copy.');
        }
    });

    if (pasteIntoEditorButton) pasteIntoEditorButton.addEventListener('click', async function() {
        try {
            const text = await navigator.clipboard.readText();
            const start = fileContentEditor.selectionStart;
            const end = fileContentEditor.selectionEnd;
            const currentText = fileContentEditor.value;

            fileContentEditor.value = currentText.substring(0, start) + text + currentText.substring(end);

            fileContentEditor.selectionStart = fileContentEditor.selectionEnd = start + text.length;

            fileContentEditor.dispatchEvent(new Event('input', { bubbles: true }));

            const originalText = this.textContent;
            this.textContent = 'Pasted!';
            setTimeout(() => { this.textContent = originalText; }, 1500);

        } catch (err) {
            console.error('Failed to paste content into editor: ', err);
            alert('Failed to paste content. Browser security requires direct user interaction for pasting. Please use Ctrl+V (Cmd+V on Mac) or right-click > Paste.');
        }
    });

    // Modal closing by clicking outside or pressing Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && fileEditorModal && fileEditorModal.style.display === 'flex') {
            closeFileEditorModal();
        }
    });
});
<?php
ob_start();

/**
 * Developer Blogger Module
 * Manages display and administration of development-related blog posts.
 *
 * @author Your Name
 * @version 1.0
 */

// Define the path to the data file relative to the module's location.
$dataFile = __DIR__ . '/../data/developer-blogger.json';

// Check if the data file exists. If not, create it with an empty JSON array.
if (!file_exists($dataFile)) {
    $dataDir = dirname($dataFile);
    if (!is_dir($dataDir)) {
        mkdir($dataDir, 0755, true);
    }
    file_put_contents($dataFile, json_encode([]));
}

// Assume the is_admin() function from inc/auth.php is available.
$isAdmin = function_exists('is_admin') && is_admin();

// Load existing data from the JSON file.
$posts = json_decode(file_get_contents($dataFile), true);

// Handle form submissions for adding/editing/deleting posts.
if ($_SERVER['REQUEST_METHOD'] === 'POST' && $isAdmin) {
    $action = $_POST['action'] ?? '';
    $id = $_POST['id'] ?? null;

    switch ($action) {
        case 'add':
            $newPost = [
                'id'       => bin2hex(random_bytes(8)),
                'date'     => date('Y-m-d H:i:s'),
                'title'    => $_POST['title'] ?? '',
                'content'  => $_POST['content'] ?? '',
            ];
            $posts[] = $newPost;
            break;
        case 'edit':
            if (!empty($id)) {
                foreach ($posts as &$post) {
                    if ($post['id'] === $id) {
                        $post['title']    = $_POST['title'] ?? '';
                        $post['content']  = $_POST['content'] ?? '';
                        if (isset($_POST['date'])) {
                            $post['date'] = date('Y-m-d H:i:s', strtotime($_POST['date']));
                        }
                        break;
                    }
                }
                unset($post);
            }
            break;
        case 'delete':
            $posts = array_filter($posts, fn($post) => $post['id'] !== $id);
            break;
    }
    file_put_contents($dataFile, json_encode(array_values($posts), JSON_PRETTY_PRINT));
}

// Sort posts by date, from newest to oldest.
usort($posts, fn($a, $b) => $b['date'] <=> $a['date']);

?>

<style>
/* Improved Modal Window UI */
.modal-overlay {
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.4);
    justify-content: center;
    align-items: center;
}

.modal-content {
    background-color: #fefefe;
    padding: 20px;
    border: 1px solid #888;
    width: 90%;
    /* Removed max-width to allow unlimited expansion by the user */
    min-width: 300px;
    min-height: 250px;
    box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2),0 6px 20px 0 rgba(0,0,0,0.19);
    position: relative;
    border-radius: 8px;
    resize: both;
    overflow: auto;
}

.modal-content .close {
    color: #aaa;
    position: absolute;
    top: 10px;
    right: 20px;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
}

/* Make the textarea and title input fill the width of the modal content */
.modal-content textarea,
.modal-content input[type="text"],
.modal-content input[type="datetime-local"] {
    width: 100%;
    box-sizing: border-box;
}

/* Fix for show/less functionality using a class */
.post-full,
.expanded .post-summary {
    display: none !important;
}

.expanded .post-full {
    display: block !important;
}

/* CSS for multi-line truncation */
.post-summary {
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 6; /* Limits to exactly 6 lines */
    -webkit-box-orient: vertical;
    white-space: pre-wrap;
}

/* Hide the "Read more..." link by default */
.read-more-toggle {
    display: none;
}
</style>

<?php if ($isAdmin) : ?>
    <button id="add-post-button">Add New Post</button>
<?php endif; ?>

<?php if (empty($posts) && !$isAdmin) : ?>
    <p>No posts to display.</p>
<?php endif; ?>

<?php if ($isAdmin) : ?>
    <div id="admin-modal" class="modal-overlay">
        <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add/Edit Post</h2>
            <form action="<?= htmlspecialchars($_SERVER['PHP_SELF'] . '?' . http_build_query($_GET)) ?>" method="post">
                <input type="hidden" name="action" id="action-input" value="add">
                <input type="hidden" name="id" id="id-input" value="">
                <p><label>Title:<br><input type="text" name="title" id="title-input" required></label></p>
                <p><label>Date:<br><input type="datetime-local" name="date" id="date-input"></label></p>
                <p><label>Content:<br><textarea name="content" id="content-input" rows="10" required></textarea></p>
                <button type="submit">Save Post</button>
                <button type="button" class="cancel-modal">Cancel</button>
            </form>
        </div>
    </div>
<?php endif; ?>

<hr>

<?php if (!empty($posts)) : ?>
    <?php foreach ($posts as $post) : ?>
        <?php
        // Regex to find and replace URLs in the content
        $urlPattern = '/\b(?:https?:\/\/|www\.)\S+\b/';

        // Autolink the content for both summary and full view
        $autolinkedContent = preg_replace_callback($urlPattern, function($matches) {
            $url = $matches[0];
            $displayUrl = htmlspecialchars($url);
            // Add https:// if the link doesn't already have a protocol
            if (strpos($url, 'http') !== 0) {
                $url = 'https://' . $url;
            }
            $safeUrl = htmlspecialchars($url);
            return "<a href=\"{$safeUrl}\" target=\"_blank\" style=\"word-wrap: break-word; overflow-wrap: break-word;\">{$displayUrl}</a>";
        }, $post['content']);
        ?>
        <section class="post-item" data-id="<?= htmlspecialchars($post['id']) ?>" style="position: relative;">
            <p style="position: absolute; top: 25px; right: 25px; margin: 0; font-size: 0.9em;"><small><?= htmlspecialchars($post['date']) ?></small></p>
            <div style="padding-right: 120px;">
                <h2><?= htmlspecialchars($post['title']) ?></h2>
            </div>
            <div class="post-content">
                <div class="post-summary" style="white-space: pre-wrap;"><?= $autolinkedContent ?></div>
                <div class="post-full" style="white-space: pre-wrap;"><?= $autolinkedContent ?></div>
            </div>
            
            <p>
                <a href="#" class="read-more-toggle">Read more...</a>
            </p>
            
            <?php if ($isAdmin) : ?>
                <hr>
                <div>
                    <button class="edit-post-button" data-post='<?= htmlspecialchars(json_encode($post), ENT_QUOTES, 'UTF-8') ?>'>Edit</button>
                    <form action="<?= htmlspecialchars($_SERVER['PHP_SELF'] . '?' . http_build_query($_GET)) ?>" method="post" style="display:inline;">
                        <input type="hidden" name="action" value="delete">
                        <input type="hidden" name="id" value="<?= htmlspecialchars($post['id']) ?>">
                        <button type="submit" onclick="return confirm('Are you sure you want to delete this post?');">Delete</button>
                    </form>
                </div>
            <?php endif; ?>
        </section>
    <?php endforeach; ?>
<?php endif; ?>

<?php if ($isAdmin) : ?>
    <script>
        const adminModal = document.getElementById('admin-modal');
        const contentTextarea = document.getElementById('content-input');
        const titleInput = document.getElementById('title-input');
        const dateInput = document.getElementById('date-input');

        // Function to automatically resize the textarea
        const autoResizeTextarea = (textarea) => {
            textarea.style.height = 'auto';
            textarea.style.height = textarea.scrollHeight + 'px';
        };
        
        // Function to close the modal
        const closeModal = () => {
            adminModal.style.display = 'none';
        };

        // Handlers for showing the modal
        document.getElementById('add-post-button').addEventListener('click', function() {
            document.getElementById('action-input').value = 'add';
            document.getElementById('id-input').value = '';
            titleInput.value = '';
            contentTextarea.value = '';
            
            // Set the date input to the current local date and time.
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            const formattedNow = now.toISOString().slice(0, 16);
            dateInput.value = formattedNow;

            adminModal.style.display = 'flex';
            autoResizeTextarea(contentTextarea);
        });

        document.querySelectorAll('.edit-post-button').forEach(button => {
            button.addEventListener('click', function() {
                const post = JSON.parse(this.dataset.post);

                document.getElementById('action-input').value = 'edit';
                document.getElementById('id-input').value = post.id;
                titleInput.value = post.title;
                contentTextarea.value = post.content;
                
                const postDate = new Date(post.date);
                const pad = (num) => num.toString().padStart(2, '0');
                const formattedDate = `${postDate.getFullYear()}-${pad(postDate.getMonth() + 1)}-${pad(postDate.getDate())}T${pad(postDate.getHours())}:${pad(postDate.getMinutes())}`;
                dateInput.value = formattedDate;

                adminModal.style.display = 'flex';
                // Auto-resize textarea to fit existing content
                autoResizeTextarea(contentTextarea);
            });
        });
        
        // Handlers for closing the modal
        document.querySelectorAll('.close, .cancel-modal').forEach(button => {
            button.addEventListener('click', closeModal);
        });
        
        // Add event listener to the textarea itself for live resizing
        contentTextarea.addEventListener('input', function() {
            autoResizeTextarea(this);
        });
    </script>
<?php endif; ?>

<script>
    // Toggle the read more / show less functionality
    document.querySelectorAll('.read-more-toggle').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.closest('.post-item');

            // Check if this post is already expanded
            const isExpanded = section.classList.contains('expanded');

            // Collapse any other expanded articles
            document.querySelectorAll('.post-item.expanded').forEach(otherPost => {
                if (otherPost !== section) {
                    otherPost.classList.remove('expanded');
                    const otherToggle = otherPost.querySelector('.read-more-toggle');
                    if(otherToggle) {
                        otherToggle.textContent = 'Read more...';
                    }
                }
            });
            
            // Toggle the clicked article
            if (!isExpanded) {
                section.classList.add('expanded');
                this.textContent = 'Show less...';
            } else {
                section.classList.remove('expanded');
                this.textContent = 'Read more...';
            }
        });
    });

    // Check if content is overflowing and show the read more link
    function checkOverflow() {
        document.querySelectorAll('.post-summary').forEach(summaryDiv => {
            const isOverflowing = summaryDiv.scrollHeight > summaryDiv.clientHeight;
            const parentPost = summaryDiv.closest('.post-item');
            const toggleLink = parentPost.querySelector('.read-more-toggle');

            if (isOverflowing) {
                toggleLink.style.display = 'block';
            } else {
                toggleLink.style.display = 'none';
            }
        });
    }

    // Run the check when the page loads
    window.addEventListener('load', checkOverflow);
    // Also run the check if the window is resized, as this can affect overflow
    window.addEventListener('resize', checkOverflow);
</script>
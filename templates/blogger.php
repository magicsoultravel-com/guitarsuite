<?php
// /aaguitarsuite/templates/blogger.php

// Define the path to the blog JSON file
$blog_json_path = __DIR__ . '/../content/blogger.json';
$blog_posts = []; // Initialize an empty array for blog posts

// Attempt to load and decode the blog data
if (file_exists($blog_json_path)) {
    $json_content = file_get_contents($blog_json_path);
    $decoded_data = json_decode($json_content, true);

    // Ensure decoded data is an array before assigning
    if (is_array($decoded_data)) {
        $blog_posts = $decoded_data;
    }
}

// Sort blog posts by published_date, newest first
if (!empty($blog_posts)) {
    usort($blog_posts, function($a, $b) {
        // Ensure both 'published_date' keys exist before comparison
        if (!isset($a['published_date']) || !isset($b['published_date'])) {
            return 0; // Maintain original order if date is missing
        }
        return strtotime($b['published_date']) - strtotime($a['published_date']);
    });
}
?>

<section class="section">
    <h2>blog</h2>
    <?php if (!empty($blog_posts)): ?>
        <?php foreach ($blog_posts as $post): ?>
            <article class="blog-post">
                <h3 class="blog-post-title"><?= htmlspecialchars($post['title'] ?? 'Untitled Post') ?></h3>
                <p class="blog-post-meta">Published on: <time datetime="<?= htmlspecialchars($post['published_date'] ?? '') ?>"><?= htmlspecialchars($post['published_date'] ?? 'Unknown Date') ?></time></p>
                <div class="blog-post-body">
                    <?= $post['body'] ?? 'No content available.' // Assuming body might contain HTML, so not htmlspecialchars ?>
                </div>
            </article>
        <?php endforeach; ?>
    <?php else: ?>
        <p>No blog posts available at the moment. Check back soon!</p>
    <?php endif; ?>
</section>
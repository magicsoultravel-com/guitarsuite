<?php
// /aaguitarsuite/templates/songs-db.php

// Ensure session_start() is at the very top of your main page (e.g., index.php)
// before including any template files.
// For example, in index.php:
// <?php session_start(); require_once 'templates/header.php'; ... require_once 'templates/songs-db.php'; ... require_once 'templates/footer.php'; ? >

// Assume auth.php has been included in the main index.php before this template,
// providing access to is_admin() if needed (though edit functionality is removed).
// require_once __DIR__ . '/../inc/auth.php'; // Keeping this commented, as auth.php should be in index.php

$songs = json_decode(file_get_contents(__DIR__ . '/../assets/songs.json'), true);

// Musical chord root order
$musicalOrder = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];

// Extract root note of chord
function getRoot($chord) {
    // Match chord root (e.g. G#m7b5 → G#)
    if (preg_match('/^[A-G](#|b)?/', $chord, $matches)) {
        return $matches[0];
    }
    return $chord;
}

// Sort function based on musical order
function musicalSort($a, $b) {
    global $musicalOrder;
    $rootA = getRoot($a);
    $rootB = getRoot($b);
    $indexA = array_search($rootA, $musicalOrder);
    $indexB = array_search($rootB, $musicalOrder);
    return $indexA <=> $indexB;
}

// --- Sorting Logic ---
$sortColumn = $_GET['sort'] ?? 'id'; // Default sort by ID
$sortOrder = $_GET['order'] ?? 'asc'; // Default sort ascending

// Define a custom sort function based on the column
usort($songs, function($a, $b) use ($sortColumn, $sortOrder) {
    // Handle null values for title, artist, genre, chords
    $valA = $a[$sortColumn] ?? '';
    $valB = $b[$sortColumn] ?? '';

    // Convert chords to unique count for sorting if necessary
    if ($sortColumn === 'chords_count') {
        $chordsA = preg_split('/\s+/', trim($a['chords'] ?? ''));
        $chordsB = preg_split('/\s+/', trim($b['chords'] ?? ''));
        $valA = count(array_unique($chordsA));
        $valB = count(array_unique($chordsB));
    }

    if ($sortOrder === 'asc') {
        return $valA <=> $valB;
    } else {
        return $valB <=> $valA;
    }
});
// --- End Sorting Logic ---

// ALL EDITING CODE REMOVED
?>

<div class="section" id="songsDbSection">
    <h2>songs db</h2>
    <div style="max-height: 1000px; overflow: visible;">
        <table id="songsTable">
            <thead>
                <tr>
                    <?php
                    $columns = [
                        'id' => 'ID',
                        'title' => 'Title',
                        'artist' => 'Artist',
                        'genre' => 'Genre',
                        'added_date' => 'Added Date',
                        'chords_count' => 'Chords #', // Special case for sorting by count
                        'chords' => 'Chords' // Not directly sortable by string content
                    ];

                    foreach ($columns as $colKey => $colName) {
                        $currentOrder = 'asc';
                        $sortClass = '';
                        if ($sortColumn === $colKey) {
                            $currentOrder = ($sortOrder === 'asc') ? 'desc' : 'asc';
                            $sortClass = $sortOrder;
                        }

                        if ($colKey === 'chords') {
                            echo '<th>' . $colName . '</th>';
                        } else {
                            // Using data attributes for JavaScript to handle sorting
                            echo '<th class="sortable ' . $sortClass . '" data-sort-column="' . $colKey . '" data-current-order="' . $currentOrder . '">';
                            echo $colName;
                            echo '</th>';
                        }
                    }
                    ?>
                </tr>
            </thead>
            <tbody id="songsTableBody">
                <?php foreach ($songs as $index => $song) {
                    if (!isset($song['chords']) || !$song['chords']) continue;

                    $chords = preg_split('/\s+/', trim($song['chords']));
                    $uniqueChordsArr = array_unique($chords);
                    usort($uniqueChordsArr, 'musicalSort'); // sort musically using the local function
                    $uniqueChords = implode(' ', $uniqueChordsArr);
                    $uniqueChordsCount = count($uniqueChordsArr);
                ?>
                <tr>
                    <td><?php echo htmlspecialchars($song['id'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($song['title'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($song['artist'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($song['genre'] ?? ''); ?></td>
                    <td><?php echo htmlspecialchars($song['added_date'] ?? ''); ?></td>
                    <td><?php echo $uniqueChordsCount; ?></td>
                    <td><pre><?php echo htmlspecialchars($uniqueChords); ?></pre></td>
                </tr>
                <?php } ?>
            </tbody>
        </table>
    </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const songsTableBody = document.getElementById('songsTableBody');
    const songsTableHeaders = document.querySelectorAll('#songsTable th.sortable');
    const songsDbSection = document.getElementById('songsDbSection'); // Used for potential error messages

    function fetchSongsTable(sortColumn = 'id', sortOrder = 'asc') {
        // Construct the URL to fetch just the tbody content
        // This is the AJAX endpoint that returns raw HTML for the table body.
        const url = 'inc/ajax/songs-table-content.php?sort=' + sortColumn + '&order=' + sortOrder;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text(); // Get raw HTML text
            })
            .then(html => {
                songsTableBody.innerHTML = html; // Replace tbody content
                updateSortHeaderClasses(sortColumn, sortOrder); // Update header classes
            })
            .catch(error => {
                console.error('Error fetching songs table:', error);
                // Display error message within the section if needed
                // songsDbSection.innerHTML = '<p class="message error">Failed to load songs. Please try again.</p>';
            });
    }

    function updateSortHeaderClasses(newSortColumn, newSortOrder) {
        songsTableHeaders.forEach(th => {
            th.classList.remove('asc', 'desc'); // Remove previous classes
            const thColumn = th.getAttribute('data-sort-column');
            if (thColumn === newSortColumn) {
                th.classList.add(newSortOrder); // Add current sort class
                // Prepare for next click: if current was 'asc', next will be 'desc', otherwise 'asc'
                th.setAttribute('data-current-order', (newSortOrder === 'asc' ? 'desc' : 'asc'));
            } else {
                // If it's a different column, reset its next sort order to 'asc'
                th.setAttribute('data-current-order', 'asc');
            }
        });
    }

    // Attach event listeners to sortable headers
    songsTableHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const sortColumn = this.getAttribute('data-sort-column');
            const sortOrder = this.getAttribute('data-current-order'); // Get the order for the next click

            fetchSongsTable(sortColumn, sortOrder);
        });
    });

    // Note: The initial table content is rendered by PHP directly when songs-db.php is included.
    // If you prefer it to be empty initially and then populated by AJAX, you would remove
    // the PHP foreach loop from the tbody and uncomment the following line:
    // fetchSongsTable();
});
</script>